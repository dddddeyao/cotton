#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""颜色级预处理一致性核对（只读，不依赖线上服务）。

用途：用同一份权重 + 一批「文件名尾部带预测级」的标注图，比较不同 Resize 短边设置下的
预测与置信度，用来确认线上预处理是否与模型作者脚本（`mypredict_cbam.py`：
Resize(256) + CenterCrop(224)）一致。

用法：
    python tools/model/verify_color_pipeline.py \
        --weights services/backend/model-service-python/fourtime-best.pth \
        --images "<预测可视化目录，文件名形如 IMG_xxx_21.jpg>" \
        --sizes 256,320

说明：标注图是作者那次运行的输出（文件名尾部的数字＝当时的预测级），
      这些图被叠加了红字并重新 JPEG 压缩，所以「一致率」不会到 100%，接近 95% 即认定同一管线。
结论与背景见 docs/handoff.md 第 20 节。
"""
import argparse
import os
import sys

import torch
import torch.nn as nn
import torchvision.transforms as T
from PIL import Image
from torchvision import models

LABELS = [11, 21, 31, 41, 51, 61, 71]
NORM = T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])


def build_model(weights_path, num_classes=7):
    raw = torch.load(weights_path, map_location="cpu")
    if isinstance(raw, dict) and "state_dict" in raw:
        raw = raw["state_dict"]
    elif isinstance(raw, dict) and "model_state" in raw:
        raw = raw["model_state"]
    state = {k.replace("module.", ""): v for k, v in raw.items() if torch.is_tensor(v)}
    model = models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    model.load_state_dict(state, strict=True)
    return model.eval()


def make_transform(short_side, crop):
    return T.Compose([T.Resize(short_side), T.CenterCrop(crop), T.ToTensor(), NORM])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", required=True, help="颜色级权重 .pth（fourtime-best.pth）")
    ap.add_argument("--images", required=True, help="标注图目录（文件名末尾 _<预测级>）")
    ap.add_argument("--sizes", default="256,320", help="要对比的 Resize 短边，逗号分隔")
    ap.add_argument("--crop", type=int, default=224, help="CenterCrop 边长，默认 224")
    ap.add_argument("--limit", type=int, default=0, help="只跑前 N 张（调试用）")
    args = ap.parse_args()

    files = sorted(
        f for f in os.listdir(args.images)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp"))
    )
    if args.limit:
        files = files[: args.limit]
    if not files:
        sys.exit(f"没有找到图片: {args.images}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(args.weights).to(device)
    print(f"权重   : {args.weights}")
    print(f"图片   : {len(files)} 张（{args.images}）")
    print(f"设备   : {device} | CenterCrop={args.crop}")
    print(f"{'短边':>6}{'与标签一致':>12}{'中位置信度':>12}{'平均置信度':>12}{'>=90%':>10}")

    for size in [int(s) for s in args.sizes.split(",")]:
        transform = make_transform(size, args.crop)
        same, confs = 0, []
        for name in files:
            ref = int(os.path.splitext(name)[0].split("_")[-1])
            pil = Image.open(os.path.join(args.images, name)).convert("RGB")
            tensor = transform(pil).unsqueeze(0).to(device)
            with torch.inference_mode():
                probs = torch.softmax(model(tensor)[0].float(), dim=0).cpu()
            idx = int(probs.argmax())
            confs.append(float(probs[idx]))
            same += int(LABELS[idx] == ref)
        confs.sort()
        mid = confs[len(confs) // 2]
        hi = sum(1 for c in confs if c >= 0.9)
        print(
            f"{size:>6}{f'{same}/{len(files)}':>12}{mid:>12.3f}"
            f"{sum(confs) / len(confs):>12.3f}{f'{hi}/{len(files)}':>10}"
        )


if __name__ == "__main__":
    main()
