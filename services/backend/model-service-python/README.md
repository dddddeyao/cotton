# Python 模型服务

生产入口为 `model_service2.py`，提供：

```text
GET  /health
POST /predict
```

`/predict` 接收 multipart 文件字段 `file`，默认返回数值结果和识别图像；可通过 `images=0` 或表单字段 `returnImages=false` 关闭图像返回。

## 运行

```bash
pip install -r requirements.txt
python model_service2.py
```

生产容器使用 Gunicorn：

```bash
gunicorn -w 1 -k gthread -t 180 -b 0.0.0.0:5000 model_service2:app
```

## 必需模型文件

```text
fourtime-best.pth          # 颜色识别，默认输出 11/21/31/41/51/61/71
fenge_best.pth             # 棉花区域分割
impurityarea_best.pth      # 杂质区域分割
```

这些文件不提交到 Git，部署时通过 Docker bind mount 挂载到 `/app`。

兼容说明：如果现有棉花区域分割权重名为等价的 `cottonarea_best.pth`，可重命名为 `fenge_best.pth`，或通过 `COTTON_UNET_WEIGHTS` 配置模型服务直接读取该文件。

可用环境变量覆盖默认文件名或推理参数：

```text
COLOR_MODEL_PATH
COLOR_GRADE_LABELS
COTTON_UNET_WEIGHTS
IMPURITY_UNET_WEIGHTS
COTTON_IMG_SIZE
IMPURITY_IMG_SIZE
COTTON_THRESH
IMPURITY_THRESH
```

## 返回字段

`detectionResult` 包含颜色等级、杂质等级、棉花区域占比、杂质面积、面积比和置信度。图像字段如下：

```text
cottonMaskImage                棉花区域：原图叠加半透明红色掩膜，红色处即棉花
impurityMaskImage              杂质区域：黑底白斑，白色处即识别到的杂质
cottonOverlayImage             棉区叠加（同棉花区域）
impurityOverlayImage           杂质叠加（原图 + 半透明红色）
blackBackgroundImpurityOverlay 黑底保留棉花并标出杂质
```

`cottonMaskImage` 是**原始图片 + 半透明红色掩膜**的合成结果：红色覆盖处即模型识别出的棉花区域，底图仍清晰可见；尺寸、比例、视角、构图与上传的原图完全一致，不裁剪、不重新生成图像、不添加任何标注。

`impurityMaskImage` 是**黑底白斑的二值掩膜**：白色处即模型识别出的杂质区域，边缘按实际轮廓，不是矩形框。

为兼容旧调用，服务仍会返回 `cottonAreaImage` 和 `impurityAreaImage`，新前端和新后端逻辑应优先使用上面的五个字段。
