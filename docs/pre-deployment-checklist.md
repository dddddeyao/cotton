# 部署前检查清单

这份清单用于把当前项目从本机开发态整理到服务器部署态。建议每次交付前按顺序检查一遍。

## 1. 不要提交或上传的内容

不要提交到 Git，也不要作为服务器部署包上传：

```text
.env
.env.local
apps/android/.env.local
.codex/
node_modules/
.expo/
services/backend/target/
apps/android/android/app/build/
uploads/
output/
datasets/
*.apk
*.aab
*.pth
```

正式签名 keystore、数据库密码、JWT 密钥也不能提交到 Git。模型权重 `*.pth` 需要作为部署资产单独传到服务器。

## 2. 必须准备的服务器文件

Docker Compose 部署至少需要：

```text
docker-compose.yml
.env
services/backend/Dockerfile
services/backend/.dockerignore
services/backend/mvnw
services/backend/.mvn/
services/backend/pom.xml
services/backend/src/
services/backend/model-service-python/Dockerfile
services/backend/model-service-python/.dockerignore
services/backend/model-service-python/requirements.txt
services/backend/model-service-python/model_service2.py
services/backend/model-service-python/unet.py
```

还必须把三个模型权重放到下面的位置：

```text
services/backend/model-service-python/fourtime-best.pth
services/backend/model-service-python/fenge_best.pth
services/backend/model-service-python/impurityarea_best.pth
```

`model_weights.pth` 不是当前 Docker 部署使用的模型文件。如果它是 0 字节，不能作为有效模型资产。

## 3. 服务器 .env 必填项

从 `.env.example` 复制出服务器自己的 `.env`，至少修改：

```text
BACKEND_PUBLIC_PORT
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD
JWT_SECRET
PYTHON_SERVICE_READ_TIMEOUT_MS
APP_CORS_ALLOWED_ORIGINS
APP_CORS_ALLOW_CREDENTIALS
```

`JWT_SECRET` 必须是 Base64 编码的 HMAC 密钥，解码后至少 32 字节。未配置时 Docker Compose 会阻止后端启动。

生成示例：

```bash
openssl rand -base64 32
```

Windows PowerShell：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## 4. Android 打包前检查

`apps/android/.env.local` 会在打包时写入 APK。打包前必须改成真实后端地址：

```text
EXPO_PUBLIC_API_BASE_URL=http://服务器IP:8088
```

如果有域名和 HTTPS，优先使用：

```text
EXPO_PUBLIC_API_BASE_URL=https://cotton.example.com
```

修改后必须重新打 APK。正式分发还需要把 Android release 签名从 debug keystore 换成正式 keystore。

## 5. 本机验证命令

提交或部署前建议运行：

```powershell
cd apps/android
npm.cmd run typecheck
```

```powershell
cd services/backend
.\mvnw.cmd test
```

## 6. 服务器验证命令

服务器项目根目录执行：

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs -f backend model-service
```

正常状态：

```text
mysql          healthy
model-service  healthy
backend        healthy
```

再访问：

```text
http://服务器IP:8088/health
```

最后用真机验证登录、拍照识别、识别记录、新闻列表、新闻详情和上传图片访问。

## 7. 端口和安全

对外只需要开放后端端口或 HTTPS 反向代理端口。MySQL `3306` 和模型服务 `5000` 不应暴露到公网或校园网。

如果部署到公网，建议启用 HTTPS、收紧 CORS、增加接口限流，并定期备份 `mysql_data` 和 `backend_uploads` 两个 Docker 卷。
