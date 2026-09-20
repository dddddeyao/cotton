# 棉花识别助手

棉花识别助手是一个包含 Android App 和后端识别服务的项目。当前仓库按 monorepo 方式组织，移动端应用放在 `apps/`，后端服务放在 `services/`，共享素材和项目文档分别放在 `assets/`、`docs/`。

## 目录结构

```text
cotton-recognition-assistant/
  apps/
    android/                 # React Native / Expo Android 前端
  services/
    backend/                 # Spring Boot 后端，内含 Python 模型推理服务
      model-service-python/  # Flask / PyTorch 推理服务与模型资源
      src/                   # Spring Boot 源码
  assets/
    references/              # 鸿蒙端截图、设计参考图
  docs/
    deployment-guide.md      # 局域网部署与使用手册（默认 Linux，备用 Windows，面向交付）
    delivery-checklist.md    # 交付清单与现场验收清单（一页纸）
    deployment.md            # 服务器 / 公网 Docker 部署说明
    development.md           # 本地开发说明
    handoff.md               # 项目交接与开发进度说明
    on-site-quickcard.md     # 现场部署速查卡（一页纸，给非开发人员）
    local-testing-guide.md   # 本机联调与模拟器测试指南
    pre-deployment-checklist.md # 部署前检查清单
    pending-questions.md     # 待确认问题清单
    requirements.md          # Android 端需求文档
  tools/
    model/                   # 模型侧只读核对脚本（颜色级预处理是否与训练一致）
  deploy-lan.sh              # Linux 一键部署脚本（目标机默认）
  deploy-lan.ps1             # Windows 一键部署脚本（备用方案）
  undeploy-lan.sh            # Linux 一键卸载 / 恢复原状（共用电脑用）
  build-apk-lan.ps1          # 按局域网 IP 构建 APK
  docker-compose.yml         # 通用 Compose（Windows 备用方案直接用）
  docker-compose.linux.yml   # Linux 覆盖文件（默认目标机用，可选 GPU 加速）
```

## 子项目

| 子项目 | 路径 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| Android 前端 | `apps/android` | Expo + React Native + TypeScript | 面向 APK 交付，包含新闻、分类标准、智能识别、我的信息 |
| 后端服务 | `services/backend` | Spring Boot + MySQL + JWT | 提供认证、新闻、识别上传、识别历史等接口 |
| 模型服务 | `services/backend/model-service-python` | Flask + PyTorch | 由后端调用的棉花图像推理服务 |

## 本地运行

Android 前端：

```bash
cd apps/android
npm install
npm run start
```


后端 Spring Boot：

```bash
cd services/backend
./mvnw spring-boot:run
```

Windows PowerShell 可使用：

```bash
cd services/backend
.\mvnw.cmd spring-boot:run
```

Python 模型服务：

```bash
cd services/backend/model-service-python
python model_service2.py
```

模型服务启动前需准备以下权重文件：

```text
fourtime-best.pth          # 颜色识别，默认输出 11/21/31/41/51/61/71
fenge_best.pth             # 棉花区域分割
impurityarea_best.pth      # 杂质区域分割
```

兼容说明：如果现有棉花区域分割权重名为等价的 `cottonarea_best.pth`，可重命名为 `fenge_best.pth`，或通过模型服务环境变量 `COTTON_UNET_WEIGHTS` 配置为该文件。（2026-09-20 已用 SHA256 确认：作者包里的 `cottonarea_best.pth` 就是本仓库的 `fenge_best.pth`，`best.pth` 就是 `impurityarea_best.pth`，逐字节一致。）

> ⚠️ 颜色级分类的几何预处理**必须与训练一致**：默认 `Resize(256) + CenterCrop(224)`（环境变量 `COLOR_RESIZE_SIZE` 可覆盖）。历史版本曾默认 320，实测会明显掉精度与置信度。改动前请用 `tools/model/verify_color_pipeline.py` 在标注测试集上核对，依据与数据见 `docs/handoff.md` 第 20 节。

识别结果除原始等级和数值外，会返回这些图像字段：

```text
cottonMaskImage
impurityMaskImage
cottonOverlayImage
impurityOverlayImage
blackBackgroundImpurityOverlay
```

## 接口配置

- Android 可复制 `apps/android/.env.example` 为 `apps/android/.env.local` 并配置真实的 `EXPO_PUBLIC_API_BASE_URL`；真机联调或正式打包必须使用局域网 IP、服务器 IP 或域名。
- Spring Boot 容器内端口为 `8080`，对外通过 `BACKEND_PUBLIC_PORT` 映射（默认 `8088`）；Python Flask 推理服务默认端口为 `5000`。
- 根目录 `.env.example` 用于 Docker Compose，不会自动被 `apps/android` 的本地开发命令读取。

## 编译检查

```bash
cd apps/android && npm run typecheck
cd services/backend && ./mvnw test
```

## 出包（Android APK）

```powershell
.\build-apk-lan.ps1              # 通用版（推荐）：cotton-recognition.apk，地址在 App 内配置
.\build-apk-lan.ps1 -LanIP <IP>  # 专用版：cotton-recognition-<IP>.apk，开箱即用
```

Release 签名依次从 `apps/android/android/keystore.properties`（不提交）或 `COTTON_KEYSTORE_FILE` / `COTTON_KEYSTORE_PASSWORD` / `COTTON_KEY_ALIAS` / `COTTON_KEY_PASSWORD` 环境变量读取；两者都没有时回退到 debug 签名，仅用于本地调试。

## 部署

仓库已提供单机 Docker Compose 部署配置：

```bash
cp .env.example .env
docker compose up -d --build
```

默认部署后暴露后端 API，Android 端**在 App 内配置后端地址**（我的 → 系统设置 → 服务器地址），也可以直接点「自动搜索服务器」在局域网内自动发现。地址格式：

```text
http://服务器IP:8088
```

后端健康检查：

```text
http://服务器IP:8088/health
```

如果部署目标是一台局域网电脑，并希望同一网络下的 Android 端访问，请直接阅读面向交付的手册：

```text
docs/deployment-guide.md
```

目标部署机默认 **Linux**，用 `deploy-lan.sh` 一键完成部署、防火墙与开机自启配置；若现场只有 Windows 电脑，才用备用方案 `deploy-lan.ps1`。

## 当前核心结论

- App 名称：棉花识别助手
- 目标平台：Android
- 页面结构：前沿瞭望 / 分类标准 / 智能识别 / 我的信息
- 登录方式：账号密码 + JWT
- 分类标准：前端结构化写死，可离线查看
- 新闻：数据内置在 App 内（`src/data/newsData.ts`）并随安装包发布，离线可看；不请求后端接口
- 服务器地址：可在 App 内配置（含连接测试与局域网自动搜索），换电脑或换 IP 都无需重新打包
- 安装包：通用版 `cotton-recognition.apk`，Release 使用正式 keystore 签名（签名材料不入库）
- 智能识别：拍照或相册选择图片，上传后由后端转发模型服务识别；当前流程包含颜色识别、棉花区域分割和杂质区域分割

## 维护约定

- 应用代码只放在 `apps/` 和 `services/`。
- 构建产物、依赖目录、IDE 配置、上传文件和模型权重不提交到 Git。
- 大模型文件保留在本地或单独交付，仓库只维护代码、配置模板和运行说明。
