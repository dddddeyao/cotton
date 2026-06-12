# 部署说明

目标部署形态：公网只暴露 Web/Nginx，Web 负责静态页面访问，并把 `/api/*` 反向代理到后端；后端、MySQL、Python 模型服务运行在服务器内部 Docker 网络中。

## 服务器要求

建议配置：

```text
系统：Linux x86_64
内存：8GB 起，模型推理建议 16GB+
磁盘：30GB 起，另需预留模型权重和 Docker 镜像空间
软件：Docker、Docker Compose
开放端口：80 或 443
```

如需 HTTPS，建议在服务器前面增加 Caddy、Nginx Proxy Manager、宝塔、云厂商负载均衡或自行配置 Nginx 证书。

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
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD
JWT_SECRET
APP_CORS_ALLOWED_ORIGINS
```

`JWT_SECRET` 必须是 Base64 编码的 HMAC 密钥。可以在本机生成后写入 `.env`。

## 单机 Docker 部署

在项目根目录执行：

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f web
docker compose logs -f backend
docker compose logs -f model-service
```

访问地址：

```text
Web 页面：http://服务器IP/
健康检查：http://服务器IP/api/health
```

如果绑定域名，例如 `https://cotton.example.com`：

```text
Web 页面：https://cotton.example.com/
后端 API：https://cotton.example.com/api
Android API 地址：https://cotton.example.com/api
```

## Android 公网配置

Android 打包前，在 `apps/android/.env.local` 中配置：

```text
EXPO_PUBLIC_API_BASE_URL=https://cotton.example.com/api
EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE=false
```

然后重新构建 APK。环境变量会在构建时注入，因此改地址后需要重新打包。

## Web 公网配置

Docker 部署默认使用：

```text
WEB_API_BASE_URL=/api
VITE_MOCK_WHEN_API_UNAVAILABLE=false
```

这样浏览器访问同一个域名即可调用后端，避免跨域和移动端 HTTP 地址不一致的问题。

## 反向代理说明

`apps/web/nginx.conf` 中的规则会把：

```text
/api/auth/login
/api/news
/api/recognition
```

转发为后端内部服务：

```text
http://backend:8080/auth/login
http://backend:8080/news
http://backend:8080/recognition
```

因此前端生产环境 API 地址统一写 `/api`。

## 常见问题

如果 Web 能打开但识别失败：

```text
1. 检查 model-service 容器是否启动。
2. 检查两个 .pth 权重文件是否存在。
3. 查看 docker compose logs -f backend 和 docker compose logs -f model-service。
```

如果登录或新闻失败：

```text
1. 检查 MySQL 容器是否正常。
2. 确认 .env 中数据库账号密码一致。
3. 打开 http://服务器IP/api/health 验证后端是否可达。
```

如果 Android 真机无法访问：

```text
1. 确认 EXPO_PUBLIC_API_BASE_URL 使用公网域名或服务器 IP，不要使用 localhost。
2. 如果使用 HTTPS，确保证书有效。
3. 如果使用 HTTP，确认 Android 网络安全策略和服务器防火墙允许访问。
```
