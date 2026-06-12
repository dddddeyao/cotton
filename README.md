# 棉花识别助手

棉花识别助手是一个包含 Android App、Web 管理/演示端和后端识别服务的项目。当前仓库按 monorepo 方式组织，前端应用放在 `apps/`，后端服务放在 `services/`，共享素材和项目文档分别放在 `assets/`、`docs/`。

## 目录结构

```text
cotton-recognition-assistant/
  apps/
    android/                 # React Native / Expo Android 前端
    web/                     # React + Vite Web 前端
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
    pending-questions.md     # 待确认问题清单
```

## 子项目

| 子项目 | 路径 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| Android 前端 | `apps/android` | Expo + React Native + TypeScript | 面向 APK 交付，包含新闻、分类标准、智能识别、我的信息 |
| Web 前端 | `apps/web` | React + TypeScript + Vite | 面向浏览器演示与管理，支持 mock 兜底和后端接口接入 |
| 后端服务 | `services/backend` | Spring Boot + MySQL + JWT | 提供认证、新闻、识别上传、识别历史等接口 |
| 模型服务 | `services/backend/model-service-python` | Flask + PyTorch | 由后端调用的棉花图像推理服务 |

## 本地运行

Android 前端：

```bash
cd apps/android
npm install
npm run start
```

Web 前端：

```bash
cd apps/web
npm install
npm run dev
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

## 接口配置

- Android 默认后端地址在 `apps/android/src/config.ts`。
- Web 可复制 `apps/web/.env.example` 为 `apps/web/.env.local` 并配置 `VITE_API_BASE_URL`。
- Spring Boot 默认端口为 `8080`，Python Flask 推理服务默认端口为 `5000`。

## 编译检查

```bash
cd apps/android && npm run typecheck
cd apps/web && npm run build
cd services/backend && ./mvnw test
```

## 部署

仓库已提供单机 Docker Compose 部署配置：

```bash
cp .env.example .env
docker compose up -d --build
```

默认部署后只暴露 Web/Nginx，浏览器访问：

```text
http://服务器IP/
```

后端 API 通过同域 `/api` 转发，例如：

```text
http://服务器IP/api/health
```

详细步骤见 `docs/deployment.md`。

## 当前核心结论

- App 名称：棉花识别助手
- 目标平台：Android、Web
- 页面结构：前沿瞭望 / 分类标准 / 智能识别 / 我的信息
- 登录方式：账号密码 + JWT
- 分类标准：前端结构化写死，可离线查看
- 新闻：优先缓存展示，后端刷新，前端保留 mock 兜底
- 智能识别：拍照或相册选择图片，上传后由后端转发模型服务识别

## 维护约定

- 应用代码只放在 `apps/` 和 `services/`。
- 构建产物、依赖目录、IDE 配置、上传文件和模型权重不提交到 Git。
- 大模型文件保留在本地或单独交付，仓库只维护代码、配置模板和运行说明。
