# -*- coding: utf-8 -*-
"""
Flask image inference service.

- Color classifier: ResNet family checkpoint, default fourtime-best.pth.
- Cotton segmentation: UNet, default fenge_best.pth.
- Impurity segmentation: UNet, default impurityarea_best.pth, inferred inside
  the cotton ROI instead of using OpenCV rule segmentation.
- Optional image fields can be disabled with ?images=0 or returnImages=false.
"""

from flask import Flask, request, jsonify

import base64
import io
import os
import re
import time

import cv2
import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image, ImageDraw
from torch import nn
from torchvision import models

try:
    from unet import UNet
except Exception:
    from .unet import UNet

try:
    from scipy import ndimage
    from scipy.ndimage import binary_closing
except Exception:
    ndimage = None
    binary_closing = None

app = Flask(__name__)

try:
    cv2.setNumThreads(4)
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.backends.cudnn.benchmark = True
torch.set_grad_enabled(False)


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return int(value)


def env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return float(value)


MAX_CONTENT_LENGTH = env_int("MAX_CONTENT_LENGTH", 10 * 1024 * 1024)
MAX_IMAGE_PIXELS = env_int("MAX_IMAGE_PIXELS", 25_000_000)
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def resolve_model_path(env_name: str, default_name: str) -> str:
    configured = os.getenv(env_name, default_name).strip()
    if os.path.isabs(configured):
        return configured
    return os.path.join(BASE_DIR, configured)


def parse_int_labels(raw: str) -> list[int]:
    labels = [item.strip() for item in raw.split(",") if item.strip()]
    if not labels:
        raise ValueError("COLOR_GRADE_LABELS cannot be empty")
    return [int(item) for item in labels]


COLOR_MODEL_PATH = resolve_model_path("COLOR_MODEL_PATH", "fourtime-best.pth")
# 颜色分类的几何预处理必须与训练/原作者评估脚本完全一致：
#   原作者脚本 mypredict_cbam.py 用的是 Resize(256) + CenterCrop(224)（ImageNet 标准做法）。
# 早期版本默认写成 320（短边 320 → 中心裁 224，等于比训练时多放大 25%），
# 实测会让作者 75 张标注测试集上的预测一致率从 71/75 掉到 60/75、中位置信度从 0.797 掉到 0.603。
# 详见 docs/handoff.md 第 20 节；如需临时改回，设置环境变量 COLOR_RESIZE_SIZE=320 即可。
COLOR_RESIZE_SIZE = env_int("COLOR_RESIZE_SIZE", 256)
COLOR_IMG_SIZE = env_int("COLOR_IMG_SIZE", 224)
# 颜色等级代码与 App「分类标准」页的颜色等级参数表一致（一级11 ~ 七级71）。
COLOR_GRADE_LABELS = parse_int_labels(os.getenv("COLOR_GRADE_LABELS", "11,21,31,41,51,61,71"))

COTTON_UNET_WEIGHTS = resolve_model_path("COTTON_UNET_WEIGHTS", "fenge_best.pth")
COTTON_IMG_SIZE = env_int("COTTON_IMG_SIZE", 640)
COTTON_THRESH = env_float("COTTON_THRESH", 0.5)
COTTON_KEEP_RATIO = env_bool("COTTON_KEEP_RATIO", True)
COTTON_BILINEAR_UP = env_bool("COTTON_BILINEAR_UP", False)

IMPURITY_UNET_WEIGHTS = resolve_model_path("IMPURITY_UNET_WEIGHTS", "impurityarea_best.pth")
IMPURITY_IMG_SIZE = env_int("IMPURITY_IMG_SIZE", 640)
IMPURITY_THRESH = env_float("IMPURITY_THRESH", 0.5)
IMPURITY_KEEP_RATIO = env_bool("IMPURITY_KEEP_RATIO", True)
IMPURITY_BILINEAR_UP = env_bool("IMPURITY_BILINEAR_UP", False)
IMPURITY_ROI_MARGIN = env_int("IMPURITY_ROI_MARGIN", 5)

USE_AMP = env_bool("USE_AMP", True)
SMOOTH_EDGES = env_bool("SMOOTH_EDGES", True)
SMOOTH_SIGMA = env_float("SMOOTH_SIGMA", 1.0)
SMOOTH_ITERS = env_int("SMOOTH_ITERS", 1)


def image_to_dataurl(pil_img: Image.Image, fmt: str = "JPEG", quality: int = 85) -> str:
    buf = io.BytesIO()
    if fmt.upper() == "JPEG":
        pil_img.save(buf, format="JPEG", quality=quality, optimize=True)
        mime = "image/jpeg"
    else:
        pil_img.save(buf, format="PNG")
        mime = "image/png"
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def mask_to_dataurl(mask_bin: np.ndarray) -> str:
    mask_u8 = mask_bin.astype(np.uint8)
    if mask_u8.size == 0 or mask_u8.max() <= 1:
        mask_u8 = mask_u8 * 255
    pil_mask = Image.fromarray(mask_u8, mode="L")
    return image_to_dataurl(pil_mask, fmt="PNG")


def overlay_color(
    pil_rgb: Image.Image,
    mask_bin: np.ndarray,
    color: tuple[int, int, int] = (255, 0, 0),
    alpha: float = 0.4,
) -> Image.Image:
    img = np.array(pil_rgb).astype(np.float32)
    if img.ndim == 2:
        img = np.stack([img] * 3, axis=-1)
    mask = mask_bin.astype(bool)
    if mask.any():
        color_arr = np.array(color, dtype=np.float32)
        img[mask] = img[mask] * (1.0 - alpha) + color_arr * alpha
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def overlay_black_bg_keep_cotton_with_impurity(
    pil_rgb: Image.Image,
    cotton_mask: np.ndarray,
    impurity_mask: np.ndarray,
    alpha: float = 0.45,
) -> Image.Image:
    img = np.array(pil_rgb).astype(np.float32)
    if img.ndim == 2:
        img = np.stack([img] * 3, axis=-1)

    cotton = cotton_mask.astype(bool)
    impurity = impurity_mask.astype(bool) & cotton
    out = np.zeros_like(img)
    out[cotton] = img[cotton]
    if impurity.any():
        red = np.array((255, 0, 0), dtype=np.float32)
        out[impurity] = out[impurity] * (1.0 - alpha) + red * alpha
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def letterbox(im: Image.Image, new_size: int, color: tuple[int, int, int] = (0, 0, 0)):
    w, h = im.size
    scale = float(new_size) / max(w, h)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    im_resized = im.resize((new_w, new_h), Image.BILINEAR)
    canvas = Image.new("RGB", (new_size, new_size), color)
    pad_w = (new_size - new_w) // 2
    pad_h = (new_size - new_h) // 2
    canvas.paste(im_resized, (pad_w, pad_h))
    return canvas, (scale, pad_w, pad_h)


def unletterbox_mask(mask_np: np.ndarray, orig_size: tuple[int, int], params):
    width, height = orig_size
    scale, pad_w, pad_h = params
    new_w = int(round(width * scale))
    new_h = int(round(height * scale))
    crop = mask_np[pad_h: pad_h + new_h, pad_w: pad_w + new_w]
    pil = Image.fromarray((crop * 255).astype(np.uint8))
    pil = pil.resize((width, height), Image.NEAREST)
    return (np.array(pil) > 127).astype(np.uint8)


def pil_to_tensor_01(img_pil: Image.Image, size: int, keep_ratio: bool):
    if keep_ratio:
        sq, params = letterbox(img_pil, size)
        tensor = T.ToTensor()(sq).unsqueeze(0)
        return tensor, params

    img_rs = T.Resize((size, size))(img_pil)
    tensor = T.ToTensor()(img_rs).unsqueeze(0)
    return tensor, None


def resize_mask_to_original(mask_np: np.ndarray, orig_size: tuple[int, int]) -> np.ndarray:
    width, height = orig_size
    pil = Image.fromarray((mask_np * 255).astype(np.uint8))
    pil = pil.resize((width, height), Image.NEAREST)
    return (np.array(pil) > 127).astype(np.uint8)


def smooth_binary_mask(mask_bin: np.ndarray) -> np.ndarray:
    mask_float = (mask_bin.astype(np.float32) > 0).astype(np.float32)
    if not SMOOTH_EDGES or mask_float.size == 0 or mask_float.max() == 0:
        return mask_float.astype(np.uint8)

    if ndimage is not None and binary_closing is not None:
        smoothed = mask_float
        if SMOOTH_SIGMA > 0:
            smoothed = ndimage.gaussian_filter(smoothed, sigma=SMOOTH_SIGMA)

        mask_u8 = (smoothed > 0.5).astype(np.uint8)
        if SMOOTH_ITERS > 0:
            structure = np.ones((3, 3), dtype=np.uint8)
            mask_u8 = binary_closing(mask_u8, structure=structure, iterations=SMOOTH_ITERS)
        return mask_u8.astype(np.uint8)

    mask_u8 = (mask_float > 0).astype(np.uint8) * 255

    if SMOOTH_SIGMA > 0:
        mask_u8 = cv2.GaussianBlur(mask_u8, (0, 0), sigmaX=SMOOTH_SIGMA)
        mask_u8 = (mask_u8 > 127).astype(np.uint8) * 255

    if SMOOTH_ITERS > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, kernel, iterations=SMOOTH_ITERS)

    return (mask_u8 > 0).astype(np.uint8)

def crop_to_mask_bbox(img_pil: Image.Image, mask_bin: np.ndarray, margin: int):
    ys, xs = np.where(mask_bin > 0)
    if len(xs) == 0:
        return None, None

    width, height = img_pil.size
    x0 = max(0, int(xs.min()) - margin)
    y0 = max(0, int(ys.min()) - margin)
    x1 = min(width, int(xs.max()) + 1 + margin)
    y1 = min(height, int(ys.max()) + 1 + margin)
    if x1 <= x0 or y1 <= y0:
        return None, None

    return img_pil.crop((x0, y0, x1, y1)), (x0, y0, x1, y1)


def paste_mask_to_original(mask_crop: np.ndarray, bbox, original_shape: tuple[int, int]) -> np.ndarray:
    x0, y0, x1, y1 = bbox
    height, width = original_shape
    full = np.zeros((height, width), dtype=np.uint8)
    full[y0:y1, x0:x1] = mask_crop.astype(np.uint8)
    return full


# 杂质（叶屑）等级判定标准：与 App「分类标准」页的叶屑等级参数表逐条对应，
# 数值为“杂质所占的面积/%”上限，第 8 级为级外等级（大于 1.21）。
LEAF_GRADE_MAX_RATIO_PERCENT = (0.12, 0.20, 0.33, 0.50, 0.68, 0.92, 1.21)


def classify_impurity_ratio(ratio_percent: float) -> int:
    """按分类标准的叶屑等级表判定杂质等级。

    表内数值与 App「分类标准」页的叶屑等级参数表（杂质所占的面积/%）完全一致，
    第 8 级为级外等级（大于 1.21）。
    """
    for index, max_ratio_percent in enumerate(LEAF_GRADE_MAX_RATIO_PERCENT):
        if ratio_percent <= max_ratio_percent:
            return index + 1
    return len(LEAF_GRADE_MAX_RATIO_PERCENT) + 1


def strip_known_prefixes(key: str) -> str:
    changed = True
    while changed:
        changed = False
        for prefix in ("module.", "model.", "net."):
            if key.startswith(prefix):
                key = key[len(prefix):]
                changed = True
    return key


def extract_state_dict(checkpoint) -> dict[str, torch.Tensor]:
    if isinstance(checkpoint, dict):
        for key in ("model_state_dict", "state_dict", "model", "net"):
            if key in checkpoint and isinstance(checkpoint[key], dict):
                checkpoint = checkpoint[key]
                break

    if not isinstance(checkpoint, dict):
        raise TypeError("checkpoint is not a state_dict-like object")

    state = {}
    for raw_key, value in checkpoint.items():
        if not torch.is_tensor(value):
            continue
        key = strip_known_prefixes(str(raw_key))
        if key.startswith("mask_values"):
            continue
        state[key] = value

    if "fc.weight" not in state and "classifier.weight" in state:
        state["fc.weight"] = state.pop("classifier.weight")
        if "classifier.bias" in state:
            state["fc.bias"] = state.pop("classifier.bias")

    return state


def infer_resnet_arch(state: dict[str, torch.Tensor]) -> list[str]:
    fc_weight = state.get("fc.weight")
    if fc_weight is None:
        raise KeyError("checkpoint does not contain fc.weight/classifier.weight")

    def layer_block_count(layer_name: str) -> int:
        pattern = re.compile(rf"^{layer_name}\.(\d+)\.")
        max_index = -1
        for key in state:
            match = pattern.match(key)
            if match:
                max_index = max(max_index, int(match.group(1)))
        return max_index + 1

    fc_in = int(fc_weight.shape[1])
    layer3_blocks = layer_block_count("layer3")
    preferred: list[str] = []

    if fc_in == 2048:
        if layer3_blocks >= 36:
            preferred.append("resnet152")
        elif layer3_blocks >= 23:
            preferred.append("resnet101")
        else:
            preferred.append("resnet50")
        preferred.extend(["resnet101", "resnet50", "resnet152"])
    elif fc_in == 512:
        if layer3_blocks >= 6:
            preferred.append("resnet34")
        else:
            preferred.append("resnet18")
        preferred.extend(["resnet34", "resnet18"])
    else:
        preferred.extend(["resnet101", "resnet50"])

    deduped = []
    for name in preferred:
        if name not in deduped:
            deduped.append(name)
    return deduped


def build_resnet_classifier(state: dict[str, torch.Tensor]):
    builders = {
        "resnet18": models.resnet18,
        "resnet34": models.resnet34,
        "resnet50": models.resnet50,
        "resnet101": models.resnet101,
        "resnet152": models.resnet152,
    }
    num_classes = int(state["fc.weight"].shape[0])
    errors = []

    for arch_name in infer_resnet_arch(state):
        model = builders[arch_name](weights=None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        try:
            model.load_state_dict(state, strict=True)
            return model, arch_name, num_classes
        except RuntimeError as exc:
            errors.append(f"{arch_name}: {exc}")

    raise RuntimeError("unable to load color checkpoint as a supported ResNet: " + " | ".join(errors[:2]))


def load_color_model(path: str):
    if not os.path.exists(path):
        raise FileNotFoundError(f"color model file not found: {path}")

    checkpoint = torch.load(path, map_location="cpu")
    state = extract_state_dict(checkpoint)
    model, arch_name, num_classes = build_resnet_classifier(state)

    if len(COLOR_GRADE_LABELS) != num_classes:
        raise ValueError(
            f"COLOR_GRADE_LABELS has {len(COLOR_GRADE_LABELS)} labels, "
            f"but checkpoint has {num_classes} classes"
        )

    model.eval().to(DEVICE)
    return model, arch_name, num_classes


def load_unet_model(path: str, model_name: str, bilinear: bool):
    if not os.path.exists(path):
        raise FileNotFoundError(f"{model_name} UNet weights not found: {path}")

    model = UNet(n_channels=3, n_classes=1, bilinear=bilinear)
    checkpoint = torch.load(path, map_location="cpu")
    state = extract_state_dict(checkpoint)

    try:
        model.load_state_dict(state, strict=True)
    except RuntimeError as strict_error:
        missing, unexpected = model.load_state_dict(state, strict=False)
        if missing:
            raise RuntimeError(
                f"{model_name} UNet checkpoint is missing required keys: {missing[:8]}"
            ) from strict_error
        if unexpected:
            print(f"[WARN] {model_name} UNet ignored unexpected keys: {unexpected[:8]}")

    model.eval().to(DEVICE)
    return model


color_model, COLOR_ARCH_NAME, COLOR_NUM_CLASSES = load_color_model(COLOR_MODEL_PATH)
cotton_model = load_unet_model(COTTON_UNET_WEIGHTS, "cotton", COTTON_BILINEAR_UP)
impurity_model = load_unet_model(IMPURITY_UNET_WEIGHTS, "impurity", IMPURITY_BILINEAR_UP)

color_transform = T.Compose([
    T.Resize(COLOR_RESIZE_SIZE),
    T.CenterCrop(COLOR_IMG_SIZE),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]),
])


def autocast_context():
    return torch.autocast(device_type=DEVICE.type, enabled=(USE_AMP and DEVICE.type == "cuda"))


@torch.inference_mode()
def infer_color_grade(img_pil: Image.Image):
    inp = color_transform(img_pil).unsqueeze(0).to(DEVICE)
    with autocast_context():
        logits = color_model(inp)[0]
        probs = torch.softmax(logits, dim=0)
    conf, idx = torch.max(probs, 0)
    class_index = int(idx.item())
    return int(COLOR_GRADE_LABELS[class_index]), class_index, float(conf.item())


@torch.inference_mode()
def infer_unet_mask(
    img_pil: Image.Image,
    model,
    img_size: int,
    keep_ratio: bool,
    threshold: float,
) -> np.ndarray:
    tensor, lb_params = pil_to_tensor_01(img_pil, img_size, keep_ratio)
    tensor = tensor.to(DEVICE, non_blocking=(DEVICE.type == "cuda"))

    with autocast_context():
        logits = model(tensor)
        logits = torch.clamp(logits, -30, 30)
        probs = torch.sigmoid(logits)
        pred = (probs > threshold).float()

    pred_np = pred[0, 0].detach().cpu().numpy()
    if lb_params is not None:
        return unletterbox_mask(pred_np, img_pil.size, lb_params)
    return resize_mask_to_original(pred_np, img_pil.size)


def infer_impurity_in_cotton(img_pil: Image.Image, cotton_mask: np.ndarray) -> np.ndarray:
    crop, bbox = crop_to_mask_bbox(img_pil, cotton_mask, IMPURITY_ROI_MARGIN)
    if crop is None or bbox is None:
        return np.zeros_like(cotton_mask, dtype=np.uint8)

    impurity_crop = infer_unet_mask(
        crop,
        impurity_model,
        IMPURITY_IMG_SIZE,
        IMPURITY_KEEP_RATIO,
        IMPURITY_THRESH,
    )
    impurity_crop = smooth_binary_mask(impurity_crop)
    impurity_full = paste_mask_to_original(impurity_crop, bbox, cotton_mask.shape)
    impurity_full = ((impurity_full > 0) & (cotton_mask > 0)).astype(np.uint8)
    return impurity_full


def build_color_feedback_image(img_pil: Image.Image, color_grade: int, confidence: float) -> Image.Image:
    img = img_pil.copy()
    draw = ImageDraw.Draw(img, "RGBA")
    width, _height = img.size
    text = f"Color grade: {color_grade}    Confidence: {confidence * 100:.1f}%"
    pad_x = max(12, int(width * 0.015))
    pad_y = pad_x
    box_height = max(44, int(width * 0.055))
    draw.rectangle((pad_x, pad_y, width - pad_x, pad_y + box_height), fill=(255, 255, 255, 210))
    draw.text((pad_x + 12, pad_y + 12), text, fill=(220, 0, 0, 255))
    return img


def build_image_payload(
    img_pil: Image.Image,
    cotton_mask: np.ndarray,
    impurity_mask: np.ndarray,
    color_grade: int,
    confidence: float,
):
    color_feedback_url = image_to_dataurl(
        build_color_feedback_image(img_pil, color_grade, confidence),
        fmt="JPEG",
        quality=85,
    )
    # 棉花区域：原始图片上叠加一层半透明红色掩膜。
    # 有红色的地方即棉花区域，且仍能看清下面的原始图片；不裁剪、不重新生成。
    cotton_overlay_url = image_to_dataurl(
        overlay_color(img_pil, cotton_mask, color=(255, 0, 0), alpha=0.4),
        fmt="JPEG",
        quality=88,
    )
    # 杂质区域：黑色背景，白色区域为识别到的杂质。
    impurity_mask_url = mask_to_dataurl(impurity_mask)
    impurity_overlay_url = image_to_dataurl(
        overlay_color(img_pil, impurity_mask, color=(255, 0, 0), alpha=0.45),
        fmt="JPEG",
        quality=85,
    )
    black_bg_url = image_to_dataurl(
        overlay_black_bg_keep_cotton_with_impurity(img_pil, cotton_mask, impurity_mask, alpha=0.45),
        fmt="JPEG",
        quality=85,
    )

    return {
        "colorFeedbackImage": color_feedback_url,
        # 棉花区域：原图 + 半透明红色掩膜
        "cottonMaskImage": cotton_overlay_url,
        # 杂质区域：黑底白斑，白色为杂质
        "impurityMaskImage": impurity_mask_url,
        "cottonOverlayImage": cotton_overlay_url,
        "impurityOverlayImage": impurity_overlay_url,
        "blackBackgroundImpurityOverlay": black_bg_url,
        "cottonAreaImage": cotton_overlay_url,
        "impurityAreaImage": impurity_mask_url,
    }

def empty_image_payload():
    return {
        "colorFeedbackImage": None,
        "cottonMaskImage": None,
        "impurityMaskImage": None,
        "cottonOverlayImage": None,
        "impurityOverlayImage": None,
        "blackBackgroundImpurityOverlay": None,
        "cottonAreaImage": None,
        "impurityAreaImage": None,
    }


def request_too_large_response():
    result = {
        "error": "图片文件过大",
        "grade": "",
        "conclusion": "图片文件过大，未进行模型识别",
        "detectionResult": {
            "colorGrade": -1,
            "impurityGrade": -1,
            "cottonArea": 0.0,
            "impurityArea": 0,
            "areaRatio": 0.0,
            "confidence": 0.0,
        },
        "label": "Error",
        "confidence": 0.0,
    }
    result.update(empty_image_payload())
    return result


@app.errorhandler(413)
def request_entity_too_large(_exc):
    return jsonify(request_too_large_response()), 413


@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    include_images_query = request.args.get("images", "1") != "0"
    return_images_form = request.form.get("returnImages", "true").lower() == "true"
    include_images = include_images_query and return_images_form
    fast_mode = request.args.get("fast", "0") == "1"

    file = request.files["file"]
    try:
        t0 = time.time()

        source_img = Image.open(file.stream)
        if source_img.format not in ALLOWED_IMAGE_FORMATS:
            raise ValueError("unsupported image format")

        orig_w, orig_h = source_img.size
        if orig_w * orig_h > MAX_IMAGE_PIXELS:
            raise ValueError("image dimensions are too large")

        img_pil = source_img.convert("RGB")
        orig_area = max(1, orig_w * orig_h)

        color_grade, color_index, confidence = infer_color_grade(img_pil)
        t1 = time.time()

        cotton_mask = infer_unet_mask(
            img_pil,
            cotton_model,
            COTTON_IMG_SIZE,
            COTTON_KEEP_RATIO,
            COTTON_THRESH,
        )
        cotton_mask = smooth_binary_mask(cotton_mask)
        cotton_area_count = int((cotton_mask > 0).sum())
        cotton_area_pct = (float(cotton_area_count) / float(orig_area)) * 100.0
        t2 = time.time()

        impurity_mask = infer_impurity_in_cotton(img_pil, cotton_mask)
        impurity_area_px = int((impurity_mask > 0).sum())
        area_ratio = float(impurity_area_px) / max(1.0, float(cotton_area_count))
        ratio_percent = area_ratio * 100.0
        impurity_grade = classify_impurity_ratio(ratio_percent)
        t3 = time.time()

        grade_text = f"{color_grade} / {impurity_grade}"
        conclusion = (
            f"颜色等级 {color_grade}，杂质等级 {impurity_grade}，"
            f"杂质面积比 {ratio_percent:.4f}%。"
        )

        result = {
            "grade": grade_text,
            "conclusion": conclusion,
            "detectionResult": {
                "colorGrade": color_grade,
                "impurityGrade": impurity_grade,
                "cottonArea": round(cotton_area_pct, 6),
                "impurityArea": impurity_area_px,
                "areaRatio": round(area_ratio, 6),
                "confidence": round(confidence, 4),
            },
            "label": str(color_grade),
            "confidence": round(confidence, 4),
            "metrics": [
                {"label": "颜色等级", "value": str(color_grade), "hint": "colorGrade"},
                {"label": "杂质等级", "value": str(impurity_grade), "hint": "impurityGrade"},
                {"label": "棉花区域占比", "value": f"{cotton_area_pct:.4f}%", "hint": "cottonArea"},
                {"label": "杂质面积", "value": f"{impurity_area_px} px", "hint": "impurityArea"},
                {"label": "杂质面积比", "value": f"{ratio_percent:.4f}%", "hint": "areaRatio"},
                {"label": "模型置信度", "value": f"{confidence * 100:.2f}%", "hint": "confidence"},
            ],
            "timing": {
                "classify_sec": round(t1 - t0, 3),
                "cotton_unet_sec": round(t2 - t1, 3),
                "impurity_unet_sec": round(t3 - t2, 3),
                "total_sec": round(t3 - t0, 3),
                "fast_mode": bool(fast_mode),
            },
            "modelInfo": {
                "colorModel": os.path.basename(COLOR_MODEL_PATH),
                "colorArch": COLOR_ARCH_NAME,
                "cottonModel": os.path.basename(COTTON_UNET_WEIGHTS),
                "impurityModel": os.path.basename(IMPURITY_UNET_WEIGHTS),
                "cottonKeepRatio": COTTON_KEEP_RATIO,
                "impurityKeepRatio": IMPURITY_KEEP_RATIO,
                "cottonThreshold": COTTON_THRESH,
                "impurityThreshold": IMPURITY_THRESH,
            },
        }

        result.update(
            build_image_payload(img_pil, cotton_mask, impurity_mask, color_grade, confidence)
            if include_images
            else empty_image_payload()
        )
        return jsonify(result), 200

    except Exception as exc:
        print(f"[ERROR] predict failed: {exc}")
        result = {
            "error": "模型推理失败，请检查图片后重试",
            "grade": "",
            "conclusion": "模型推理失败，未生成有效识别结果",
            "detectionResult": {
                "colorGrade": -1,
                "impurityGrade": -1,
                "cottonArea": 0.0,
                "impurityArea": 0,
                "areaRatio": 0.0,
                "confidence": 0.0,
            },
            "label": "Error",
            "confidence": 0.0,
        }
        result.update(empty_image_payload())
        return jsonify(result), 500

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "model": "ResNet color + UNet cotton + UNet impurity",
        "colorModel": os.path.basename(COLOR_MODEL_PATH),
        "colorArch": COLOR_ARCH_NAME,
        "cottonModel": os.path.basename(COTTON_UNET_WEIGHTS),
        "impurityModel": os.path.basename(IMPURITY_UNET_WEIGHTS),
        "device": DEVICE.type,
    }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
