# 部署说明

本文说明仅保留 Android App、Spring Boot 后端、MySQL 和 Python 模型服务后的部署方式。生产入口为 Spring Boot 后端 API，Android 端直接配置后端地址。

## 服务器要求

建议配置：

```text
系统：Linux x86_64
内存：8GB 起，模型推理建议 16GB+
磁盘：30GB 起，另需预留模型权重和 Docker 镜像空间
软件：Docker、Docker Compose
开放端口：8080 或自定义 BACKEND_PUBLIC_PORT
```

如果需要通过域名或 HTTPS 访问，可在后端前增加 Caddy、Nginx Proxy Manager、宝塔、云厂商负载均衡或自行配置反向代理证书。

## 准备文件

服务器上需要包含完整项目目录，并确认以下模型权重存在：

```text
services/backend/model-service-python/cotton-best.pth
services/backend/model-service-python/fenge_best.pth
```

复制环境变量模板：

```bash
cp .env.example .env
```

至少修改这些值：

```text
BACKEND_PUBLIC_PORT
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD
JWT_SECRET
PYTHON_SERVICE_CONNECT_TIMEOUT_MS
PYTHON_SERVICE_READ_TIMEOUT_MS
APP_UPLOAD_DIR
APP_CORS_ALLOWED_ORIGINS
APP_CORS_ALLOW_CREDENTIALS
```

`JWT_SECRET` 必须是 Base64 编码的 HMAC 密钥。项目使用 Bearer Token 认证，默认不需要跨域携带 Cookie，`APP_CORS_ALLOW_CREDENTIALS` 建议保持 `false`。模型推理可能较慢，`PYTHON_SERVICE_READ_TIMEOUT_MS` 默认 180000 毫秒，可按服务器性能调整。

## 单机 Docker 部署

在项目根目录执行：

```bash
docker compose up -d --build
```

查看状态和日志：

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f model-service
```

`docker compose ps` 中 `mysql`、`model-service`、`backend` 应显示 healthy。

访问地址：

```text
后端 API：http://服务器IP:8080
健康检查：http://服务器IP:8080/health
上传图片：http://服务器IP:8080/uploads/{filename}
```

如果绑定域名并反向代理到后端，例如 `https://cotton.example.com`：

```text
后端 API：https://cotton.example.com
Android API 地址：https://cotton.example.com
```

## Android 公网配置

Android 打包前，在 `apps/android/.env.local` 中配置：

```text
EXPO_PUBLIC_API_BASE_URL=http://服务器IP:8080
EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE=false
```

如果使用 HTTPS 域名：

```text
EXPO_PUBLIC_API_BASE_URL=https://cotton.example.com
EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE=false
```

环境变量会在构建时注入，因此改地址后需要重新打包 APK。

## 常见问题

如果识别失败：

```text
1. 检查 model-service 容器是否启动并 healthy。
2. 检查 cotton-best.pth 和 fenge_best.pth 是否存在。
3. 查看 docker compose logs -f backend 和 docker compose logs -f model-service。
```

如果登录或新闻失败：

```text
1. 检查 MySQL 容器是否正常。
2. 确认 .env 中数据库账号密码一致。
3. 打开 http://服务器IP:8080/health 验证后端是否可达。
```

账号相关接口依赖登录 token：

```text
POST /auth/change-password
GET  /user/profile
PUT  /user/profile
DELETE /recognition/history  body: { "ids": [1, 2] }
```

如果 Android 真机无法访问：

```text
1. 确认 EXPO_PUBLIC_API_BASE_URL 使用公网域名、服务器 IP 或局域网 IP，不要使用 localhost。
2. 如果使用 HTTPS，确保证书有效。
3. 如果使用 HTTP，确认 Android 网络安全策略和服务器防火墙允许访问。
```