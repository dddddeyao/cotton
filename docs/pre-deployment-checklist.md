# 部署前检查清单

这份清单用于把当前项目从本机开发态整理到服务器部署态。建议每次交付前按顺序检查一遍。

> **目标部署机默认 Linux**：第 6 节的服务器命令都是 Linux（bash）；本清单里的 PowerShell 命令用于 **Windows 打包 / 开发机**；备用 Windows 部署机请看 `docs/deployment-guide.md` 附录 B。

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
*.keystore
*.jks
keystore.properties
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

### 4.1 出包方式（二选一）

**通用版（推荐，一次打包到处用）**：地址留空，由 App 内配置

```powershell
.\build-apk-lan.ps1
# 产物：项目根目录 cotton-recognition.apk
```

**专用版（开箱即用，换电脑需重打）**

```powershell
.\build-apk-lan.ps1 -LanIP 192.168.1.100 -Port 8088
# 产物：cotton-recognition-192.168.1.100.apk
```

`apps/android/.env.local` 由脚本自动写入，不需要手工编辑。若使用域名 + HTTPS，可手工把 `EXPO_PUBLIC_API_BASE_URL` 写成 `https://cotton.example.com` 后再执行 Gradle 构建。

### 4.2 签名检查（交付必须）

正式包必须使用正式签名。脚本按以下顺序查找签名材料：

1. `apps/android/android/keystore.properties`（已被 `.gitignore` 排除）
2. 环境变量 `COTTON_KEYSTORE_FILE` / `COTTON_KEYSTORE_PASSWORD` / `COTTON_KEY_ALIAS` / `COTTON_KEY_PASSWORD`

> ⚠️ `keystore.properties` 里的 `storeFile` **请写成正斜杠**（`E:/path/to/cotton-release.keystore`）。
> Windows 路径里的反斜杠会被 Java Properties 当作转义符，导致文件找不到而**静默回退到 debug 签名**（构建日志不会报错，只有出包后核对签名才会发现）。
> 出包脚本已内置签名校验：若结果是 debug 签名会给出醒目警告。

两者都没有时会**回退到 debug 签名**（仅适合本地调试，不能作为交付包）。出包后核对签名：

```powershell
& "$env:ANDROID_HOME\build-tools\<版本号>\apksigner.bat" verify --print-certs .\cotton-recognition.apk
```

> ⚠️ 正式签名与旧的调试签名包**互不兼容**：手机上已装旧版（1.0.0）时，必须先 `adb uninstall com.customs.cottonrecognition` 再安装新包。

> ⚠️ keystore 与口令请离线备份；丢失后无法再对已安装的 App 做覆盖升级。

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

> 服务器（默认 Linux）用 `deploy-lan.sh` 部署时会自动带上 `docker-compose.linux.yml`（有 GPU 时）。**手工**执行下面的命令时：机器**有** NVIDIA GPU 且想启用 GPU 加速 + 宿主机 5000 端口，需要加 `-f docker-compose.linux.yml`；机器**没有** GPU 时**不要**加（否则会因找不到 nvidia 设备而启动失败）。

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
