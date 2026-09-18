# 棉花智能识别系统 — 局域网部署与使用手册

> **面向用户**：海关现场工作人员 / IT 运维人员  
> **适用场景**：一台电脑（Windows 或 Linux）+ 一部 Android 手机，同一局域网内使用

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

> **操作系统选择**：本手册同时支持 Windows 10/11 和 Linux（Ubuntu 20.04+/CentOS 7+）
> 根据你的操作系统选择对应的部署章节。

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

#### Windows

| 软件 | 版本要求 | 安装说明 |
|------|---------|---------|
| Windows | 10 / 11 专业版或企业版 | 必须 |
| Docker Desktop | 4.x+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Anaconda / Miniconda | 2024+ | [anaconda.com](https://www.anaconda.com/download) |
| Git | 任意 | [git-scm.com](https://git-scm.com/)（用于拉取项目代码） |
| Android SDK | 34+ | 用于构建 APK |

#### Linux

| 软件 | 版本要求 | 安装命令 |
|------|---------|---------|
| Docker Engine | 24+ | `curl -fsSL https://get.docker.com \| sh` |
| docker compose | 插件版 | Docker Engine 24+ 自带 |
| Git | 任意 | `apt install git` 或 `yum install git` |
| GPU 驱动（可选） | NVIDIA | `nvidia-smi` 能正常输出即可 |
| nvidia-container-toolkit（可选） | 最新 | 见 [NVIDIA 官方文档](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) |

### 手机端要求

- Android 10 以上
- 已开启「允许安装未知来源应用」

### 网络要求

- 电脑和手机连接**同一个 WiFi**
- 电脑**没有启用"客户端隔离"**（公司 / 校园 Wi-Fi 常见，如果手机 ping 不通电脑则需改用手机热点）

---

## 三、部署步骤（20 ~ 30 分钟）

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

### 第 3 步：固定电脑 IP（推荐；共用电脑请跳过）

> **为什么推荐？** 如果 IP 是动态的，电脑重启后 IP 变了，手机上已装的 App 就再也连不上后端，需要重新打包安装。

> ⚠️ **如果这台电脑是共用的，请不要修改网络设置**（不要设静态 IP），以免影响他人上网。
> 此时改为「IP 变化后重新构建 APK」的方式即可（见常见问题 Q3）。

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

`deploy-lan.ps1` 执行完毕后，APK 文件位于：

```
e:\my-react-workspace\cotton-recognition-assistant\cotton-recognition-<当前IP>.apk
```

#### 方式 A：通过 USB 安装（推荐）

```powershell
adb install e:\my-react-workspace\cotton-recognition-assistant\cotton-recognition-*.apk
```

#### 方式 B：通过微信 / QQ 传输

1. 将 APK 文件发送到手机微信或 QQ
2. 在手机上点击文件 → 选择「用其他应用打开」→ 安装

#### 方式 C：通过浏览器下载

在手机浏览器中访问 `http://<电脑IP>:8088`（需后端提供文件下载接口）或通过 U 盘拷贝。

---

## ⚡ Linux 部署（替代上面的 Windows 步骤）

如果部署机是 Linux（Ubuntu / CentOS），使用 Bash 部署脚本。

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
| ② 检查 Docker + GPU | 验证 docker compose 和 NVIDIA |
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

# 模型服务健康检查
curl http://127.0.0.1:5000/health

# 查看所有容器状态
docker compose ps
```

### 获取 APK

脚本运行完毕后会输出类似以下内容：

```
后端地址: http://192.168.1.100:8088
```

**请将此 IP 告知开发人员**，开发人员会在本机运行以下命令重新构建 APK（需 Android SDK）：

```powershell
.\build-apk-lan.ps1 -LanIP 192.168.1.100
```

构建完成后将 APK 传给手机安装即可。

### 卸载 / 恢复原状（共用电脑用完请执行）

```bash
chmod +x /opt/cotton-recognition-assistant/undeploy-lan.sh
sudo /opt/cotton-recognition-assistant/undeploy-lan.sh
```

该脚本会：停止并删除本项目容器、移除开机自启服务、移除防火墙放行规则；
**不会**删除源码、`.env` 和模型文件（如需彻底删除请手动 `rm -rf` 项目目录）。

---

## 四、日常使用流程

### 开机后等待约 60 秒

电脑开机 → 系统启动 → Docker 自动运行 → docker compose 容器自动启动 → 等待两个服务均就绪：

1. 后端 就绪标志：`http://localhost:8088/health` 返回 `UP`
2. 模型服务 就绪标志：`http://localhost:5000/health` 返回 `ok`

> **Windows**：Docker Desktop 和模型服务通过计划任务 `CottonRecognition_*` 自启
> **Linux**：若部署时选择了注册 systemd，则容器自动启动；否则需手动执行 `docker compose up -d`

### 打开手机 App

1. 确保手机和电脑连接同一个 WiFi
2. 打开"棉花智能识别" App
3. 登录（初始账号由管理员创建）
4. 拍照或从相册选取棉花样本图片
5. 识别结果自动显示：颜色等级、杂质等级、面积比等

---

## 五、常见问题

### Q1：部署失败，提示"找不到 conda Python"

确认 Anaconda 安装在 `D:\aconda`。如果安装在其它路径，修改 `deploy-lan.ps1` 中的 `$condaPython` 变量。

### Q2：手机能 ping 通电脑，但 App 提示"连接失败"

1. 确认电脑防火墙放行了 8088 端口
2. 在手机浏览器打开 `http://<电脑IP>:8088/health` 测试
3. 如果浏览器能打开但 App 不行，说明 APK 中编译的 IP 地址不正确 → 重新运行 `.\build-apk-lan.ps1` 并安装新 APK

### Q3：电脑 IP 变了怎么办？

如果 DHCP 导致 IP 变化：

1. `ipconfig` 查看新 IP
2. 在电脑上重新运行部署脚本：
   ```powershell
   .\deploy-lan.ps1 -LanIP <新IP>
   ```
3. 手机重新安装新生成的 APK

### Q4：模型推理一直失败或返回错误

查看模型服务日志：

```powershell
Get-Content "e:\my-react-workspace\cotton-recognition-assistant\services\backend\model-service-python\model-service.log" -Tail 30
```

### Q5：如何查看后端日志？

```powershell
docker compose logs -f backend
```

---

## 六、维护与更新

### 更新项目代码（如果从 Git 拉取）

```powershell
cd e:\my-react-workspace\cotton-recognition-assistant
git pull
docker compose up -d --build --no-deps backend
```

### 重新构建 APK

当电脑 IP 变化或代码更新后：

```powershell
.\build-apk-lan.ps1
```

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