# 局域网部署快速启动

这份说明按当前项目根目录 `.env` 的配置编写：

```text
BACKEND_PUBLIC_PORT=8080
MYSQL_PUBLIC_PORT=127.0.0.1:3306
```

也就是说，局域网 Android 端访问后端时使用 `:8080`。

## 1. 打开 Docker Desktop

先启动 Docker Desktop，等待它显示 Docker Engine running。

如果没有启动，会出现类似错误：

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

## 2. 启动服务

第一次部署前，先复制局域网模板并填写真实配置：

```powershell
Copy-Item .env.lan.example .env
```

必须修改 `.env` 中的数据库密码和 `JWT_SECRET`：

```text
MYSQL_PASSWORD=换成你自己的数据库密码
MYSQL_ROOT_PASSWORD=换成你自己的数据库 root 密码
JWT_SECRET=换成 Base64 编码的 HMAC 密钥
```

PowerShell 生成 `JWT_SECRET`：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

在项目根目录执行：

```powershell
docker compose up -d --build
```

查看状态：

```powershell
docker compose ps
```

## 3. 获取电脑 IP

```powershell
ipconfig
```

找到当前网络的 IPv4，例如：

```text
192.168.1.100
```

## 4. 后端健康检查

同一局域网设备打开：

```text
http://192.168.1.100:8080/health
```

## 5. Android 配置

编辑：

```text
apps/android/.env.local
```

写入：

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080
EXPO_PUBLIC_REQUEST_TIMEOUT_MS=15000
EXPO_PUBLIC_RECOGNITION_TIMEOUT_MS=30000
EXPO_PUBLIC_RECOGNITION_UPLOAD_FIELD_NAME=file
```

如果电脑 IP 变了，Android 这里也要改。正式 APK 需要重新打包。

## 6. 防火墙

Windows 防火墙需要允许入站 TCP：

```text
8080
```

不需要对外开放 `5000`、`3306`。
