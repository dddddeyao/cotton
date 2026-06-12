# -*- coding: utf-8 -*-
"""
Flask 图片推理服务（加速优化版，含 ?images=0 / ?fast=1 开关 + 可选表单 returnImages=false）

- ResNet50：输出 colorGrade & impurityGrade（数字类别索引），confidence
- UNet：棉花区域分割，返回 cottonArea（百分比，0~100，保留6位小数）
- OpenCV：在棉花 ROI 内分割杂质（支持 ROI+下采样 加速），返回 impurityArea（像素个数）、areaRatio（杂质/棉花）
- 可选：返回一张叠加图 + 一张二值掩模图（cottonAreaImage=overlay，impurityAreaImage=mask，dataURL）
  · 可通过 query 参数 images=0 关闭（向后兼容）
  · 或通过表单字段 returnImages=false 关闭（推荐；无图开关）
- 可选：快速模式 fast=1（关闭 DoG 闸门/降尺度更 aggressive），进一步提速
"""

from flask import Flask, request, jsonify
# 如需压缩响应体，可启用 gzip（pip install Flask-Compress）：
# from flask_compress import Compress

import io, base64, os, time
import numpy as np
import cv2
from PIL import Image

import torch
import torchvision.transforms as T
from torchvision import models
from torch import nn

# === UNet 实现（确保同目录有 unet.py / unet_parts.py） ===
try:
    from unet import UNet
except Exception:
    # 某些工程结构为包名.unet
    from .unet import UNet  # 根据你的项目结构选择是否保留

app = Flask(__name__)
# Compress(app)  # 可选：启用 gzip

# 让 OpenCV 利用多线程（按 CPU 核数调整）
try:
    cv2.setNumThreads(4)
except Exception:
    pass

# =============================
# 全局推理加速选项
# =============================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
torch.backends.cudnn.benchmark = True  # 针对固定分辨率卷积加速
torch.set_grad_enabled(False)          # 关闭梯度
# 在上下文中使用 torch.inference_mode()（更快 & 更省内存）

# =============================
# 配置（可按需修改）
# =============================
# 分类模型（ResNet50）
CLASS_MODEL_PATH = "cotton-best.pth"
NUM_CLASSES      = 7

# 分割模型（UNet）
UNET_WEIGHTS = "fenge_best.pth"
IMG_SIZE     = 640
THRESH       = 0.5
USE_AMP      = True            # CUDA 下开启 autocast
KEEP_RATIO   = False
BILINEAR_UP  = False

# 杂质分割参数（默认较快）
ROI_MAX_SIDE_FAST   = 1024     # fast=1 时 ROI 下采样最大边
ROI_MAX_SIDE_NORMAL = 1280     # fast=0 时 ROI 下采样最大边
USE_BLOB_GATE_FAST  = False    # fast=1 关闭 DoG 闸门
USE_BLOB_GATE_NORM  = True     # fast=0 开启 DoG 闸门（更稳健，稍慢）
DOG_SIGMAS_FAST     = [1.0, 1.6]             # fast=1 减少尺度
DOG_SIGMAS_NORM     = [0.9, 1.4, 2.0]        # fast=0 适中
TOP_KEEP_PCTS       = [1.0, 2.0]             # 简化回退策略
BORDER_MIN_DIST     = 6
MIN_AREA            = 5
MAX_ASPECT          = 3.0
MIN_CIRC            = 0.30
MIN_SOLIDITY        = 0.80

# =============================
# 常用工具
# =============================
def image_to_dataurl(pil_img: Image.Image, fmt="JPEG", quality=85) -> str:
    """编码为 dataURL；默认 JPEG 更快更小"""
    buf = io.BytesIO()
    if fmt.upper() == "JPEG":
        pil_img.save(buf, format="JPEG", quality=quality, optimize=True)
        mime = "image/jpeg"
    else:
        pil_img.save(buf, format="PNG")
        mime = "image/png"
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:{mime};base64,{b64}"

def mask_to_dataurl(mask_u8: np.ndarray) -> str:
    """
    将二值掩模(0/255 或 0/1)转为 PNG dataURL（灰度）。
    - 输入若为 {0,1}，会自动乘 255。
    - 采用 PNG 保真，避免 JPEG 伪影。
    """
    if mask_u8.dtype != np.uint8:
        mask_u8 = mask_u8.astype(np.uint8)
    if mask_u8.max() == 1:
        mask_u8 = (mask_u8 * 255).astype(np.uint8)
    pil_mask = Image.fromarray(mask_u8, mode="L")
    return image_to_dataurl(pil_mask, fmt="PNG")

def overlay_color(pil_rgb: Image.Image, mask_bin: np.ndarray, color=(255, 0, 0), alpha=0.4):
    """将二值掩膜用指定颜色半透明覆盖到原图"""
    img = np.array(pil_rgb).astype(np.float32)
    if img.ndim == 2:
        img = np.stack([img] * 3, axis=-1)
    overlay = img.copy()
    overlay[mask_bin > 0] = color
    out = (img * (1 - alpha) + overlay * alpha).astype(np.uint8)
    return Image.fromarray(out)

def letterbox(im: Image.Image, new_size: int, color=(0, 0, 0)):
    w, h = im.size
    scale = float(new_size) / max(w, h)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    im_resized = im.resize((new_w, new_h), Image.BILINEAR)
    canvas = Image.new("RGB", (new_size, new_size), color)
    pad_w = (new_size - new_w) // 2
    pad_h = (new_size - new_h) // 2
    canvas.paste(im_resized, (pad_w, pad_h))
    return canvas, (scale, pad_w, pad_h)

def unletterbox_mask(mask_np: np.ndarray, orig_size, params):
    """将方形 mask 反变换回原尺寸（去 padding -> 反缩放）"""
    H, W = orig_size[1], orig_size[0]
    scale, pad_w, pad_h = params
    new_h, new_w = int(round(H * scale)), int(round(W * scale))
    crop = mask_np[pad_h: pad_h + new_h, pad_w: pad_w + new_w]
    pil = Image.fromarray((crop * 255).astype(np.uint8))
    pil = pil.resize((W, H), Image.NEAREST)
    return (np.array(pil) > 127).astype(np.uint8)

def pil_to_tensor_01(img_pil: Image.Image, size: int, keep_ratio: bool):
    """返回 [1,3,H,W] 张量（0-1）和 letterbox 参数（若启用）"""
    if keep_ratio:
        sq, params = letterbox(img_pil, size)
        tensor = T.ToTensor()(sq).unsqueeze(0)
        return tensor, params
    else:
        img_rs = T.Resize((size, size))(img_pil)
        tensor = T.ToTensor()(img_rs).unsqueeze(0)
        return tensor, None

# =============================
# 模型加载（启动时）
# =============================
# 1) 分类模型 ResNet50
if not os.path.exists(CLASS_MODEL_PATH):
    raise FileNotFoundError(f"分类模型文件不存在: {CLASS_MODEL_PATH}")

clf_model = models.resnet50(weights=None)  # 避免 deprecated pretrained 警告
clf_model.fc = nn.Linear(2048, NUM_CLASSES)
clf_state = torch.load(CLASS_MODEL_PATH, map_location="cpu")
clf_model.load_state_dict(clf_state, strict=False)
clf_model.eval().to(DEVICE)

clf_transform = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406],
                std =[0.229, 0.224, 0.225]),
])

# 2) 分割模型 UNet
if not os.path.exists(UNET_WEIGHTS):
    raise FileNotFoundError(f"UNet 权重不存在: {UNET_WEIGHTS}")

seg_model = UNet(n_channels=3, n_classes=1, bilinear=BILINEAR_UP)
seg_state = torch.load(UNET_WEIGHTS, map_location="cpu")
if isinstance(seg_state, dict) and "mask_values" in seg_state:
    seg_state = {k: v for k, v in seg_state.items() if k != "mask_values"}
try:
    seg_model.load_state_dict(seg_state, strict=False)
except Exception:
    seg_model.load_state_dict(seg_state.get("state_dict", seg_state), strict=False)
seg_model.eval().to(DEVICE)

# =============================
# 杂质分割（OpenCV：ROI + 下采样 + 可选 DoG）
# 仅在 ROI 上处理，显著减小复杂度；面积按 scale^2 还原
# =============================
def segment_impurities_roi(img_bgr: np.ndarray,
                           cotton_mask_u8: np.ndarray,
                           fast: bool = False):
    H, W = img_bgr.shape[:2]
    m = cotton_mask_u8 > 0
    ys, xs = np.where(m)
    if len(xs) == 0:
        # 无棉花，直接返回
        clean_full = np.zeros((H, W), dtype=np.uint8)
        ov_full = np.zeros_like(img_bgr)
        return clean_full, ov_full, 0

    # 1) 取棉花 bbox（ROI）
    x0, x1 = xs.min(), xs.max() + 1
    y0, y1 = ys.min(), ys.max() + 1
    roi_bgr  = img_bgr[y0:y1, x0:x1].copy()
    roi_mask = cotton_mask_u8[y0:y1, x0:x1].copy()

    # 2) 下采样（长边限制）
    max_side = ROI_MAX_SIDE_FAST if fast else ROI_MAX_SIDE_NORMAL
    rh, rw = roi_bgr.shape[:2]
    scale = 1.0
    if max(rh, rw) > max_side:
        scale = max_side / float(max(rh, rw))
        roi_bgr  = cv2.resize(roi_bgr, (int(rw*scale), int(rh*scale)), interpolation=cv2.INTER_AREA)
        roi_mask = cv2.resize(roi_mask, (roi_bgr.shape[1], roi_bgr.shape[0]), interpolation=cv2.INTER_NEAREST)

    rm = roi_mask > 0

    # 3) 颜色先验（踢掉“像棉花”的）
    hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV)
    _, Sc, Vc = cv2.split(hsv)
    lab = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2Lab)
    L, a, b = cv2.split(lab)
    chroma = np.sqrt((a.astype(np.float32)-128.0)**2 + (b.astype(np.float32)-128.0)**2)
    HSV_S_MIN, HSV_V_MAX = 60, 150
    LAB_L_MAX, LAB_CHROMA_MIN = 185, 32
    color_gate = (
                         ((Sc >= HSV_S_MIN) & (Vc <= HSV_V_MAX)) |
                         ((L <= LAB_L_MAX) | (chroma >= LAB_CHROMA_MIN))
                 ).astype(np.uint8) * 255
    color_gate[~rm] = 0

    # 4) 灰度 + 自适应阈值 + OPEN
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    gray_m = np.zeros_like(gray); gray_m[rm] = gray[rm]
    blur = cv2.medianBlur(gray_m, 5)
    raw = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV,
        blockSize=25, C=10
    )
    raw[~rm] = 0
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    opened = cv2.morphologyEx(raw, cv2.MORPH_OPEN, kernel, iterations=1)
    opened = cv2.bitwise_and(opened, color_gate)

    # 5) 边界距离抑制（在 ROI 上做）
    dist = cv2.distanceTransform((rm.astype(np.uint8))*255, cv2.DIST_L2, 3)
    border_mask = (dist >= BORDER_MIN_DIST).astype(np.uint8) * 255
    opened = cv2.bitwise_and(opened, border_mask)

    # 6) 可选 DoG gate（fast=1 时默认关闭）
    use_blob_gate = USE_BLOB_GATE_FAST if fast else USE_BLOB_GATE_NORM
    if use_blob_gate:
        def _dog(img_f, s):
            g_small = cv2.GaussianBlur(img_f, (0, 0), sigmaX=s/np.sqrt(2))
            g_large = cv2.GaussianBlur(img_f, (0, 0), sigmaX=s*np.sqrt(2))
            return (g_small - g_large)

        inv = 255 - gray_m
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        inv_eq = clahe.apply(inv)
        invf = inv_eq.astype(np.float32)
        mu, sd = invf[rm].mean(), invf[rm].std() + 1e-6
        invf = (invf - mu) / sd

        sigmas = DOG_SIGMAS_FAST if fast else DOG_SIGMAS_NORM
        resp_max = np.zeros_like(invf, dtype=np.float32)
        for s in sigmas:
            resp_max = np.maximum(resp_max, _dog(invf, s))
        vals = resp_max[rm]
        blob_gate = np.zeros_like(gray_m, dtype=np.uint8)
        for pct in TOP_KEEP_PCTS:
            thr = float(np.percentile(vals, 100.0 - pct))
            cand = (resp_max >= thr).astype(np.uint8) * 255
            cand[~rm] = 0
            cand = cv2.dilate(cand, kernel, iterations=1)
            if (cand.sum() // 255) >= 50:
                blob_gate = cand
                break
        if blob_gate.sum() == 0:
            blob_gate = (rm.astype(np.uint8)) * 255
    else:
        blob_gate = (rm.astype(np.uint8)) * 255

    # 7) 几何过滤 + gate 重叠（在 ROI 上）
    def shape_and_gate_filter(bin_img):
        out = np.zeros_like(bin_img)
        num, labels, stats, _ = cv2.connectedComponentsWithStats(bin_img, connectivity=8)
        for i in range(1, num):
            x, y, w, h, area = stats[i]
            if area < MIN_AREA:
                continue
            if x == 0 or y == 0 or (x + w) >= bin_img.shape[1] or (y + h) >= bin_img.shape[0]:
                continue
            comp = (labels == i).astype(np.uint8) * 255
            inter = cv2.bitwise_and(comp, blob_gate)
            if (inter > 0).sum() / max(1, (comp > 0).sum()) < 0.08:
                continue
            contours, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue
            cnt = max(contours, key=cv2.contourArea)
            A = cv2.contourArea(cnt); P = cv2.arcLength(cnt, True)
            if P == 0:
                continue
            circularity = (4.0 * np.pi * A) / (P * P)
            x0, y0, w0, h0 = cv2.boundingRect(cnt)
            aspect = max(w0, h0) / max(1, min(w0, h0))
            hull = cv2.convexHull(cnt); hull_area = cv2.contourArea(hull)
            solidity = 0.0 if hull_area <= 0 else A / hull_area
            if aspect > MAX_ASPECT or circularity < MIN_CIRC or solidity < MIN_SOLIDITY:
                continue
            out[labels == i] = 255
        return out

    clean_roi = shape_and_gate_filter(opened)

    # 8) 还原到原图尺寸 & 叠加
    # 面积按 scale^2 还原
    impurity_area_roi = int((clean_roi > 0).sum())
    if scale != 1.0:
        impurity_area_full = int(round(impurity_area_roi / (scale * scale)))
    else:
        impurity_area_full = impurity_area_roi

    # 将 ROI clean 放回原图坐标
    clean_full = np.zeros((H, W), dtype=np.uint8)
    if scale != 1.0:
        # 需要把 clean_roi 放大回 ROI 原尺寸
        clean_up = cv2.resize(clean_roi, (rw, rh), interpolation=cv2.INTER_NEAREST)
    else:
        clean_up = clean_roi
    clean_full[y0:y1, x0:x1] = clean_up

    ov_full = img_bgr.copy()
    contours, _ = cv2.findContours(clean_full, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(ov_full, contours, -1, (0, 0, 255), 1)
    ov_full[cotton_mask_u8 == 0] = 0

    return clean_full, ov_full, impurity_area_full

# =============================
# 推理接口
# =============================
@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # 向后兼容的 query 开关（?images=0 关闭返回图）
    include_images_query = request.args.get("images", "1") != "0"
    fast_mode            = request.args.get("fast",   "0") == "1"

    # 推荐的“无图开关”：表单字段 returnImages=false（默认 true）
    # 允许前端控制是否返回图片（默认 true）
    return_images_form = request.form.get("returnImages", "true").lower() == "true"

    # 只有当两者都允许时才返回图像（同时兼容新老开关）
    include_images = include_images_query and return_images_form

    file = request.files["file"]
    try:
        t0 = time.time()

        # 读原图
        img_pil = Image.open(file.stream).convert("RGB")
        orig_w, orig_h = img_pil.size
        orig_area = max(1, orig_w * orig_h)  # 防 0

        # -------- 1) 分类（ResNet50）--------
        with torch.inference_mode():
            inp_clf = clf_transform(img_pil).unsqueeze(0).to(DEVICE)
            with torch.autocast(device_type=("cuda" if DEVICE == "cuda" else "cpu"), enabled=(USE_AMP and DEVICE=="cuda")):
                logits = clf_model(inp_clf)[0]
                probs = torch.softmax(logits, dim=0)
            conf, idx = torch.max(probs, 0)
            grade_num = int(idx.item())        # 数字类别
            confidence = float(conf.item())    # 置信度
        t1 = time.time()

        # -------- 2) 棉花分割（UNet）--------
        with torch.inference_mode():
            inp_seg, lb_params = pil_to_tensor_01(img_pil, IMG_SIZE, KEEP_RATIO)
            inp_seg = inp_seg.to(DEVICE)
            with torch.autocast(device_type=("cuda" if DEVICE == "cuda" else "cpu"), enabled=(USE_AMP and DEVICE=="cuda")):
                logit = seg_model(inp_seg)
                logit = torch.clamp(logit, -30, 30)
                prob = torch.sigmoid(logit)
                pred = (prob > THRESH).float()

        pred_np = pred[0, 0].detach().cpu().numpy()
        if lb_params is not None:
            cotton_mask = unletterbox_mask(pred_np, (orig_w, orig_h), lb_params)  # 0/1
        else:
            pil_rs = T.Resize((orig_h, orig_w), interpolation=T.InterpolationMode.NEAREST)(
                Image.fromarray((pred_np * 255).astype(np.uint8))
            )
            cotton_mask = (np.array(pil_rs) > 127).astype(np.uint8)
        cotton_mask_u8   = (cotton_mask * 255).astype(np.uint8)
        cotton_area_count = int((cotton_mask > 0).sum())   # 棉花像素个数（内部使用）
        cotton_area_pct   = (float(cotton_area_count) / float(orig_area)) * 100.0  # 输出给前端（百分比 0~100）
        t2 = time.time()

        # 叠加图（按开关返回或置空）
        if include_images:
            cotton_overlay = overlay_color(img_pil, cotton_mask, color=(255, 0, 0), alpha=0.4)
            cotton_overlay_url = image_to_dataurl(cotton_overlay, fmt="JPEG", quality=85)
        else:
            cotton_overlay_url = None

        # -------- 3) 杂质分割（ROI + 下采样，加速）--------
        img_bgr = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        impurity_bin, impurity_overlay_bgr, impurity_area_px = segment_impurities_roi(
            img_bgr, cotton_mask_u8, fast=fast_mode
        )

        # 面积比：杂质面积 / 棉花面积（注意：不是相对原图）
        area_ratio = float(impurity_area_px) / max(1, float(cotton_area_count))

        if include_images:
            # 返回黑白掩模（PNG，灰度），非棉花区域为黑
            impurity_mask_url = mask_to_dataurl(impurity_bin)
        else:
            impurity_mask_url = None
        t3 = time.time()

        # -------- 4) 返回结果 --------
        result = {
            "detectionResult": {
                "colorGrade": grade_num,         # = ResNet50 argmax 索引
                "impurityGrade": grade_num,      # 同上（按你的要求）
                "cottonArea": round(cotton_area_pct, 6),   # 棉花占原图百分比（0~100）
                "impurityArea": int(impurity_area_px),     # 杂质像素个数
                "areaRatio": round(area_ratio, 6),         # 杂质面积 / 棉花面积
                "confidence": round(confidence, 4)
            },
            # ===== 向后兼容：供 Spring 旧字段读取 =====
            "label": grade_num,
            "confidence": round(confidence, 4),
            # 可选：返回耗时（便于调试）
            "timing": {
                "classify_sec": round(t1 - t0, 3),
                "unet_sec":     round(t2 - t1, 3),
                "impurity_sec": round(t3 - t2, 3),
                "total_sec":    round(t3 - t0, 3),
                "fast_mode":    bool(fast_mode)
            }
        }

        # 图片（按无图开关/向后兼容开关）
        if include_images:
            result["cottonAreaImage"]   = cotton_overlay_url        # 叠加图（JPEG）
            result["impurityAreaImage"] = impurity_mask_url         # 二值掩模（PNG）
        else:
            result["cottonAreaImage"]   = None
            result["impurityAreaImage"] = None

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "cottonAreaImage": None,
            "impurityAreaImage": None,
            "detectionResult": {
                "colorGrade": -1,
                "impurityGrade": -1,
                "cottonArea": 0.0,   # 异常情况下置 0
                "impurityArea": 0,
                "areaRatio": 0.0,
                "confidence": 0.0
            },
            "label": "Error",
            "confidence": 0.0
        }), 500

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": "ResNet50 + UNet + CV(ROI/downsample)"}), 200

if __name__ == "__main__":
    # 生产建议用 gunicorn 部署，例如：
    # gunicorn -w 2 -k gthread -t 120 -b 0.0.0.0:5000 model_service2:app
    app.run(host="0.0.0.0", port=5000, threaded=True)
