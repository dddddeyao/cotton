# Python 模型服务

生产入口为 `model_service2.py`，提供：

```text
GET  /health
POST /predict
```

`/predict` 接收 multipart 文件字段 `file`，可通过 `images=0` 关闭返回叠加图。

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
cotton-best.pth
fenge_best.pth
```

这两个文件不提交到 Git，部署时通过 Docker bind mount 挂载到 `/app`。

## 其他脚本

`model_service.py`、`ping.py`、`compare_your_vs_web.py`、`plot_arlitenet_loss.py`、`chongzi.py` 为历史实验或调试脚本，不作为生产入口。
