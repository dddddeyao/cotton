# services

本目录用于存放服务端项目。

```text
services/
  backend/                 # Spring Boot API 服务
    model-service-python/  # Flask / PyTorch 模型推理服务
```

Spring Boot 服务负责账号、新闻、识别记录和图片上传接口；Python 模型服务只负责图像推理，由 Spring Boot 通过 HTTP 调用。
