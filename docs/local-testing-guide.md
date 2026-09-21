# 本机联调与模拟器测试指南（Windows）

> 目标：在本机启动后端与模型服务，然后通过 Android Studio / 命令行模拟器验证 App 能否正常连接。
> 适用版本：v1.1.0（通用版 APK，服务器地址在 App 内配置）
>
> **两种场景，先确认自己属于哪一种：**
>
> | 场景 | 后端位置 | 看哪一节 |
> |---|---|---|
> | **A** | 后端跑在**本机** | 第二节 → 第三节 |
> | **B** | 后端跑在**另一台电脑**（常用 FinalShell/SSH 远程启动） | 第二节·B → 第三节 |

---

## 一、前置检查

| 项 | 检查方式 | 期望 |
|---|---|---|
| Docker Desktop | 托盘图标 / 打开 Docker Desktop | 显示 **Engine running**（**只有场景 A「后端在本机」才需要**；未启动时任何 `docker` 命令都会报 `cannot find the file specified`） |
| 模型权重 | `services/backend/model-service-python/*.pth` | 存在 `fourtime-best.pth`(≈90MB)、`fenge_best.pth`(≈118MB)、`impurityarea_best.pth`(≈118MB) |
| conda 环境 | `D:\aconda\envs\YOLO\python.exe` | 存在（`model-service-start.cmd` 使用它） |
| 环境变量文件 | 项目根目录 `.env` | 已存在且 `JWT_SECRET` 非空（本机已配置） |
| 模拟器 | `E:\Android\emulator\emulator.exe -list-avds` | 出现 `Pixel_6` |

---

## 二、启动后端（2 个服务）

### 1) MySQL + Spring Boot（Docker）

```powershell
cd e:\my-react-workspace\cotton-recognition-assistant
docker compose up -d --build mysql backend
docker compose ps
```

期望输出：`mysql` 与 `backend` 都是 `healthy`。首次 `--build` 需要几分钟。

> 端口：后端对外 `8088`（容器内 8080）；MySQL 仅绑定本机 `127.0.0.1:3307`。
> 不要把 `model-service` 容器一起 up：本机方案是模型服务跑在宿主机上以使用 GPU。

### 2) 模型推理服务（宿主机）

```powershell
e:\my-react-workspace\cotton-recognition-assistant\model-service-start.cmd
```

该脚本会用 `D:\aconda\envs\YOLO\python.exe` 启动 `model_service2.py`（端口 5000），日志追加写入
`services\backend\model-service-python\model-service.log`。**保持该窗口开着**，关闭窗口即停止服务。

### 3) 验证两个服务

```powershell
curl http://127.0.0.1:8088/health    # 期望 {"code":200,...,"status":"ok"}
curl http://127.0.0.1:5000/health    # 期望 ok
```

> ⚠️ 注意：`/health` 通只代表后端起来了；真正的识别还要等模型服务就绪（首次加载权重约 20~60 秒）。

### 常用排障

```powershell
docker compose logs -f backend
Get-Content .\services\backend\model-service-python\model-service.log -Tail 40
```

---

---

## 二·B、场景 B：后端在另一台电脑（FinalShell / SSH 远程）

> 本机只负责跑模拟器与 App；Docker、MySQL、模型服务全部在**那台电脑**上，本机**不需要**启动 Docker。

### 1) 在远程电脑上启动后端（通过 FinalShell 登录后执行）

```bash
cd /opt/cotton-recognition-assistant          # 换成实际部署路径
# 默认目标机是 Linux：模型服务也在容器里，三件套一起起
docker compose up -d --build                  # 无 NVIDIA GPU（CPU 模式）
docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d --build   # 有 NVIDIA GPU
docker compose ps                             # 期望 mysql / model-service / backend 都是 healthy
```

如果是**首次部署**那台机器，直接用现成脚本更省事：

```bash
chmod +x deploy-lan.sh && sudo ./deploy-lan.sh
```

模型服务在远程电脑上的启动方式：**Linux（默认）就是容器**（上面的 compose 命令或 `deploy-lan.sh` 已经把它起起来了，不需要手工跑 Flask）；**Windows 备用机**才用 `.\model-service-start.cmd`（conda 原生进程）。

### 2) 记下远程电脑的局域网 IP

```bash
hostname -I     # Linux
ipconfig        # Windows
```

例如得到 `192.168.1.123`，那么 App 内应填 `http://192.168.1.123:8088`。

### 3) 在远程电脑上自检

```bash
curl http://127.0.0.1:8088/health     # {"code":200,...,"status":"ok"}
curl http://127.0.0.1:5000/health     # ok（仅「有 GPU」模式；CPU 模式不映射 5000 端口，改看 docker compose ps 的 healthy）
```

### 4) 在**本机**确认能访问到那台电脑

```powershell
curl http://192.168.1.123:8088/health
```

- **通了** → 进入第三节，App 内填 `http://192.168.1.123:8088`
- **不通** → 按顺序排查：
  1. 两台电脑是否在同一局域网（先 `ping 192.168.1.123`）
  2. 远程电脑防火墙是否放行 TCP 8088（Linux `deploy-lan.sh` 会自动加；Windows 用 `New-NetFirewallRule`）
  3. 远程电脑是否开了 VPN / 代理，或所在 Wi-Fi 有「客户端隔离」

> ⚠️ **最容易踩的坑**：后端在别的电脑时，App 里**不能填 `10.0.2.2`**。
> `10.0.2.2` 仅在"后端跑在本机"的场景下代表宿主机。

---

## 三、模拟器测试

### 方式 A（推荐，最接近现场）：安装正式签名的通用版 APK

```powershell
# 1) 出包（若根目录已存在 cotton-recognition.apk 可跳过，构建约 3~8 分钟）
cd e:\my-react-workspace\cotton-recognition-assistant
.\build-apk-lan.ps1

# 2) 启动模拟器
& 'E:\Android\emulator\emulator.exe' -avd Pixel_6 -no-snapshot-load -no-audio -gpu swiftshader_indirect

# 3) 安装
& 'E:\Android\platform-tools\adb.exe' install -r .\cotton-recognition.apk
# 若之前装过 1.0.0（调试签名）版本，必须先卸载：
# & 'E:\Android\platform-tools\adb.exe' uninstall com.customs.cottonrecognition
```

**首次打开会自动搜索服务器**（App 内还没保存过地址时）：启动页结束后显示「正在连接服务器…」，找到即自动保存并进入主界面，**不需要手填 IP**；没找到则显示「未找到服务器」，按 **8/15/30/60 秒自动重试**，也可点「重新搜索」；要手动指定就点「手动填写地址」，或走下面第 1~2 步。

要在模拟器/真机上**复现首次流程**（会清掉已保存地址与登录态）：

```powershell
adb shell pm clear com.customs.cottonrecognition
```

也可以在 App 内手动配置服务器地址：

1. 底部 **我的** → **系统设置** → **服务器地址**
2. 填写服务器地址 → 点「保存并测试连接」
   - **后端在本机（场景 A）**：填 `http://10.0.2.2:8088`。模拟器里 `10.0.2.2` 才是宿主机，填 `127.0.0.1` 会失败
   - **后端在另一台电脑（场景 B）**：填 `http://<那台电脑的IP>:8088`，例如 `http://192.168.1.123:8088`
   - 也可以点「自动搜索服务器」：它会扫描手机自身所在 /24 网段的 8088 端口；场景 A 下模拟器 IP 是 `10.0.2.15`，能命中 `10.0.2.2`
3. 提示「设置成功」后，登录 → 选图/拍照识别 → 检查识别记录、新闻、设置、协议页

### 方式 B：Android Studio 直接 Run

1. Android Studio → **Open** → 选择内层原生工程目录 `apps\android\android`（不是 `apps\android`）
2. 等 Gradle Sync 完成后，左下角 **Build Variants** 把 `app` 选为 **release**
   - release 变体自带 JS bundle，直接可跑；
   - 若用 `debug` 变体，需要先启动 Metro（`cd apps\android` → `npx expo start` 或 `npx expo run:android`），否则白屏
3. 启动 `Pixel_6` 模拟器 → 点 Run ▶（release 会用正式签名，签名材料来自 `apps\android\android\keystore.properties`）
4. 安装后同样在 App 内设置 `http://10.0.2.2:8088`

### 模拟器取测试图片

```powershell
$adb = 'E:\Android\platform-tools\adb.exe'

# App 选图走的是系统相册（MediaStore），所以图片必须放到相册能索引到的目录；
# 放 /data/local/tmp 的图在 App 的「相册」里根本选不到。
# 单张：Android 13 实测 push 完即自动入库，不需要任何额外扫描命令
& $adb push 'C:\Photos\cotton-1.jpg' /sdcard/Pictures/cotton-1.jpg

# 批量导入整个文件夹（顺带重命名成 ASCII，避免中文文件名在 adb 里出问题）
$i = 0
Get-ChildItem 'C:\Photos\cotton' -Filter *.jpg -File | ForEach-Object {
  $i++
  & $adb push $_.FullName ('/sdcard/Pictures/cotton-{0:d2}.jpg' -f $i)
}

# 核对是否已入库（能看到 relative_path=Pictures/ 的行即可）
& $adb shell content query --uri content://media/external/images/media --projection _display_name:relative_path
```

> 目录怎么选（`/sdcard` 就是 `/storage/emulated/0`）：
>
> | 目录 | 相册里显示在 | 说明 |
> |---|---|---|
> | `/sdcard/Pictures/` | 相册 → 图片 | **推荐**，本机 Android 13 实测 push 后立刻可见 |
> | `/sdcard/DCIM/Camera/` | 相册 → 相机 | 想模拟「相机拍的照片」时用 |
> | `/sdcard/Download/` | 相册 → 下载 | 把文件**拖进模拟器窗口**默认就落这里（同样会被收录） |
>
> 清理：`& $adb shell rm /sdcard/Pictures/cotton-01.jpg` —— **文件删掉后相册条目会自动消失**（本机实测）；批量清理可 `& $adb shell rm /sdcard/Pictures/*.jpg`。
>
> 兜底扫描命令（本机 Android 13 实测一般用不上；该版本**没有** `adb shell cmd media scan` 这个服务）：
> `& $adb shell content call --uri content://media/ --method scan_volume --arg external_primary`

### 模拟器常见问题

| 现象 | 处理 |
|---|---|
| 模拟器窗口被挡住 | `Alt+Tab` 切到 `Android Emulator - Pixel_6:5554` |
| 画面卡顿 | 换 `-gpu host`（本机默认用软件渲染 `swiftshader_indirect` 更稳但慢） |
| App 提示连接失败 | 先在宿主 PowerShell 确认 `curl http://127.0.0.1:8088/health` 正常；再确认 App 内地址是 `10.0.2.2:8088`；最后确认模型服务窗口还开着 |
| 识别超时 | 检查模型服务日志；首次推理要加载权重，耐心等一次 |

---

## 四、真机测试（与电脑同一 WiFi）

1. 查本机局域网 IP：`ipconfig`
2. 手机安装 `cotton-recognition.apk`
3. App 内填 `http://<本机IP>:8088` 或点「自动搜索服务器」
4. 防火墙需放行 8088：`.\deploy-lan.ps1` 会自动添加；也可手动
   `New-NetFirewallRule -DisplayName "Cotton Backend 8088" -Direction Inbound -Protocol TCP -LocalPort 8088 -Action Allow`

---

## 五、测试结束收尾

```powershell
cd e:\my-react-workspace\cotton-recognition-assistant
docker compose down          # 释放内存 / CPU / GPU（共享电脑务必执行）
```

模型服务窗口直接 `Ctrl+C` 或关闭窗口即可。