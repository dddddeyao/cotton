# 开发说明

## 工程位置

```text
apps/android                 # Android App
services/backend             # Spring Boot 后端
services/backend/model-service-python # Python 模型服务
```

## Android 前端

技术栈：

```text
Expo SDK 56
React Native
TypeScript
expo-image-picker
@react-native-async-storage/async-storage
```

运行命令：

```bash
cd apps/android
npm install
npm run start
```

接口配置：

```bash
copy .env.example .env.local
```

核心变量：

```text
EXPO_PUBLIC_API_BASE_URL=http://your-domain-or-ip:8080
```

`EXPO_PUBLIC_API_BASE_URL` 必须配置真实后端地址。真机调试时不要使用 `localhost` 作为后端地址，应使用局域网 IP、服务器 IP 或域名。


## 后端服务

运行命令：

```bash
cd services/backend
.\mvnw.cmd spring-boot:run
```

主要环境变量：

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
JWT_SECRET
PYTHON_SERVICE_URL
PYTHON_SERVICE_CONNECT_TIMEOUT_MS
PYTHON_SERVICE_READ_TIMEOUT_MS
APP_UPLOAD_DIR
APP_CORS_ALLOWED_ORIGINS
APP_CORS_ALLOW_CREDENTIALS
```

本地运行后端前需要设置 `JWT_SECRET`，它必须是 Base64 编码且解码后至少 32 字节；可用 `openssl rand -base64 32` 或 PowerShell 的 `[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))` 生成。识别上传图片默认保存到后端工作目录的 `uploads/`，可通过 `APP_UPLOAD_DIR` 调整。接口返回的图片路径形如 `/uploads/{filename}`。

## Python 模型服务

运行命令：

```bash
cd services/backend/model-service-python
pip install -r requirements.txt
python model_service2.py
```

模型服务依赖本地模型权重：

```text
fourtime-best.pth          # 颜色识别，默认输出 11/21/31/41/51/61/71
fenge_best.pth             # 棉花区域分割；与 cottonarea_best.pth 等价时可使用等价文件
impurityarea_best.pth      # 杂质区域分割
```

这些权重文件较大，不建议提交到 Git。

`/predict` 的图像返回字段：

```text
cottonMaskImage
impurityMaskImage
cottonOverlayImage
impurityOverlayImage
blackBackgroundImpurityOverlay
```

本地调试时可通过 `POST /predict?images=0` 或表单字段 `returnImages=false` 临时关闭图像返回，便于快速验证数值结果。

## 主要接口

```text
POST /auth/login
POST /auth/register
POST /auth/logout
POST /auth/change-password
GET  /news
POST /recognition
GET  /recognition/history
DELETE /recognition/history
GET  /user/profile
PUT  /user/profile
GET  /uploads/{filename}
GET  /health
```

`DELETE /recognition/history` 使用 JSON body 批量删除，例如 `{ "ids": [1, 2] }`。

`POST /recognition` 由 Spring Boot 转发到模型服务，会保存上传原图路径，并透传/存储模型服务返回的棉花掩模、杂质掩模、棉区叠加、杂质叠加和黑底杂质叠加图。

统一响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```
