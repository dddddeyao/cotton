# 棉花智能识别系统 — 局域网部署与使用手册

> **面向用户**：海关现场工作人员 / IT 运维人员  
> **目标部署机**：**Linux（默认，推荐）**；Windows 10/11 作为**备用方案**保留（见「附录 B」）  
> **适用场景**：一台电脑（Linux 服务器 / Linux 电脑，或备用的 Windows 电脑）+ 一部 Android 手机，同一局域网内使用

---

## 一、系统架构

```
┌──────────────────────────────────────────────────┐
│   电脑（部署机）                                    │
│  ┌──────────────────────────────────────────┐    │
│  │  Docker 容器                              │    │
│  │   ┌──────────┐    ┌──────────┐           │    │
│  │   │  MySQL    │    │ Backend  │           │    │
│  │   │ (3306)    │◄──►│ (8088)   │           │    │
│  │   └──────────┘    └────┬─────┘           │    │
│  │                        │ HTTP             │    │
│  │   ┌──────────────────┐ │                 │    │
│  │   │ 模型推理服务       │◄┘ (Docker 容器)   │    │
│  │   │ (Python, 5000)   │                   │    │
│  │   └──────────────────┘                   │    │
│  └──────────────────────────────────────────┘    │
└──────────────────┬───────────────────────────────┘
                   │ 同一局域网 (WiFi)
                   │
┌──────────────────▼───────────────────────────────┐
│  Android 手机                                     │
│  安装 cotton-recognition-<IP>.apk                │
│  打开 App → 拍照识别                               │
└──────────────────────────────────────────────────┘
```

> **操作系统选择（先看这里）**
>
> - **默认目标机：Linux**（Ubuntu 20.04+ / CentOS 7+）→ 直接照 **第三章** 执行，这是推荐路径。
> - **备用方案：Windows 10/11** → 仅当现场没有 Linux 机器、或 Linux 部署失败时使用，完整步骤见 **附录 B**。
>
> 两条路径的差异（会影响换机与离线交付，务必先知晓）：
>
> | | **Linux（默认）** | Windows（备用） |
> |---|---|---|
> | 模型服务形态 | **Docker 容器**，与后端、MySQL 同一套 compose | **conda 原生进程**，不在 Docker 里 |
> | `docker compose ps` 里能看到 | mysql / backend / model-service | 只有 mysql / backend |
> | 新机器要准备什么 | 装 Docker Engine 即可 | 还要额外装好 Anaconda 环境（torch / torchvision / flask / opencv 等） |
> | 离线（U 盘）交付 | 镜像可 `docker save` / `load` 整体搬运 | conda 环境**拷不过去**，必须在新机器上重建 |
> | 一键卸载 | `undeploy-lan.sh` | 暂无 `undeploy-lan.ps1`，需手动 `docker compose down` 并结束模型服务进程 |

---

## ⚠️ 共用电脑必读（重要）

如果这台电脑**同时还有别人使用**，请遵守以下原则，避免影响他人：

| 事项 | 本方案的做法 | 说明 |
|------|------------|------|
| 网络 / IP | **不修改**任何网络配置 | 不改 IP、DNS、路由、代理，也不需要设静态 IP |
| 防火墙 | **不改变**开关状态 | 仅在防火墙已启用时追加一条放行 8088 的规则 |
| 开机自启 | **默认不启用**（需手动确认） | 不注册自启就不会常驻占用内存 / GPU |
| 运行方式 | 用完即停 | 不使用时执行 `docker compose down` 释放资源 |
| 卸载 | 一键清理 | 运行 `./undeploy-lan.sh` 移除容器、自启服务与防火墙规则 |

> 原则：**只占用本项目所需的端口与资源，且随时可以完全撤回**。

---

## 二、部署前准备

### 电脑端需要预装的软件

#### Linux（默认目标机，推荐）

| 软件 | 版本要求 | 安装命令 |
|------|---------|---------|
| Docker Engine | 24+ | `curl -fsSL https://get.docker.com \| sh` |
| docker compose | 插件版 | Docker Engine 24+ 自带 |
| Git | 任意 | `apt install git` 或 `yum install git` |
| GPU 驱动（可选） | NVIDIA | `nvidia-smi` 能正常输出即可 |
| nvidia-container-toolkit（可选） | 最新 | 见 [NVIDIA 官方文档](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) |

> **没有 NVIDIA GPU 也能部署**：`deploy-lan.sh` 会先检测 GPU（`nvidia-smi` + Docker 是否配置了 nvidia runtime），检测不到就**自动只加载 `docker-compose.yml`**，模型服务走纯 CPU 推理（速度慢一些，功能完全一样）。
> 注意：GPU 配置**和**「模型服务映射到宿主机 5000 端口」这两件事都写在 `docker-compose.linux.yml` 里，所以 **CPU 模式下宿主机没有 5000 端口**，验证方式见第三章「验证」。

#### Windows（备用方案）

| 软件 | 版本要求 | 安装说明 |
|------|---------|---------|
| Windows | 10 / 11 专业版或企业版 | 必须 |
| Docker Desktop | 4.x+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Anaconda / Miniconda | 2024+ | [anaconda.com](https://www.anaconda.com/download)（本路径的模型服务是 conda 原生进程，**必装**） |
| Git | 任意 | [git-scm.com](https://git-scm.com/)（用于拉取项目代码） |
| Android SDK | 34+ | 用于构建 APK |

### 手机端要求

- Android 10 以上
- 已开启「允许安装未知来源应用」

### 网络要求

- 电脑和手机连接**同一个 WiFi**
- 电脑**没有启用"客户端隔离"**（公司 / 校园 Wi-Fi 常见，如果手机 ping 不通电脑则需改用手机热点）

---

## 三、部署步骤（Linux，默认目标机）

**默认目标机为 Linux**（Ubuntu 20.04+ / CentOS 7+），下面是推荐流程；**只有 Windows 电脑时请看「附录 B」**。

> 下面所有命令都在**部署机的项目目录**里执行，示例目录为 `/opt/cotton-recognition-assistant`。

### 前置准备

在 Linux 上执行以下命令安装 Docker：

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# 重新登录使 docker 免 sudo
```

如果服务器有 NVIDIA GPU，安装 nvidia-container-toolkit（可选，加速模型推理）：

```bash
# Ubuntu
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -sL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 一键部署

```bash
# 1. 将整个项目目录拷贝到 Linux 服务器上（U盘 / scp / git clone）
#    假设放在 /opt/cotton-recognition-assistant

# 2. 赋予执行权限
chmod +x /opt/cotton-recognition-assistant/deploy-lan.sh

# 3. 以 root 权限运行
sudo /opt/cotton-recognition-assistant/deploy-lan.sh
```

> 脚本**不会修改网络配置**（不改 IP / DNS / 路由），可在共用电脑上安全运行。
> 若 8088 端口已被他人服务占用，脚本会提示并建议用 `-p` 换一个端口。

脚本自动完成：

| 步骤 | 说明 |
|------|------|
| ① 检测局域网 IP | 自动找到当前公网/IPv4 |
| ② 检查 Docker + GPU | 验证 docker compose 和 NVIDIA；**没有 GPU 会自动降级为 CPU**（只加载基础 compose 文件） |
| ③ 检查模型文件 | 确认 `.pth` 文件存在 |
| ④ 检查防火墙 | 仅在防火墙已启用时追加放行规则（不改变其开关） |
| ⑤ 生成 .env | 写入后端 IP、JWT_SECRET |
| ⑥ 构建 Docker 镜像 | docker compose build |
| ⑦ 启动服务 | docker compose up -d（GPU / CPU 自动适配） |
| ⑧ 开机自启（可选） | 询问后决定是否注册 systemd，共用电脑建议不启用 |

### 验证

```bash
# 后端健康检查
curl http://127.0.0.1:8088/health

# 模型服务健康检查（仅「有 GPU」模式可通，原因见下方说明）
curl http://127.0.0.1:5000/health

# 查看所有容器状态（CPU / GPU 模式都可用）
docker compose ps
```

> **CPU 回退模式（无 NVIDIA GPU）怎么验证模型服务？** 此时脚本只加载了 `docker-compose.yml`，宿主机的 5000 端口没有映射，上面的 `curl http://127.0.0.1:5000/health` 连不上属于**正常现象**，不是故障。改用下面任一方式确认：

```bash
# 方式 1：看容器状态 —— model-service 显示 healthy 即正常
docker compose ps

# 方式 2：进容器内自检（与容器 healthcheck 用的是同一条命令）
docker compose exec model-service \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5000/health', timeout=5).read())"
```

### 获取 APK

脚本运行结束后会输出后端地址（例如 `http://192.168.1.100:8088`）。

本项目使用**通用版 APK**，与部署机 IP 无关：直接把 `cotton-recognition.apk` 拷贝到手机安装，然后在 App 内进入 **我的 → 系统设置 → 服务器地址**，填写上述地址（或点「自动搜索服务器」）即可。

如果需要在装有 Android SDK 的机器上重新构建通用版 APK：

```powershell
.\build-apk-lan.ps1
```

也支持按指定 IP 构建"开箱即用"的专用包（换电脑需要重打）：

```powershell
.\build-apk-lan.ps1 -LanIP 192.168.1.100
```

### 卸载 / 恢复原状（共用电脑用完请执行）

```bash
chmod +x /opt/cotton-recognition-assistant/undeploy-lan.sh
sudo /opt/cotton-recognition-assistant/undeploy-lan.sh
```

该脚本会：停止并删除本项目容器、移除开机自启服务、移除防火墙放行规则；
**不会**删除源码、`.env` 和模型文件（如需彻底删除请手动 `rm -rf` 项目目录）。

> ✅ **Linux 部署到此结束**：接下来看 **第四章「日常使用流程」**。
> 只有"现场确实没有 Linux 机器 / Linux 部署失败"时才需要看下面的 **附录 B（Windows 备用方案）**。

---

## 附录 B：Windows 部署（备用方案）

> ⚠️ **本节是备用路径，仅在现场没有 Linux 机器、或 Linux 部署失败时使用。**
> 与默认的 Linux 路径相比，本路径额外依赖 **Anaconda 环境**（模型服务是 conda 原生进程，不在容器里），换机器时必须在新机器上重建该环境，**U 盘拷不过去**。
> 下文示例中的 `e:\my-react-workspace\cotton-recognition-assistant` 是**示例路径**，请替换为你实际的项目目录。

### 第 1 步：拉取项目代码

```powershell
# 如果还没有项目目录
git clone <项目仓库地址> e:\my-react-workspace\cotton-recognition-assistant
cd e:\my-react-workspace\cotton-recognition-assistant
```

> 如果已有项目目录（如从 U 盘拷贝），跳过此步。

### 第 2 步：启动 Docker Desktop

双击 Docker Desktop 图标启动，等待底部状态栏显示 **"Docker Engine running"**。

> 首次启动可能需要 2-3 分钟。如果遇到 WSL 相关问题，请参考 Docker 官方文档。

### 第 3 步：固定电脑 IP（可选；共用电脑请跳过）

> **说明**：本方案的 App 支持在应用内配置服务器地址，因此**不固定 IP 也能正常使用** —— IP 变化后在 App 里改一次即可（见常见问题 Q3）。
> 固定 IP 只是为了减少现场改动次数，属于可选项。

> ⚠️ **如果这台电脑是共用的，请不要修改网络设置**（不要设静态 IP），以免影响他人上网。

操作路径：

1. 打开 **设置 → 网络和 Internet → 高级网络设置 → 更改适配器选项**
2. 右键点击当前使用的网卡（WLAN 或以太网）→ **属性**
3. 双击 **Internet 协议版本 4（TCP/IPv4）**
4. 选择 **"使用下面的 IP 地址"**，填入：
   - **IP 地址**：例如 `192.168.1.100`（根据公司网络段调整）
   - **子网掩码**：`255.255.255.0`
   - **默认网关**：路由器的 IP，通常是 `192.168.1.1`
   - **DNS**：`8.8.8.8` 和 `114.114.114.114`

### 第 4 步：运行一键部署脚本

**以管理员身份**打开 PowerShell，执行：

```powershell
cd e:\my-react-workspace\cotton-recognition-assistant
.\deploy-lan.ps1
```

脚本会自动完成以下工作：

| 步骤 | 说明 |
|------|------|
| ① 检测局域网 IP | 自动找到当前网络 IPv4 |
| ② 配置防火墙 | 放行 TCP 8088 端口入站 |
| ③ 配置 Docker 开机自启 | 设置 Docker 服务 + 计划任务 |
| ④ 配置模型服务开机自启 | 注册计划任务 `CottonRecognition_ModelService` |
| ⑤ 生成 .env | 写入后端地址等配置 |
| ⑥ 启动 Docker 服务 | `docker compose up -d --build` |
| ⑦ 启动模型推理服务 | 启动 Python Flask 服务（端口 5000） |
| ⑧ **构建 Release APK** | 将后端 IP 编译进安装包 |

> ⚠️ 第⑧步需要 3-8 分钟。如果中途网络或内存不足导致构建失败，可以单独运行：
> ```powershell
> .\build-apk-lan.ps1
> ```

### 第 5 步：健康检查

在**同一局域网内的手机**浏览器中打开：

```
http://<电脑IP>:8088/health
```

应该能看到类似 `{"status":"UP"}` 的 JSON 响应。

如果打不开，检查：
1. 电脑防火墙是否放行了 8088 端口（运行 `deploy-lan.ps1` 会自动添加）
2. 电脑是否开启了 VPN 或代理（关闭后重试）
3. 电脑 IP 是否正确（在电脑上运行 `ipconfig` 查看）

### 第 6 步：安装 APK

本方案使用**通用版 APK**：后端地址不写死在安装包里，首次打开时在 App 内填写或自动搜索即可。

APK 文件位于项目根目录：

```text
<项目目录>\cotton-recognition.apk
```

#### 方式 A：通过 USB 安装（推荐）

```powershell
adb install -r <项目目录>\cotton-recognition.apk
```

#### 方式 B：通过微信 / QQ 传输

1. 将 APK 文件发送到手机微信或 QQ
2. 在手机上点击文件 → 选择「用其他应用打开」→ 安装

#### 安装后首次配置（只需做一次）

1. 打开「棉花识别助手」App
2. 进入 **我的 → 系统设置 → 服务器地址**
3. 填写部署电脑的地址（部署脚本结束时会打印），例如 `192.168.1.100:8088`，点「保存并测试连接」
   - 不知道地址时，点「自动搜索服务器」，App 会在局域网内自动找到后端（约 3~8 秒）
4. 提示「设置成功」后即可正常使用

> 之后无论换哪台电脑部署，只要在 App 里改一次地址即可，**不需要重新打包、也不用重新安装 App**。

> ⚠️ 如果手机上装过旧版本（1.0.0，调试签名），正式签名版本与它签名不同、无法覆盖安装，请先卸载旧版本：
> ```powershell
> adb uninstall com.customs.cottonrecognition
> ```

---

## 四、日常使用流程

### 开机后等待约 60 秒

电脑开机 → 系统启动 → Docker 自动运行 → docker compose 容器自动启动 → 等待两个服务均就绪：

1. 后端 就绪标志：`http://localhost:8088/health` 返回 `UP`
2. 模型服务 就绪标志：`http://localhost:5000/health` 返回 `ok`

> **Linux（默认）**：若部署时选择了注册 systemd，则容器自动启动；否则需手动执行 `docker compose up -d`
> **Windows（备用）**：Docker Desktop 和模型服务通过计划任务 `CottonRecognition_*` 自启

### 打开手机 App

1. 确保手机和电脑连接同一个 WiFi
2. 打开"棉花智能识别" App
3. 登录（初始账号由管理员创建）
4. 拍照或从相册选取棉花样本图片
5. 识别结果自动显示：颜色等级、杂质等级、面积比等

---

## 五、常见问题

### Q1：部署失败，提示"找不到 conda Python"（仅 Windows 备用方案）

这是 **Windows 备用路径**特有的问题（默认的 Linux 路径中模型服务跑在容器里，不依赖 conda）。
确认 Anaconda 安装在 `D:\aconda`。如果安装在其它路径，修改 `deploy-lan.ps1` 中的 `$condaPython` 变量。

### Q2：手机能 ping 通电脑，但 App 提示"连接失败"

1. 确认电脑防火墙放行了 8088 端口
2. 在手机浏览器打开 `http://<电脑IP>:8088/health` 测试
3. 如果浏览器能打开但 App 不行：进入 App 的 **我的 → 系统设置 → 服务器地址**，重新填写地址并点「保存并测试连接」，或点「自动搜索服务器」

### Q3：电脑 IP 变了怎么办？

使用通用版 APK 时**不需要重新打包**：

1. 在电脑上看新 IP：Linux 用 `hostname -I`，Windows 用 `ipconfig`
2. 在 App 内进入 **我的 → 系统设置 → 服务器地址**，填写新地址（或点「自动搜索服务器」）
3. 提示「设置成功」即可继续使用

> 如果希望地址长期不变，可在电脑上设置静态 IP（见第 3 步），属于可选项而非必须。

### Q4：模型推理一直失败或返回错误

查看模型服务日志（按部署路径二选一）：

```bash
# Linux（默认）：模型服务在容器里
docker compose logs --tail 50 model-service
```

```powershell
# Windows（备用）：模型服务是 conda 原生进程，看日志文件
Get-Content "<项目目录>\services\backend\model-service-python\model-service.log" -Tail 30
```

### Q5：如何查看后端日志？

```powershell
docker compose logs -f backend
```

---

## 六、维护与更新

> 本机联调（启动后端 + 模拟器/真机测试）参考 `docs/local-testing-guide.md`。

### 更新项目代码（如果从 Git 拉取）

```bash
cd <项目目录>            # 例如 /opt/cotton-recognition-assistant
git pull

# 通用（Windows 备用方案、或未使用 Linux 覆盖文件时）
docker compose up -d --build --no-deps backend

# Linux 部署机建议带上覆盖文件（deploy-lan.sh 部署时用的就是它）
docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d --build --no-deps backend
```

### 重新构建 APK

代码更新后重新出包（默认构建通用版，服务器地址在 App 内配置；在**装有 Android SDK 的机器**上执行，与部署机的操作系统无关）：

```powershell
.\build-apk-lan.ps1
```

> 电脑 IP 变化时**不需要**重新出包：在 App 的「系统设置 → 服务器地址」里改一次即可。

### 手动启动 / 停止服务

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务（共用电脑用完即停，释放内存 / GPU）
docker compose down

# 查看服务状态
docker compose ps
```

> 若部署时选择了注册开机自启，也可用 `sudo systemctl start|stop cotton-recognition.service` 控制。

---

## 七、附录：端口说明

| 端口 | 用途 | 是否对外开放 | 说明 |
|------|------|------------|------|
| 8088 | 后端 API | ✅ 是（局域网） | 手机访问后端 |
| 5000 | 模型推理 | ❌ 否 | 仅后端内部调用 |
| 3307 | MySQL | ❌ 否 | 仅本机 localhost 可连 |

---

*棉花智能识别系统 v1.0.0 · 部署日期: 2026 年 9 月*