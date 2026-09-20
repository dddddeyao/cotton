# 现场部署速查卡（一页纸）

> 给去现场的人看，不需要懂开发。照顺序做即可。
> **目标部署机：Linux（默认，推荐）**；若现场只有 Windows 电脑，才走备用方案（见第二章「如果是 Windows（备用方案）」）。
> 版本：棉花识别助手 v1.1.0

---

## 一、出发前必须带齐（缺一样现场都做不成）

| # | 东西 | 怎么带 | 备注 |
|---|---|---|---|
| 1 | 项目整个文件夹 | U 盘 / 移动硬盘 | 目录里要有 `docker-compose.yml`、`deploy-lan.sh`（**目标机默认 Linux**；备用 Windows 才需要 `deploy-lan.ps1`） |
| 2 | **三个模型权重** | U 盘 | `fourtime-best.pth`、`fenge_best.pth`、`impurityarea_best.pth`（共约 327MB）**不在 Git 里**，必须单独带 |
| 3 | 手机安装包 | U 盘 / 微信 | `cotton-recognition.apk`（**通用版**：不预置 IP，现场在 App 内填/自动搜索） |
| 4 | 本文件 + `docs/static-ip-setup.md` | 打印或存手机 | 现场要固定 IP 时照着做；**不需要提前知道现场网段** |
| 5 | 可选的离线资源 | U 盘 | 无外网现场：Docker 镜像导出包 + Docker 安装包（见下方「U 盘离线交付」） |

> 权重放置位置：`services/backend/model-service-python/` 目录下（三个文件都放这里）

### U 盘离线交付：哪些能提前装、哪些必须到现场做

"构建好环境直接拷 U 盘、现场拷进去就用"——**一半对**。可以提前打包的是"项目 + 权重 + APK"，但**运行环境（Docker/conda）和镜像**不一定能直接拷，具体看下表：

> 目标机默认 **Linux**：下表按 Linux 走即可。Windows 是备用方案，只有最后一行（conda 环境）与 Linux 不同。

| 项目 | 能否提前装进 U 盘 | 说明 |
|---|---|---|
| 项目目录（源码 / compose / 部署脚本） | ✅ | 直接拷 |
| 三个 `.pth` 权重 | ✅ | 必须单独带（不在 Git 里） |
| 通用版 APK | ✅ | 与 IP 解耦，现场在 App 内配置 |
| 本速查卡 + 静态 IP 文档 | ✅ | 建议打印一份 |
| `.env`（含 `JWT_SECRET`、IP、端口） | ❌ **现场生成** | `deploy-lan.sh` / `deploy-lan.ps1` 会自动写入，`JWT_SECRET` 是随机值 |
| 静态 IP 具体地址 | ❌ **现场确定** | 取决于现场路由器网段，按 `docs/static-ip-setup.md` 第三节 |
| Docker 引擎本体 | ⚠️ 需现场安装 | 可以提前下好安装包放 U 盘，但仍要在现场执行安装 |
| Docker 镜像 | ⚠️ 需提前导出 | 见下方 `docker save` / `docker load`；现场有外网则可直接 `docker compose build` |
| **Windows 侧 conda 环境**（仅备用方案才需要） | ❌ 拷不过去 | 默认的 Linux 目标机不需要 conda（模型服务跑在容器里）；若走 Windows 备用方案，模型服务是 **conda 原生进程**（`D:\aconda\envs\YOLO\python.exe`，找不到会回退 `D:\aconda\python.exe`），换机器必须在新机器上先装好该环境（含 torch/torchvision/flask/opencv 等） |

**现场没外网时：提前在开发机导出镜像，现场导入**

```bash
# ① 开发机（有网）：先正常构建一次，让镜像存在
docker compose -f docker-compose.yml -f docker-compose.linux.yml build
docker pull mysql:8.4

# ② 看镜像名（compose 自动命名规则：<项目目录名>-<服务名>）
docker images | grep -E 'backend|model-service|mysql'

# ③ 导出（按上一步实际名字替换；目录名不同则镜像名会不同）
docker save -o cotton-images.tar \
  cotton-recognition-assistant-backend \
  cotton-recognition-assistant-model-service \
  mysql:8.4
```

```bash
# ④ 现场机器（Linux）：导入后直接起，不需要 build
docker load -i cotton-images.tar
docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d
```

> ⚠️ 三个关键前提：
> 1. **项目目录名要一致**（默认按目录名生成镜像名）。若现场解压后的目录名不同，导入后需 `docker tag <原名> <目录名>-backend` 之类改名，或干脆现场重新 `docker compose build`。
> 2. **现场首次构建需要外网**：`services/backend/Dockerfile` 里 `./mvnw dependency:go-offline`（Maven 依赖）和模型服务的 `pip install` 都要下载（已配置国内镜像源）；没外网就走上面的 `docker save/load`。
> 3. **GPU 相关**：Linux 侧 GPU 推理需要 `nvidia-container-toolkit`；**没有 NVIDIA GPU 也不用特判** —— `deploy-lan.sh` 检测不到就自动只加载 `docker-compose.yml`，走 CPU 推理（速度慢些，功能一致）。代价是宿主机不映射 5000 端口，模型服务要看 `docker compose ps` 里的 `healthy`（见部署手册第三章「验证」）。


---

## 二、部署机上的操作（约 20 分钟）

### 如果是 Linux（默认，推荐）

```bash
cd 项目目录
chmod +x deploy-lan.sh
sudo ./deploy-lan.sh          # 会问两次，直接回车即可
hostname -I                   # 记下这个 IP，例如 192.168.1.123
```

### 如果是 Windows（备用方案）

```powershell
cd 项目目录
.\deploy-lan.ps1              # 需要「以管理员身份运行 PowerShell」
ipconfig                      # 记下 IPv4 地址
```

脚本会自动：检测 IP → 放行端口 → 启动数据库/后端/模型服务 → 做健康检查 → 打印结果。

**看到什么算成功**：脚本最后打印「后端地址: http://x.x.x.x:8088」且健康检查通过。
Docker 没装的话，先自行安装：**Linux 装 Docker Engine**（备用 Windows 才装 Docker Desktop）。

**可选（推荐）：把这个 IP 固定住**，这样 App 里填一次以后就不用再改：

```bash
# Linux：脚本自动推导网卡/网关/掩码，不需要提前知道网段；填"它现在拿到的这个 IP"最省事
cd 项目目录 && sudo bash tools/set-static-ip.sh -i <上面 hostname -I 看到的那个 IP>
```

Windows 走「设置 → 网络和 Internet → 更改适配器选项 → 网卡属性 → IPv4 → 使用下面的 IP 地址」（**备用方案**；`deploy-lan.ps1` 也会在部署时提示确认）。
完整流程与坑见 **`docs/static-ip-setup.md`**（含现场定 IP 六步、自检清单、恢复 DHCP 命令）。


---

## 三、手机端操作

1. 手机连上**和电脑同一个 WiFi**
2. 安装 `cotton-recognition.apk`（微信发的文件 → 用其他应用打开 → 安装）
3. 打开 App → **我的 → 系统设置 → 服务器地址**
4. 填 `http://刚才记下的IP:8088` → 点「**保存并测试连接**」
   - 不知道 IP 就点「**自动搜索服务器**」，几秒自动找到
5. 提示"设置成功" → 用账号登录 → 拍照识别，正常出结果就完成了

> 如果手机上装过**旧版本**，先卸载再装新的（签名不同，装不上去）。
> 卸载命令（有 adb 时）：`adb uninstall com.customs.cottonrecognition`

---

## 四、三个最容易卡住的地方

| 现象 | 原因 | 怎么办 |
|---|---|---|
| 手机浏览器打不开 `http://IP:8088/health` | 防火墙没放行 8088 | Linux 重跑 `sudo ./deploy-lan.sh`；Windows 加一条入站规则放行 TCP 8088 |
| App 提示连接失败，但浏览器能打开 | App 内地址填错 | 重进「服务器地址」改一次，或点「自动搜索服务器」 |
| 重启电脑后 App 连不上 | 电脑 IP 变了 | 在电脑上 `hostname -I` / `ipconfig` 看新 IP，App 里改一次即可，**不用重新装 APK** |
| 想彻底避免"重启后 IP 变了" | — | 把 IP 固定住（可选）：Linux 用 `tools/set-static-ip.sh`，Windows 在网卡属性里设静态 IP，见 `docs/static-ip-setup.md` |
| 现场不确定该用哪个 IP | 静态 IP 必须同网段 | 按 `docs/static-ip-setup.md` 第三节：先 DHCP 连上，把"它拿到的那个 IP"原样钉住即可 |

---

## 五、收尾 / 回退

```bash
# 用完释放资源（共用电脑必须做）
sudo docker compose -f docker-compose.yml -f docker-compose.linux.yml down

# 完全卸载、恢复电脑原状（Linux）
sudo ./undeploy-lan.sh
```

---

## 六、遇到搞不定的，按这三条信息反馈给开发

1. 电脑上执行 `hostname -I`（Linux）或 `ipconfig`（Windows）的结果
2. 手机浏览器打开 `http://<那个IP>:8088/health` 看到的内容（截图）
3. App 里「服务器地址」页面的截图

有这三样，基本可以远程判断问题。
