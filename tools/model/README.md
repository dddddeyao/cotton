# tools/model —— 模型侧核对脚本

只放**只读、可复现**的模型核对脚本，不参与线上推理，也不改动任何权重。

## verify_color_pipeline.py

核对**颜色级分类的几何预处理**是否与模型作者脚本一致。作者脚本 `mypredict_cbam.py` 用的是
`Resize(256) + CenterCrop(224) + ImageNet 归一化`；线上服务（`services/backend/model-service-python/model_service2.py`）
原先默认 `Resize(320)`，属于训练/推理不一致，2026-09-20 已修正为 256。

```powershell
# 仓库根目录执行
D:\aconda\envs\YOLO\python.exe tools\model\verify_color_pipeline.py `
  --weights services\backend\model-service-python\fourtime-best.pth `
  --images "<预测可视化目录：文件名形如 IMG_20250801_102458_21.jpg，尾部数字＝作者当时的预测级>" `
  --sizes 256,320
```

输出：每个短边设置下的「与文件名标签一致张数 / 中位置信度 / 平均置信度 / ≥90% 张数」。

2026-09-20 实测（作者 75 张标注测试集，同一版权重）：

| Resize 短边 | 与标签一致 | 中位置信度 | 平均置信度 | ≥90% |
|---|---|---|---|---|
| **256**（作者脚本 ＝ 修复后线上） | **71/75** | **0.797**（线上模块含 AMP 为 0.801） | 0.696 | **19/75** |
| 320（修复前线上） | 60/75 | 0.603 | 0.633 | 9/75 |

> 标注图是作者那次运行的输出，已经被叠加红字并二次 JPEG 压缩，所以一致率不可能到 100%，接近 95% 即认定同一管线。
> 背景、根因与「>99% 置信度为什么不现实」见 `docs/handoff.md` 第 20 节。
