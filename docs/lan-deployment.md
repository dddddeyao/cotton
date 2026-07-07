# 局域网单机部署说明

目标：把 Spring Boot 后端、MySQL 数据库、Python 算法模型服务部署在同一台电脑上。同一 Wi-Fi 或同一局域网内的 Android App 直接调用这台电脑上的后端接口。

## 1. 部署结构

```text
Android App
  -> http://部署电脑IP:8080
     -> Spring Boot 后端
        -> MySQL
        -> Python Flask 模型服务
           -> fourtime-best.pth / fenge_best.pth / impurityarea_best.pth
```

对外只需要开放后端端口，默认是 `8080`。模型服务 `5000`、MySQL `3306` 不需要暴露给局域网用户。

## 2. 准备电脑

需要安装：

```text
Docker Desktop
Docker Compose
```

确认模型文件存在：

```text
services/backend/model-service-python/fourtime-best.pth
services/backend/model-service-python/fenge_best.pth
services/backend/model-service-python/impurityarea_best.pth
```

当前流程使用 `fourtime-best.pth` 做颜色识别，`fenge_best.pth` 做棉花区域分割，`impurityarea_best.pth` 做杂质区域分割。如果本地已有等价的 `cottonarea_best.pth`，可重命名为 `fenge_best.pth`，或通过 `COTTON_UNET_WEIGHTS` 配置为该文件名。

确认电脑和 Android 设备在同一个网络下，例如都连接同一个 Wi-Fi。

## 3. 查看电脑局域网 IP

Windows PowerShell：

```powershell
ipconfig
```

找到正在使用的网卡，例如“无线局域网适配器 WLAN”，记录 `IPv4 地址`，形如：

```text
192.168.1.100
```

后文用 `192.168.1.100` 举例，实际部署时请换成你的电脑 IP。

## 4. 配置环境变量

在项目根目录复制局域网模板：

```powershell
Copy-Item .env.lan.example .env
```

编辑 `.env`：

```text
LAN_HOST_IP=192.168.1.100
BACKEND_PUBLIC_PORT=8080
MYSQL_PASSWORD=换成你自己的数据库密码
MYSQL_ROOT_PASSWORD=换成你自己的数据库 root 密码
JWT_SECRET=换成 Base64 编码的 HMAC 密钥
```

`JWT_SECRET` 需要显式填写。PowerShell 可用下面的命令生成：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## 5. 启动服务

在项目根目录执行：

```powershell
docker compose up -d --build
```

查看状态：

```powershell
docker compose ps
```

正常情况下，`mysql`、`model-service`、`backend` 会显示 healthy。

查看日志：

```powershell
docker compose logs -f model-service
docker compose logs -f backend
```

## 6. 后端健康检查

在部署电脑或同一局域网其他设备打开：

```text
http://192.168.1.100:8080/health
```

如果健康检查能返回内容，说明后端 API 可用。

## 7. Android 端配置

Android 真机不能使用 `localhost`。需要让 App 调用部署电脑的局域网 IP。

复制 Android 局域网模板：

```powershell
Copy-Item apps/android/.env.lan.example apps/android/.env.local
```

编辑 `apps/android/.env.local`：

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080
```

如果只是 Expo 调试，重启 Expo：

```powershell
cd apps/android
npm run start
```

如果要发给其他安卓手机安装，需要重新打包 APK，因为 Expo 环境变量会在构建时写入应用。

## 8. Windows 防火墙

如果别的设备打不开 `http://192.168.1.100:8080/health`，优先检查 Windows 防火墙。

需要允许入站 TCP：

```text
8080
```

不需要对外开放 `5000`、`3306`。

## 9. 常用维护命令

停止服务：

```powershell
docker compose down
```

更新代码后重新构建：

```powershell
docker compose up -d --build
```

只看后端日志：

```powershell
docker compose logs -f backend
```

只看算法日志：

```powershell
docker compose logs -f model-service
```

## 10. 常见问题

识别失败：

```text
1. 检查 model-service 是否 healthy。
2. 检查 fourtime-best.pth、fenge_best.pth 和 impurityarea_best.pth 是否在 model-service-python 目录。
3. 查看 docker compose logs -f model-service。
4. 查看 docker compose logs -f backend。
```

Android 访问失败：

```text
1. 确认手机和部署电脑在同一 Wi-Fi。
2. 确认 apps/android/.env.local 使用的是 http://电脑IP:8080。
3. 不要写 localhost 或 127.0.0.1。
4. 修改 .env.local 后，需要重启 Expo；正式 APK 需要重新打包。
5. 检查 Windows 防火墙是否放行 8080 端口。
```

电脑 IP 变了：

```text
1. Android .env.local 的 EXPO_PUBLIC_API_BASE_URL 要换成新的 IP。
2. 已打包 APK 需要重新打包，或把电脑设置为固定局域网 IP。
```
