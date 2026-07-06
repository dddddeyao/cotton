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
EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE=false
```

`EXPO_PUBLIC_API_BASE_URL` 留空时会直接使用 mock 数据，便于不启动后端时演示。真机调试时不要使用 `localhost` 作为后端地址，应使用局域网 IP、服务器 IP 或域名。


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

识别上传图片默认保存到后端工作目录的 `uploads/`，可通过 `APP_UPLOAD_DIR` 调整。接口返回的图片路径形如 `/uploads/{filename}`。

## Python 模型服务

运行命令：

```bash
cd services/backend/model-service-python
pip install -r requirements.txt
python model_service2.py
```

模型服务依赖本地模型权重：

```text
cotton-best.pth
fenge_best.pth
```

这些权重文件较大，不建议提交到 Git。

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

统一响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```
