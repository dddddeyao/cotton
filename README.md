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
    icons/                   # App 图标、启动页图标
    references/              # 鸿蒙端截图、设计参考图
    standards/               # 分类标准图片、表格、资料
  docs/
    requirements.md          # Android 端需求文档
    deployment.md            # 服务器 Docker 部署说明
    lan-quick-start.md       # 局域网快速启动
    lan-deployment.md        # 局域网完整部署说明
    pre-deployment-checklist.md # 部署前检查清单
    pending-questions.md     # 待确认问题清单
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

兼容说明：如果现有棉花区域分割权重名为等价的 `cottonarea_best.pth`，可重命名为 `fenge_best.pth`，或通过模型服务环境变量 `COTTON_UNET_WEIGHTS` 配置为该文件。

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
- Spring Boot 默认端口为 `8080`，Python Flask 推理服务默认端口为 `5000`。
- 根目录 `.env.example` 用于 Docker Compose，不会自动被 `apps/android` 的本地开发命令读取。

## 编译检查

```bash
cd apps/android && npm run typecheck
cd services/backend && ./mvnw test
```

## 部署

仓库已提供单机 Docker Compose 部署配置：

```bash
cp .env.example .env
docker compose up -d --build
```

默认部署后暴露后端 API，Android 端直接配置后端地址：

```text
http://服务器IP:8080
```

后端健康检查：

```text
http://服务器IP:8080/health
```

详细步骤见 `docs/deployment.md`。

如果部署目标是一台局域网电脑，并希望同一网络下的 Android 端访问，请优先阅读：

```text
docs/lan-quick-start.md
docs/lan-deployment.md
docs/pre-deployment-checklist.md
```

## 当前核心结论

- App 名称：棉花识别助手
- 目标平台：Android
- 页面结构：前沿瞭望 / 分类标准 / 智能识别 / 我的信息
- 登录方式：账号密码 + JWT
- 分类标准：前端结构化写死，可离线查看
- 新闻：优先显示缓存，随后通过后端接口刷新；后端不可用时不生成本地替代新闻
- 智能识别：拍照或相册选择图片，上传后由后端转发模型服务识别；当前流程包含颜色识别、棉花区域分割和杂质区域分割

## 维护约定

- 应用代码只放在 `apps/` 和 `services/`。
- 构建产物、依赖目录、IDE 配置、上传文件和模型权重不提交到 Git。
- 大模型文件保留在本地或单独交付，仓库只维护代码、配置模板和运行说明。
