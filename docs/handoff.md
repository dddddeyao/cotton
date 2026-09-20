# 棉花识别助手 · 项目总览与交接说明

> 用途：项目全貌盘点 + 当前进度 + 换开发工具时的交接底稿
> 更新时间：2026-09-20（v1.1.0：恢复「App 内配置服务器地址」、启用正式签名、修正新闻实现说明、颜色级参考图改为本地内置）
> 说明：本文只描述仓库里**真实存在**的内容；未完成、未验证、有风险的部分单独标注，不做美化。

---

## 0. 一句话概括

一个 monorepo：**Android App（Expo + React Native）** + **Spring Boot 后端** + **Flask/PyTorch 模型服务**。
目标场景：把整套系统部署到一台局域网电脑（实验室/海关现场），工作人员手机装一个 APK，连同一个 WiFi 就能拍照识别棉花等级。

---

## 1. 仓库与版本状态

| 项 | 值 |
|---|---|
| 远程仓库 | `https://github.com/dddddeyao/cotton.git`（注意：本地 `origin/main` 跟踪分支已失效，远端分支被删除或改名） |
| 基线提交 | `07465cf` (2026-09-18) revert(android): 回滚 App 内配置服务器地址的改动，改为文档记录方案 |
| 本次改动 | 尚未提交（版本 1.1.0）：恢复服务器地址配置、启用正式签名、补启动页、同步文档，详见第 14 节 |
| 工作区状态 | 改动均未提交；本文档 `docs/handoff.md` 本身也仍是未跟踪文件（untracked） |

### 提交历史关键节点

```text
07465cf 2026-09-18  revert(android): 回滚 App 内配置服务器地址的改动，改为文档记录方案
7a7df7a 2026-09-18  Revert "feat(android): 服务器地址支持在 App 内配置与自动搜索"
8696093 2026-09-18  feat(android): 服务器地址支持在 App 内配置与自动搜索（已回滚，方案留档）
a0f6823 2026-09-18  build: Docker 构建改用国内镜像源，避免国际网络超时卡死
768c374 2026-09-18  fix: Docker 未配置 nvidia runtime 时自动回退 CPU
70291f6 2026-09-18  chore: 跨平台部署脚本、共用电脑安全化、端口统一与仓库清理
78a16ff 2026-07-07  feat: improve news feed and deployment readiness
3e2a8ff 2026-07-06  Prepare LAN deployment
4b8c80a 2026-06-15  搞定
b6d9dc9 2026-06-11  feat: init full-stack cotton recognition project
```

> ⚠️ 接手第一件事：`git status` 会看到那个未提交的 PNG，确认后提交或丢弃。

---

## 2. 系统架构

```text
┌──────────────────────────────────────────────────────┐
│  部署机 / 服务器（Linux 或 Windows）                    │
│                                                       │
│   Docker Compose                                      │
│   ┌──────────┐   ┌─────────────┐   ┌──────────────┐  │
│   │  MySQL   │◄─►│  Backend    │──►│ 模型服务      │  │
│   │  3307    │   │ Spring Boot │   │ Flask/PyTorch│  │
│   │(仅本机)   │   │ 8080→8088   │   │   5000       │  │
│   └──────────┘   └──────┬──────┘   └──────────────┘  │
└──────────────────────────┼───────────────────────────┘
                           │ HTTP，局域网
                  ┌────────▼────────┐
                  │  Android 手机    │
                  │  APK（IP 内置）   │
                  └─────────────────┘
```

**端口约定**

| 端口 | 服务 | 对外 | 说明 |
|---|---|---|---|
| 8088 | 后端 API | ✅ 局域网 | 手机访问的唯一入口 |
| 8080 | 后端容器内端口 | ❌ | 被映射成 8088 |
| 5000 | 模型推理服务 | ❌ | 仅后端内部调用 |
| 3307 | MySQL | ❌ | 仅本机 localhost |

---

## 3. 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| Android 前端 | Expo + React Native + TypeScript | Expo `~56.0.6`、RN `0.85.3`、React `19.2.3`、TS `~6.0.3` |
| 关键原生依赖 | expo-image-picker、expo-dev-client、async-storage | — |
| 后端 | Spring Boot + MySQL + JWT | Java（`com.example.springbootpythonml`） |
| 模型服务 | Flask + PyTorch | 见 `requirements.txt` |
| 部署 | Docker Compose | `docker-compose.yml` + `docker-compose.linux.yml` |
| 构建产物 | Android APK | 包名 `com.customs.cottonrecognition`，`versionName 1.0.0`，`minSdk 24` / `targetSdk 36` |

---

## 4. 目录结构

```text
cotton-recognition-assistant/
├── apps/android/                     # Android 前端（Expo / RN）
│   ├── App.tsx                       # 根组件 + 路由
│   ├── src/
│   │   ├── screens/                  # 11 个页面
│   │   │   ├── LaunchScreen.tsx              # 启动页
│   │   │   ├── NewsScreen.tsx                # 前沿瞭望（新闻列表）
│   │   │   ├── NewsDetailScreen.tsx          # 新闻详情
│   │   │   ├── StandardsScreen.tsx           # 分类标准
│   │   │   ├── RecognitionScreen.tsx         # 图像检测（拍照/选图）
│   │   │   ├── RecognitionResultScreen.tsx   # 识别结果
│   │   │   ├── RecognitionHistoryScreen.tsx  # 识别记录
│   │   │   ├── ProfileScreen.tsx             # 我的信息
│   │   │   ├── EditProfileScreen.tsx         # 编辑资料
│   │   │   ├── SettingsScreen.tsx            # 应用设置
│   │   │   └── SimplePage.tsx                # 协议/隐私等占位页
│   │   ├── components/               # TabShell / RecognitionReport / ImagePreviewModal / common
│   │   ├── services/                 # api / http / newsImages / newsPolicy / normalizers / recognitionImages
│   │   ├── data/                     # newsData / standardsData（写死的离线数据）
│   │   ├── storage/cache.ts          # 本地缓存
│   │   ├── utils/                    # format / safeArea
│   │   ├── config.ts / theme.ts / types.ts
│   │   └── assets/news/              # 新闻配图
│   ├── android/                      # 原生工程（gradlew、build.gradle 等）
│   └── .env.local                    # 当前后端地址（gitignore）
│
├── services/backend/                 # Spring Boot 后端
│   ├── src/main/java/com/example/springbootpythonml/
│   │   ├── controller/               # Auth / News / Recognition / User / Upload / Health
│   │   ├── service/                  # Auth / NewsCrawler / NewsKeywordPolicy / Recognition / UserProfile
│   │   ├── security/                 # JwtAuthFilter / JwtUtil
│   │   ├── entity/  repository/  dto/  config/
│   ├── model-service-python/         # Flask + PyTorch 模型服务
│   │   ├── model_service2.py         # 服务入口
│   │   ├── unet.py                   # 网络结构
│   │   ├── class_labels.txt
│   │   └── *.pth                     # 模型权重（gitignore，需单独传）
│   ├── Dockerfile / pom.xml / mvnw
│
├── docs/                             # 文档
│   ├── requirements.md               # 需求文档 v1.0
│   ├── development.md                # 本地开发
│   ├── deployment.md                 # 服务器/公网 Docker 部署
│   ├── deployment-guide.md           # ⭐ 面向交付的局域网部署与使用手册
│   ├── pre-deployment-checklist.md   # 部署前检查清单
│   ├── pending-questions.md          # 待确认问题清单
│   ├── server-address-in-app-plan.md # 已回滚功能的方案留档
│   └── handoff.md                    # 本文档
│
├── datasets/cotton-images/           # 数据集（GBIF 棉属图片 + manifest.csv）
├── assets/references/                # 鸿蒙端截图等设计参考
│
├── deploy-lan.ps1                    # Windows 一键部署
├── deploy-lan.sh                     # Linux 一键部署
├── undeploy-lan.sh                   # Linux 一键卸载/恢复原状
├── build-apk-lan.ps1                 # 按指定 IP 构建 Release APK
├── docker-compose.yml                # 通用 Compose
├── docker-compose.linux.yml          # Linux Compose（可选 GPU）
├── model-service-start.cmd           # Windows 下模型服务启动
├── .env.example / .env.lan.example   # 配置模板
└── README.md
```

---

## 5. 功能实现状态

| 模块 | 状态 | 说明 |
|---|---|---|
| 前沿瞭望（新闻） | ✅ 已实现 | **新闻数据写死在前端**（`src/data/newsData.ts`，配图在 `assets/news/`），不请求后端、可离线浏览；刷新只是重新载入同一份固定顺序的数据 |
| 分类标准 | ✅ 已实现 | 内容前端写死（`data/standardsData.ts`），**可离线查看** |
| 图像检测 | ✅ 已实现 | 拍照 / 相册选图 → 上传 → 后端转模型服务 → 结果页；未登录也可识别 |
| 识别结果页 | ✅ 已实现 | 原图 + 颜色等级 / 杂质等级 / 棉花面积 / 面积比 / 置信度 + 分割叠加图 |
| 识别记录 | ✅ 已实现 | 登录后拉 `/recognition/history`；支持全选、批量删除 |
| 我的信息 | ✅ 已实现 | 登录 / 注册 / 编辑资料 / 应用设置 / 协议 / 隐私 / 客服电话 |
| 我的收藏 | 🟡 仅占位 | 页面保留，显示"暂无收藏内容"，**第一版不做业务** |
| 用户协议 / 隐私政策 | 🟡 仅占位 | `SimplePage.tsx` 占位页 |
| App 内配置服务器地址 | ✅ 已恢复（v1.1.0） | 设置页新增「服务器地址」：手动填写 + 连接测试 + 局域网自动搜索（依赖 `expo-network`）；解析顺序为「App 内保存值 → 打包默认值 → 引导页」，实现见 `src/services/serverConfig.ts` |

---

## 6. 后端接口清单

统一响应格式：

```json
{ "code": 200, "message": "success", "data": {} }
```

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/health` | 否 | 健康检查 |
| POST | `/auth/login` | 否 | 登录，返回 token |
| POST | `/auth/register` | 否 | 注册（username / password） |
| POST | `/auth/logout` | 是 | 无状态，前端清本地会话 |
| POST | `/auth/change-password` | 是 | 修改密码 |
| GET | `/user/profile` | 是 | 获取资料 |
| PUT | `/user/profile` | 是 | 更新资料 |
| GET | `/news` | 否 | 新闻列表 |
| GET | `/news/{id}` | 否 | 新闻详情 |
| POST | `/recognition` | **否** | 图片识别（multipart，字段名 `file`） |
| POST | `/recognition/base64` | 否 | Base64 方式识别 |
| GET | `/recognition/history` | 是 | 识别历史 |
| DELETE | `/recognition/history` | 是 | 批量删除，body `{ ids: number[] }` |
| POST | `/api/v1/upload` | — | 兼容旧入口 |

Token 请求头：`Authorization: Bearer <token>`

识别返回的图像字段：

```text
cottonMaskImage / impurityMaskImage / cottonOverlayImage
impurityOverlayImage / blackBackgroundImpurityOverlay
```

---

## 7. 模型权重

**这三个 `.pth` 被 `.gitignore` 排除，必须单独传**（U 盘 / scp），共约 327 MB：

| 文件 | 大小 | 用途 |
|---|---|---|
| `fourtime-best.pth` | 90.0 MB | 颜色识别，输出 11/21/31/41/51/61/71 |
| `fenge_best.pth` | 118.5 MB | 棉花区域分割（等价于 `cottonarea_best.pth`） |
| `impurityarea_best.pth` | 118.5 MB | 杂质区域分割 |

放在 `services/backend/model-service-python/` 下。可用环境变量 `COTTON_UNET_WEIGHTS` 覆盖分割权重路径。

---

## 8. 部署与运行现状（已实测）

### 8.1 服务器后端 —— **已在运行**

| 项 | 值 |
|---|---|
| 服务器 | `192.168.1.123`（`ubuntu-System-Product-Name.local`） |
| 本机 | `192.168.1.156`，与服务器同一局域网 |
| 健康检查 | `GET http://192.168.1.123:8088/health` → `{"code":200,"message":"success","data":{"status":"ok"}}` |
| 登录接口 | `POST /auth/login` 返回业务响应（非 5xx） |
| 识别接口 | `POST /recognition` 返回 HTTP 200 及真实分级结果 |
| SSH | 22 端口开放 |

结论：**Spring Boot + MySQL + Flask 模型服务三者都在跑，无需重新启动。**

### 8.2 本机 Android 环境

| 项 | 值 |
|---|---|
| Android SDK | `E:\Android`（`ANDROID_HOME`） |
| adb | `E:\Android\platform-tools\adb.exe` |
| 模拟器 | `E:\Android\emulator\emulator.exe`，AVD = `Pixel_6`（Android 13 / API 33，1080×2400） |
| 已装 App | `com.customs.cottonrecognition` v1.0.0（当前为 Release APK） |

### 8.3 APK 地址来源（v1.1.0 起支持运行时可配置）

打包时的默认地址仍来自编译期内联：

```text
apps/android/.env.local
  EXPO_PUBLIC_API_BASE_URL=                            # 通用版：留空
  EXPO_PUBLIC_API_BASE_URL=http://192.168.1.123:8088   # 专用版：由 -LanIP 写入
```

但 v1.1.0 起，App 会**优先使用用户在 App 内保存的地址**（AsyncStorage 键 `cotton.server.baseUrl`）：

```text
App 内保存的地址 → 打包默认值 → 两者都没有时进入「服务器地址」引导页
```

因此 **换电脑、换 IP 都不需要重新打包**：在 App 的「我的 → 系统设置 → 服务器地址」改一次，或点「自动搜索服务器」（同一 /24 网段约 3~8 秒）。

出包方式：

```powershell
.\build-apk-lan.ps1                  # 通用版 cotton-recognition.apk（推荐，一次打包到处用）
.\build-apk-lan.ps1 -LanIP <IP>      # 专用版 cotton-recognition-<IP>.apk（开箱即用，换 IP 需重打）
```

---

## 9. 常用命令速查

```powershell
# 构建 APK（必填 -LanIP）
.\build-apk-lan.ps1 -LanIP 192.168.1.123

# 装到模拟器/手机
& 'E:\Android\platform-tools\adb.exe' install -r .\cotton-recognition-192.168.1.123.apk

# 启动模拟器
& 'E:\Android\emulator\emulator.exe' -avd Pixel_6 -no-snapshot-load -no-audio -gpu swiftshader_indirect

# 前端类型检查
cd apps\android ; npm run typecheck

# 后端测试
cd services\backend ; .\mvnw.cmd test
```

```bash
# 服务器侧（Linux，在项目目录下）
sudo docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d
docker compose ps
docker compose logs -f backend
curl http://127.0.0.1:8088/health

# 一键部署 / 卸载
sudo ./deploy-lan.sh
sudo ./undeploy-lan.sh
```

---

## 10. 已完成 / 已验证

- ✅ 三个子项目全部可运行，本地开发链路打通
- ✅ 后端全部接口可用（登录 / 新闻 / 识别 / 历史 / 用户资料）
- ✅ 模型推理真实可用，返回分级 + 分割结果
- ✅ 跨平台部署脚本（Windows PowerShell + Linux Bash）完成，端口统一为 8088
- ✅ 共用电脑安全化：不改网络配置、不改变防火墙开关、自启默认关闭、提供一键卸载
- ✅ Docker 构建改用国内镜像源；无 nvidia runtime 时自动回退 CPU
- ✅ 仓库清理：删除冗余图片与重复权重（约 92 MB），统一 `.gitignore`
- ✅ 文档体系：需求 / 开发 / 部署 / 交付手册 / 检查清单 / 待确认清单
- ✅ **模拟器端到端验证通过**（2026-09-18）：
  - 登录页提交 → 服务端返回「用户名或密码错误」→ 证明 App↔服务器链路通
  - 导入棉花样本 → 开始检测 → 返回真实结果：**颜色等级 2、杂质等级 1、棉花面积 80.44%、面积比 0.04%、置信度 36.58%**，并显示棉花/杂质区域分割图
  - 识别记录页可查到该条记录
- ✅ **v1.1.0（2026-09-20）本次改动**：
  - 恢复「App 内配置服务器地址」（`git cherry-pick -n 8696093` 后复核）+ 连接测试 + 局域网自动搜索
  - Release 包改用**正式签名**：keystore 位于 `E:\cotton-release-keys\cotton-release.keystore`，口令见同目录 `README-签名材料-务必妥善保管.txt`（均不入库）
  - 补齐原生启动页（白底 + 居中 logo，含 Android 12+ 与旧版两套配置）
  - 用户协议 / 隐私政策改为条款式正文
  - 版本号：`versionCode 2` / `versionName 1.1.0`
  - 已通过 `npm run typecheck`；APK 构建与真机回归见第 14 节

---

## 11. 未完成 / 待确认 / 已知问题

### 11.1 阻塞交付的问题

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| 1 | ~~Release 包用的是 debug 签名~~ → **v1.1.0 已解决**：`build.gradle` 增加 `signingConfigs.release`，口令读取不入库的 `keystore.properties` | 已消除 | 交付时把 keystore 备份与口令说明一并交给使用方 |
| 2 | **测试账号说明缺失** | 需求文档要求的交付物之一 | 部署后创建账号并记录（模板见 `docs/delivery-checklist.md`） |
| 3 | 模型权重不在 Git 里 | 新机器 clone 后跑不起来 | 随部署包一起传（327 MB） |
| 4 | 工作区有 1 个未提交的 PNG 修复；v1.1.0 全部改动也未提交 | 状态不干净 | 复核后一次性提交（注意本地 `origin/main` 已失效） |

### 11.2 功能缺口

- 我的收藏：仅占位页，无业务
- 用户协议 / 隐私政策：占位页，无正式内容
- 新闻来源维护方式未定（是否要后台录入 / 定时同步）
- 识别失败文案、客服排查入口未定稿
- 未登录识别记录是否会同步到账号，未实现
- Windows 侧缺少 `undeploy-lan.ps1`（只有 Linux 版卸载脚本）

### 11.3 待业务确认（详见 `docs/pending-questions.md`，共 14 条）

- token 过期后是否需要 refresh token
- 识别结果是否要补充更多字段（叶屑等级、检测框、人工复核状态等）
- 是否允许前端上传前压缩图片
- App 图标 / 启动页是否用当前素材还是正式设计稿
- 主要测试机型、Android 最低版本、上架渠道

### 11.4 环境风险

- **模拟器窗口容易被最大化窗口挡住**：屏幕仅 1707×1067，VS Code / 浏览器最大化时会把模拟器窗口压在下面，需要用 `Alt+Tab` 切到 `Android Emulator - Pixel_6:5554`
- 模拟器当前用 `-gpu swiftshader_indirect`（软件渲染），画面与点击响应偏慢；如需流畅可改 `-gpu host`
- 服务器与本机是**同一局域网**；若换到跨网段/公网，需重新考虑端口暴露与 HTTPS

---

## 12. 重要约定与坑

1. **不要提交**：`*.pth`、`*.apk`、`.env`、`node_modules/`、`target/`、`build/`、`uploads/`、IDE 配置
2. **App 代码只在 `apps/` 和 `services/`**，共享素材放 `assets/`，文档放 `docs/`
3. **端口统一 8088**，改端口要同时改 `.env`、部署脚本、APK 构建参数
4. **共用电脑部署原则**：不修改网络/IP/DNS/路由；不改变防火墙开关（仅在已启用时追加放行规则）；开机自启默认不启用；用完 `docker compose down` 释放内存/GPU
5. **`EXPO_PUBLIC_API_BASE_URL` 不能用 `localhost`**，真机/模拟器都必须是可达 IP
6. 模拟器访问宿主机用 `10.0.2.2`；访问局域网其它机器直接用其 LAN IP
7. 安卓模拟器截图建议存 `/data/local/tmp/`，存 `/sdcard` 会进 MediaStore，污染相册选择器

---

## 13. 换开发工具后的第一步

按顺序做这几件事，就能无缝接手：

1. **打开仓库** `e:\my-react-workspace\cotton-recognition-assistant`
2. **读这三个文件**（按优先级）：
   - `docs/handoff.md`（本文）
   - `docs/requirements.md`（要做什么）
   - `docs/deployment-guide.md`（怎么交付）
3. **跑一次 `git status`**：v1.1.0 的改动尚未提交（含本文档），确认后提交；推送前先确认远端状态（本地 `origin/main` 已失效）
4. **确认服务器还活着**：`curl http://192.168.1.123:8088/health`
5. **确认本机环境**：`ANDROID_HOME=E:\Android`，adb / emulator 可用；构建需要 JDK 17（`C:\Program Files\Java\jdk-17`）
6. **优先解决的 2 件事**（按业务价值排序）：
   1. 补齐测试账号与交付物（需求文档第 10 节列了 6 项），模板见 `docs/delivery-checklist.md`
   2. 在模拟器或真机上跑一遍 v1.1.0 回归：首次启动 → 填写/自动搜索服务器地址 → 登录 → 拍照识别 → 识别记录 → 新闻
7. **服务器地址不用再纠结**：v1.1.0 起 App 内可改地址、可自动搜索，换电脑/换 IP 都无需重新打包；只有需要"开箱即用"包时才用 `-LanIP` 出专用版
8. **推荐出包命令**：`.\build-apk-lan.ps1`（通用版）→ 得到项目根目录 `cotton-recognition.apk`

---

---

## 14. v1.1.0 改动清单与验证状态（2026-09-20）

### 14.1 改动文件

| 文件 | 改动 |
|---|---|
| `apps/android/src/services/serverConfig.ts` | 新增：地址规范化、AsyncStorage 读写、`/health` 探测、`/24` 网段并发扫描 |
| `apps/android/src/screens/ServerSetupScreen.tsx` | 新增：服务器地址设置页（手动填写 / 测试连接 / 自动搜索 / 查看本机 IP 说明） |
| `apps/android/src/config.ts` | 新增 `setRuntimeApiBaseUrl()` / `getApiBaseUrl()` / `getDefaultApiBaseUrl()` |
| `apps/android/src/services/http.ts` | `buildUrl()` 改用 `getApiBaseUrl()` |
| `apps/android/src/types.ts` | `AppView` 增加 `{ name: 'serverSetup' }` |
| `apps/android/src/screens/SettingsScreen.tsx` | 新增「服务器地址」入口 |
| `apps/android/App.tsx` | 启动时读取本地地址、无地址进引导页、新增路由；用户协议 / 隐私政策改写为条款正文 |
| `apps/android/package.json` / `package-lock.json` | 新增 `expo-network@~56.0.5` |
| `apps/android/app.json` | 版本 1.1.0；splash 增加 `image` |
| `apps/android/android/app/build.gradle` | release 签名支持 `keystore.properties` / `COTTON_KEYSTORE_*`；`versionCode 2`、`versionName 1.1.0`（⚠️ 该目录未被 Git 跟踪，见 14.4） |
| `apps/android/android/app/src/main/res/**` | 新增各密度 `splashscreen_logo.png`、`drawable/splashscreen.xml`；`styles.xml`（含 `values-v31`）改用 logo 启动页（⚠️ 同上） |
| `apps/android/assets/splash-icon.png` | 新增：预构建用启动图 |
| `apps/android/assets/reference/color-grade-chart.jpg` | 新增：颜色级参考图（Hunter Lab 等级图，700×802，来源 cottoninc.com 官方图）本地图源 |
| `apps/android/src/screens/StandardsScreen.tsx` | 颜色级参考图由远程 URL 改为 `require()` 本地打包图源，`Image.getSize` 远程加载逻辑删除，断网/内网也能显示 |
| `apps/android/src/services/normalizers.ts` | 修复「原始样本」图片不显示：`resolveImageUri()` 拼接地址由编译期 `appConfig.apiBaseUrl` 改为运行时 `getApiBaseUrl()`（通用版 APK 编译期地址为空，后端返回的 `/uploads/xxx.jpg` 会被原样丢给 `<Image>` 而无法加载）；同时检测刚完成的这条记录优先使用手机本地原图，历史记录自动回落到服务器地址 |
| `docs/handoff.md` | 本次改动清单与验证状态（本文） |
| `build-apk-lan.ps1` | `-LanIP` 可选（不传=通用版）；构建后自动校验签名并提示 debug 签名风险 |
| `deploy-lan.ps1` | 默认使用通用版 APK，不再默认重打包；摘要打印 App 内填写地址的指引 |
| `model-service-start.cmd` | 修复 `%%VAR%%` 写法导致模型服务无法启动的问题 |
| `.gitignore` | 排除 `*.keystore` / `*.jks` / `keystore.properties` |
| `docs/deployment-guide.md` | 改为「通用版 APK + App 内配地址」流程；Q2/Q3、固定 IP 章节同步 |
| `docs/pre-deployment-checklist.md` | 新增签名检查（含正斜杠坑）、通用版出包说明 |
| `docs/server-address-in-app-plan.md` | 状态改为「已重新启用」 |
| `docs/pending-questions.md` | 补充「已确认」第 15、16 条 |
| `docs/delivery-checklist.md` | 新增：交付物清单 + 测试账号模板 + 现场验收清单 |
| `docs/local-testing-guide.md` | 新增：本机联调与模拟器/真机测试步骤 |
| `README.md` | 目录结构、出包说明、核心结论同步 |

### 14.2 验证状态

- ✅ `npm run typecheck`：exit 0
- ✅ Release 构建：`gradlew assembleRelease` → BUILD SUCCESSFUL，产物 `app-release.apk`（73.4 MB）
- ✅ 签名校验：`apksigner verify --print-certs` → `CN=Cotton Recognition Assistant, OU=Delivery, O=Cotton Recognition, L=Hangzhou, ST=Zhejiang, C=CN`
- ✅ 版本号：`versionCode 2` / `versionName 1.1.0`；应用名「棉花识别助手」；包名 `com.customs.cottonrecognition`
- ✅ 图标安全区实测：自适应图标前景内容位于 22.2%~77.8%（安全区要求 19.4%~80.6%），无需重做
- ✅ 颜色级参考图改为本地内置：`StandardsScreen.tsx` 由远程 URL 改为 `require('../../assets/reference/color-grade-chart.jpg')`，`Image.getSize` 远程探测逻辑删除，`npm run typecheck` exit 0（随本次补充）
- ✅ 「原始样本」不显示已定位并修复（随本次补充）：`/uploads/20f8657a-….jpg` 在服务器上实测可直连（HTTP 200，622075 字节 `image/jpeg`），说明服务端静态文件正常，问题在客户端地址拼接——`normalizers.ts:resolveImageUri()` 读的是编译期 `appConfig.apiBaseUrl`（通用版为空），因此把 `/uploads/….jpg` 原样交给 `<Image>`；掩模/叠加图是 base64 data URL，所以只有「原始样本」这一格不显示。改为 `getApiBaseUrl()` 后 `npm run typecheck` exit 0
- ⏳ 真机 / 模拟器回归：待执行（步骤见 `docs/local-testing-guide.md`，验收项见 `docs/delivery-checklist.md`）

### 14.3 本次踩到的坑（避免重复）

1. `keystore.properties` 里的 Windows 路径必须写成**正斜杠**：反斜杠会被 Java Properties 当转义符，导致路径失效并**静默回退到 debug 签名**（构建不报错）。出包脚本已加签名校验告警。
2. `model-service-start.cmd` 原来使用 `%%VAR%%`，批处理里会被当成字面量，模型服务实际起不来；已改为 `%VAR%`。
3. 本机 PowerShell 禁止执行脚本（`profile.ps1` 加载失败），运行 `.ps1` 需 `powershell -ExecutionPolicy Bypass -File xxx.ps1`。

### 14.4 ⚠️ 原生工程目录未被 Git 跟踪

`apps/android/.gitignore` 第 41 行是 `/android`，因此 `apps/android/android/`（含 `build.gradle` 签名配置、启动页资源、`keystore.properties`）**不在版本控制内**，当前仓库实际跟踪 163 个文件。

影响：

- 换机器 clone 后直接构建会失败（原生工程缺失），需先 `npx expo prebuild` 重新生成；
- 而重新生成**会覆盖**签名配置与启动页改动，需按 14.1 的表重新套用；
- 本机这个 `/android` 目录属于"交付资产"，请勿删除。

建议（待决策）：把 `apps/android/.gitignore` 里的 `/android` 去掉并提交原生工程，使仓库自包含（代价：仓库体积变大，且不再是纯 CNG 结构）。

---

## 15. 置信度为什么只有 30 多？（2026-09-20 实测结论）

直接绕过 App 打后端（三张微信原图，未经 App 二次压缩）：

```powershell
curl.exe -F "file=@sample1.jpg" "http://192.168.1.123:8088/recognition?images=0"
```

| 样本 | colorGrade | impurityGrade | areaRatio | confidence | App 显示 |
|---|---|---|---|---|---|
| sample1.jpg | 41 | 4 | 0.3397% | 0.3861 | 38.61% |
| sample2.jpg | 61 | 3 | 0.2324% | 0.4218 | 42.18% |
| sample3.jpg | 61 | 3 | 0.2631% | 0.5779 | 57.79% |

结论：

1. **不是 App 显示错误**。`RecognitionReport.tsx` 的 `percentText(result.confidence)` 只是把后端 `confidence`（0~1）乘 100 显示，`normalizers.ts:normalizeConfidence()` 负责兼容后端直接给 0~100 的情况，不存在漏乘/多除。
2. **数值由模型决定**。`services/backend/model-service-python/model_service2.py` 的 `infer_color_grade()` 里：

   ```python
   logits = color_model(inp)[0]
   probs = torch.softmax(logits, dim=0)
   conf, idx = torch.max(probs, 0)     # ← confidence 就是 7 分类 softmax 的最大值
   ```

   `COLOR_GRADE_LABELS` 为 7 个颜色级（11/21/31/41/51/61/71），7 分类随机猜的期望约为 14.3%，30%~58% 说明模型对这几张样本确实不确定，而不是算错。
3. 模型侧可选的提升方向：~~先用棉花掩模裁剪 ROI 再做颜色级分类~~（**已实测否决**，见第 20 节）、多窗口（中心/四角）取平均、温度标定、补充同域训练数据后重训、对低置信度给出复核提示。
4. 顺带确认：`tools/` 目录里只有数据集爬取与新闻脚本，**没有颜色级模型的训练代码**。训练侧的预处理口径当时无法自证，本文按「Resize 320」推测 —— **该推测是错的**；2026-09-20 拿到原作者推理脚本后已确认并修正，**见第 20 节**。

> ⚠️ **本节结论已在第 20 节更新**：低置信度的直接原因是**线上预处理与训练不一致**（线上 320 vs 训练 256），已修复并复验；「>99% 置信度」仍受模型自身能力（83% 准确率）限制。

---

## 16. 检测记录按账号隔离 + 重登回看（2026-09-20 前端修复）

### 16.1 现象

登录后识别能看到记录，但退出登录 / 换账号 / 清缓存 / 换设备重新登录后，「检测记录」里看不到该账号过去的记录。

### 16.2 根因（后端没问题，缺的是 App 主动拉取）

- `GET /recognition/history` 必须登录，未带 token 直接 401（`RecognitionController#getHistory`）；
- 控制器用 `authentication.getPrincipal()` 取 `userId`，**只返回该用户**的记录；`DELETE /recognition/history` 同样按 `userId` 过滤；
- 返回体 `RecognitionHistoryItem` 含 `imageUri`、各掩膜/叠加图、`confidence`、`createdAt`，列表页可正常渲染；
- 但 App 启动和登录时**只读手机本地缓存**（`cache.getHistory(username)`），从不调 `GET /recognition/history`；切换账号时列表也没清空，A 的记录会短暂留在 B 的视图里。

### 16.3 改动（仅前端；后端识别流程与模型服务未做任何改动）

| 文件 | 改动 |
|---|---|
| `apps/android/App.tsx` | 新增 `sessionUserRef`（当前账号名）+ `syncRemoteHistory(session)`：登录、注册、启动时调 `api.fetchHistory(token)`，返回后用账号名校验再写入 `setHistory` 与按账号的本地缓存；`handleSessionChange` 改为「写入会话 → 清空列表 → 读本账号本地缓存兜底 → 服务器结果覆盖」；`handleLogout` 重置 `sessionUserRef`；bootstrap 在已登录时自动同步 |

### 16.4 行为说明

- 未登录（游客）识别：后端不写库（`userId` 为空），只在手机里按「游客」缓存，不会串进任何账号。
- 登录状态下识别：后端按该账号写库（原有逻辑不变），App 同时把该条插入列表。
- 登录 / 注册成功：立刻拉该账号历史（服务器为准，本地缓存先兜底）。
- 切换账号：先清空列表再载入目标账号；异步返回带账号校验，旧账号的响应直接丢弃。
- 服务器不可用：静默失败，继续显示本地缓存，不弹错误框。
- ✅ `npm run typecheck`：exit 0
- ✅ Release 打包：`BUILD SUCCESSFUL`，产物 `cotton-recognition.apk`（70.1 MB），签名 `CN=Cotton Recognition Assistant, OU=Delivery, O=Cotton Recognition, L=Hangzhou, ST=Zhejiang, C=CN`

### 16.5 手机端手工验收清单（由业务方在手机上操作）

1. 账号 A 登录 → 拍照识别 1~2 条 → 「检测记录」能看到（含「原始样本」图片）。
2. 退出 → 换成账号 B 登录 → 「检测记录」里看不到 A 的记录。
3. 账号 B 识别 1 条 → 只显示 B 的记录。
4. 杀掉 App 重开（仍是 B）→ 记录还在（启动时从服务器同步）。
5. 退出后重登账号 A → 能看到第 1 步的记录。
6. 后端不可达时打开「检测记录」→ 不报错，显示本机缓存。

---

## 17. 颜色级参考图比例修复（2026-09-20）

- 图源：`apps/android/assets/reference/color-grade-chart.jpg`，真实尺寸 **700×802**（宽高比 0.8728），`StandardsScreen.tsx` 里 `DEFAULT_COLOR_CHART_ASPECT_RATIO = 700 / 802` 与之吻合，不存在图源与写死值不一致的问题。
- 真正的原因在渲染方式：图片原先靠 `<Image>` 的 `aspectRatio` 样式决定高度。本 App 的 RN 版本下该样式算出的高度不可靠（新闻页横幅早有同款问题，见 `NewsScreen.tsx` 中「横幅宽高按图片真实比例显式计算，不依赖 aspectRatio，避免比例失衡」），导致参考图比例不对。
- 改法（与新闻页保持一致）：给图片容器加 `onLayout` 量出实际可用宽度，按 `高度 = 宽度 ÷ 真实宽高比` 显式算高，`aspectRatio` 不再参与渲染；加载失败占位块同步改为 `minHeight: 120`。
- ✅ `npm run typecheck`：exit 0
- ✅ Release 打包：`BUILD SUCCESSFUL`，产物 `cotton-recognition.apk`（70.1 MB，正式签名）
- ⏳ 真机确认：打开「标准」页看参考图是否不再拉伸变形（手机端由业务方操作）。

### 17.1 排查记录：设备上装的还是旧包（2026-09-20）

业务方反馈「App 里参考图看起来没变化」，逐步核对如下（结论：包没更新，不是改动无效）：

1. `adb shell dumpsys package com.customs.cottonrecognition` → `lastUpdateTime=2026-09-20 03:49:34`（设备为 UTC，本地 11:49）= **11:48 那次打包的包**，早于 12:09 的代码改动。
2. 把设备里已安装的 APK 拉回本地，比对包内 `assets/index.android.bundle` 的 SHA256：旧包 `e4f601d6…`，最新包 `69320f3d…` → **不是同一份 JS**，可确定设备跑的是没有本次修复的旧 bundle。
3. `adb install -r cotton-recognition.apk` 覆盖安装（同签名，保留登录数据）后复查：`lastUpdateTime` → 12:15（本地），设备 bundle 哈希 = 最新包 `69320f3d…`，**一致**。

以后遇到「改了代码但界面看不出变化」，先按第 1、2 步核对设备上实际跑的 bundle 哈希，再怀疑代码。

另外两项同步核实的事实：

- 内置图源与 cottoninc 官方文件 `color-chart.jpg` **SHA256 完全一致**（`444A2C7A24A10B69…`，700×802，比例 0.8728），不存在图源被二次压缩/拉伸的问题；
- `apps/android/app.json` 未配置 `expo-updates`，App 只使用安装包内自带的 JS bundle，排除「OTA 更新覆盖」这一路径。

按当前页面边距（`spacing.page = 18`，参考图框再外扩 12dp 的负边距）估算：若旧代码一直按默认比例 `1.36` 渲染，高度约 271dp；修复后按真实比例约 423dp，**应能明显看出变高约 55%**。若业务方安装新包后仍觉得「比例不对」，需以截图确认具体是变形 / 被裁边 / 过大过小中的哪一种。

---


## 18. 现场交付文档补充：静态 IP 与 U 盘离线交付（2026-09-20）

起因：业务方问「怎么知道现场是不是 `192.168.1.x` 网段？是不是要到现场确认后才能配静态 IP？」以及「听说把环境构建好、拷进 U 盘，现场拷进去就能用」，需要把提醒写进文档，让非开发人员也能照着配置成功。

先核实事实（只读代码/脚本，**未改动任何功能代码**）：

| # | 事实 | 出处 |
|---|---|---|
| 1 | 静态 IP 的地址由**现场**决定：`-i` 为必填且脚本内无硬编码 IP，网卡/网关/掩码前缀均由当前网络自动推导 | `tools/set-static-ip.sh` |
| 2 | 填「当前 DHCP 拿到的那个 IP」也能安全固化——脚本会提示「目标 IP 与当前 IP 相同，仅把配置方式从 DHCP 改为静态」 | 同上 |
| 3 | 后端端口映射**不绑定具体 IP**（`"${BACKEND_PUBLIC_PORT:-8088}:8080"`），换网段无需改配置、无需重新部署 | `docker-compose.yml:100`、`docker-compose.linux.yml:32` |
| 4 | App 地址与网段解耦：运行时可配置 + 「自动搜索」（取手机自身 IP 推导 `/24` 扫 8088，兜底 `192.168.1.x`/`192.168.0.x`，实测 3~8 秒） | `apps/android/src/services/serverConfig.ts`、`docs/server-address-in-app-plan.md` §3.3 |
| 5 | **Windows 部署机的模型服务是 conda 原生进程**（`D:\aconda\envs\YOLO\python.exe`，找不到回退 `D:\aconda\python.exe`），**无法靠拷 U 盘搬过去** | `deploy-lan.ps1:138-142` |
| 6 | 镜像：`mysql` 用官方镜像；`backend`/`model-service` 是 `build:`，首次构建需外网（`./mvnw dependency:go-offline` 与 `pip install`）→ 现场无外网需 `docker save`/`load` | `docker-compose.yml`、`services/backend/Dockerfile`、`deploy-lan.sh:205-210` |
| 7 | `.env`（含随机 `JWT_SECRET`、IP、端口）由部署脚本**现场生成**，不能预先拷贝 | `deploy-lan.sh:173-202`、`deploy-lan.ps1:284-299` |

文档改动：

| 文件 | 改动 |
|---|---|
| `docs/static-ip-setup.md` | ① 新增「三、不知道现场网段怎么办（现场定 IP 的推荐流程）」：三条硬道理 + 现场六步表 + 与 `deploy-lan.sh`/`deploy-lan.ps1` 的先后顺序；② 原「注意事项」扩写为「六、提醒与自检清单（出发前 / 现场务必先看）」：安全（禁用 `-y`、`netplan try` 自动回滚）、选地址三条（同网段 / 避开 DHCP 池 / 避开在线设备）、脚本行为须知（netplan 分支判定条件、掩码前缀来源、非交互终端、首次无备份）、网络变化（恢复 DHCP 命令、App 需重登）、现场其他坑（AP 隔离、扫描请求量、端口放行）、Windows 图形界面做法、一分钟自检；③ 章节编号顺带理顺（一/二/三/四/五/六） |
| `docs/on-site-quickcard.md` | ① 出发前清单补「静态 IP 文档」与「可选离线资源」；② 部署步骤后补「可选（推荐）：把这个 IP 固定住」；③ 新增「U 盘离线交付：哪些能提前装、哪些必须到现场做」小节（逐项结论 + `docker save`/`docker load` 步骤与前提）；④ 排障表补两行（想彻底避免 IP 变化 / 不确定该用哪个 IP） |
| `docs/handoff.md` | 本节 |

未验证 / 需现场确认：

- ⏳ `docker save` 的镜像名与现场解压后的目录名是否一致（compose 默认按目录名命名），现场以 `docker images` 实际输出为准，必要时 `docker tag` 改名。
- ⏳ 现场是否存在 AP 隔离、`8088` 是否被占用、是否需要外网等，均以现场实测为准。

---

## 19. 部署文档定位调整：默认 Linux、Windows 改为备用方案（2026-09-20）

起因：业务方要求「目标电脑默认为 Linux，但保险起见仍保留备用 Windows 方案」。本节只改**文档定位与措辞**，未改动任何部署脚本与识别流程代码。

先核实的脚本事实（只读代码，未做推测）：

| # | 事实 | 出处 |
|---|---|---|
| 1 | `deploy-lan.sh` 会先检测 GPU（`nvidia-smi` + `docker info` 里是否有 nvidia runtime），检测不到时**自动只加载 `docker-compose.yml`**（CPU 回退），**不需要**用户手工注释 GPU 块 | `deploy-lan.sh:101-114`、`deploy-lan.sh:162-170` |
| 2 | GPU 配置**与**「模型服务映射到宿主机 5000 端口」这两件事**都**写在 `docker-compose.linux.yml` 里 → **CPU 回退模式下宿主机没有 5000 端口**，`curl http://127.0.0.1:5000/health` 会连不上（属正常现象） | `docker-compose.linux.yml:9-20`、`docker-compose.yml:53-60` |
| 3 | 基础 compose 里 `model-service` 只有 `expose: 5000`（仅容器间可达）；后端 8088 的端口映射在基础文件里，两种模式都能从宿主机 `curl` 到 | `docker-compose.yml:53-54`、`docker-compose.yml:99-100` |
| 4 | 后端调用模型服务的地址由脚本固定写为 `http://model-service:5000`（Docker 内部网络），与是否映射宿主端口无关 | `deploy-lan.sh:184-190` |

文档改动：

| 文件 | 改动 |
|---|---|
| `docs/deployment-guide.md` | ① 结构改为「**第三章＝Linux（默认目标机）**」在前、「**附录 B＝Windows（备用方案）**」在后（原为 Windows 在前 + 插入式 Linux 一节）；块交换用脚本完成并做**非空行多重集校验**，确认无内容丢失/重复；② 新增 Linux / Windows 差异表（模型服务形态、`docker compose ps` 内容、新机器准备、离线交付、一键卸载）；③ 第二、四章表格与说明改为 Linux 优先；④ 常见问题 Q1（conda）标注「仅 Windows 备用方案」、Q3 改为 `hostname -I` / `ipconfig` 双写法、Q4 按路径分开；⑤ 第三章「验证」按**有 / 无 GPU** 分别给出模型服务自检方式 |
| `docs/on-site-quickcard.md` | 头注声明默认 Linux；分节改名「默认 / 备用」；U 盘清单把 conda 行标为「仅备用方案才需要」；GPU 前提改为「无 GPU 不用特判，自动 CPU 回退」 |
| `docs/static-ip-setup.md` | 头注「目标部署机默认 Linux」；6.6 标题改为「备用方案：Windows 部署机做法（图形界面）」；端口放行与 `deploy-lan.ps1` 提醒标注默认 / 备用 |
| `docs/delivery-checklist.md` | 头注声明默认 Linux；现场验收第 2 项按 Linux（容器）/ Windows（conda 进程）分别给判定标准 |
| `docs/pre-deployment-checklist.md` | 头注说明第 6 节是服务器（Linux）命令、清单内 PowerShell 用于打包机；第 6 节补「手工执行时只有 GPU 机才加 `-f docker-compose.linux.yml`」提醒 |
| `docs/local-testing-guide.md` | 场景 B 改为「模型服务也在容器里，三件套一起起」，去掉「Linux 按部署手册启动 Flask 服务」的旧说法 |
| `docs/pending-questions.md` | 「已确认」补第 17 条：目标部署机默认 Linux、Windows 备用 |
| `README.md` | 文档索引、脚本清单（Linux 在前）、部署一句话说明同步 |

顺带修正的事实错误：旧稿写「没有 NVIDIA GPU 的机器会自动回退 CPU」，同时又在「验证」里要求 `curl http://127.0.0.1:5000/health` 必须正常 —— 两者在 CPU 模式下矛盾（见上表事实 2）。现已按模式分述，并给出 CPU 模式的替代自检命令（`docker compose ps` 看 healthy / `docker compose exec model-service python -c ...`）。

未验证 / 需现场确认：

- ⏳ **CPU 模式下的实际推理耗时与整体可用性**：只验证了「脚本会自动降级」，未在无 GPU 机器上跑过完整识别流程。
- ⏳ 现场 Linux 发行版对 `deploy-lan.sh` 用到的 `ip -4 addr` / `sed -i` / `ss` 等命令的兼容性（Ubuntu 20.04+、CentOS 7+ 预期可用）。

## 20. 颜色级低置信度根因定位与修复（2026-09-20，微信包 `棉花颜色杂质`）

业务方转来模型作者的原始资料包（微信 `棉花颜色杂质`）。本节结论全部来自**实测**；核对脚本已入库（`tools/model/verify_color_pipeline.py`，用法见 `tools/model/README.md`），原始输出留在 `%TEMP%`。

### 20.1 包里有什么

| 路径 | 内容 | 价值 |
|---|---|---|
| `颜色分级/mypredict_cbam.py` | 作者跑测试集用的推理脚本 | **定义了训练同款的预处理**（见 20.2） |
| `颜色分级/fourtime-best.pth` | 颜色分类权重（90.0 MB） | 与仓库内 `fourtime-best.pth` **SHA256 完全一致** |
| `颜色分级/fourtime_resnet50结果/report.txt` | 75 张测试集分类报告 + 混淆矩阵 | 该权重的**真实能力上限**（见 20.5） |
| `颜色分级/fourtime_resnet50结果/detect_result.txt` | `图片名 → 类别(1~7)` | 与可视化文件名可互相校验 |
| `颜色分级/fourtime_resnet50结果/images/` | 75 张预测可视化，**左上角红字 = 预测级:置信度** | 可直接人工读图核对（见 20.4） |
| `杂质分割/推理脚本和模型/{best.pth, cottonarea_best.pth, infer_batch_classify.py}` | 两个 UNet 权重 + 分割推理脚本 | 权重同样与仓库一致（见下表） |
| `杂质分割/测试图片/images.zip`、`杂质分割/推理结果/` | 分割测试图与推理结果 | 本轮未使用 |

**关键结论 1：权重不是问题，而且现有挂载关系是对的。** 三个 `.pth` 与仓库内文件逐字节相同，只是**命名交叉**：

| 微信包里的文件 | SHA256（前 16 位） | 仓库里对应的文件 | 线上用途 |
|---|---|---|---|
| `颜色分级/fourtime-best.pth` | `ad9c7f10ffa931c6…` | `fourtime-best.pth` | 颜色级分类 |
| `杂质分割/…/cottonarea_best.pth` | `6ca7da08a8b29fd7…` | `fenge_best.pth` | 棉花区域分割（`COTTON_UNET_WEIGHTS`） |
| `杂质分割/…/best.pth` | `ad4e432f41a3bc10…` | `impurityarea_best.pth` | 杂质区域分割（`IMPURITY_UNET_WEIGHTS`） |

即作者口中「`best.pth` = 杂质模型、`cottonarea_best.pth` = 棉区模型」，而仓库把棉区模型叫 `fenge_best.pth`、杂质模型叫 `impurityarea_best.pth`。**哈希证明当前 docker-compose 的挂载没有把两个 UNet 接反**（棉区分支挂的确实是 `cottonarea_best.pth` 的内容）。因此「换一版权重」这条路线可以直接排除。

### 20.2 根因：线上预处理比训练时「多放大 25%」

作者脚本 `mypredict_cbam.py:99-107`：

```python
transform = transforms.Compose([
    transforms.Resize(256),          # ← 短边缩到 256
    transforms.CenterCrop(224),      # ← 中心裁 224
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
```

而模型服务原先写的是（`model_service2.py`）：

```python
COLOR_RESIZE_SIZE = env_int("COLOR_RESIZE_SIZE", 320)   # ← 短边 320，比训练时多放大 320/256 = 1.25 倍
```

短边 320 → 中心裁 224，等效于取「画面中间约 70%」再放大；短边 256 → 224 是取约 87.5%。两者看到的纹理尺度差 1.25 倍。这是典型的**训练/推理不一致**，会同时降低**准确率**与**置信度**（不是靠概率标定能补回来的数值问题）。

已修复：默认值改为 `256`；环境变量 `COLOR_RESIZE_SIZE` 仍可覆盖（临时回退用 `COLOR_RESIZE_SIZE=320`）。`services/backend/model-service-python/README.md` 的环境变量表已补注。

### 20.3 量化对比（作者 75 张标注测试集，同一版权重）

参照物 = 可视化文件名尾部带的标签（即作者那次运行的预测）。这些图被叠加了红字并重新 JPEG 压缩，所以不可能 100% 复现作者，「接近 95%」即视为同一管线。

| 预处理 | 与作者预测一致 | 中位置信度 | 平均置信度 | 置信度 ≥90% |
|---|---|---|---|---|
| **Resize(256)+CenterCrop(224)**（作者脚本 ＝ 修复后线上） | **71/75** | **0.801** | 0.696 | **19/75** |
| Resize(320)+CenterCrop(224)（修复前线上） | 60/75 | 0.603 | 0.633 | 9/75 |

修复后：一致率 +14.7 个百分点，中位置信度 0.603 → 0.801，高置信样本（≥90%）从 9 张变成 19 张。

复验方式：直接 `import model_service2`（就是线上那份代码，含 AMP/GPU 路径）跑同一批图 → `71/75`、中位 `0.801`，与离线实验数字吻合，确认修复生效。

### 20.4 管线自检：读得出作者图上的红字

`IMG_20250801_102458_21.jpg` 左上角红字是 `21:89.0%`；我们复现 = `21/90.7%`（差异来自红字像素本身与二次 JPEG 压缩）。这条自检说明我们复现的是作者当期那条管线，而不是「另外跑了个模型」。

另外，修复前的生产值也能 1:1 复现（生产 API 38.61/42.18/57.79% ↔ 本地 38.68/42.15/57.90%），说明整套对比都是在同一环境下做的，不存在「本地环境不同所以数字不可比」。

### 20.5 但「>99% 置信度」这件事，换个预处理也做不到

`report.txt`（75 张测试集，作者自己的脚本跑出来的）：

| 真实级 | precision | recall | f1 | support |
|---|---|---|---|---|
| 11 | 1.00 | 1.00 | 1.00 | 9 |
| 21 | 0.72 | 0.87 | 0.79 | 15 |
| 31 | 0.78 | **0.54** | 0.64 | 13 |
| 41 | 0.82 | 0.75 | 0.78 | 12 |
| 51 | 0.90 | 1.00 | 0.95 | 9 |
| 61 | 0.78 | 0.78 | 0.78 | 9 |
| 71 | 0.89 | 1.00 | 0.94 | 8 |
| **总体** |  |  |  | **accuracy 0.83** |

即：这版权重在**它自己的测试集**上是 **83% 准确率**、macro-F1 0.84，其中 31 级召回只有 0.54（混淆矩阵：31 有 4 张被判成 21、2 张判成 41）。所以：

- 「置信度必须 >99%」**不是预处理能解决的问题**，只能靠重训/补数据；
- 置信度 ≠ 准确率。App 上「38%」的含义是「模型对这张图的颜色级没有把握」，不是「识别错了 62%」；
- 反过来也要注意：修复后中位置信度 0.801 也意味着**约 1/4 的样本置信度低于 90%**，这是这类 7 分类模型的正常水平。

### 20.6 现场那三张实拍图（修复后）

| 图 | 修复前（320，生产实测） | 修复后（256） | 棉区裁剪后再分类 |
|---|---|---|---|
| 图7 | 41 / 38.68% | 51 / 33.2% | 61 / 53.2% |
| 图8 | 61 / 42.15% | **51 / 63.7%** | 51 / 78.6% |
| 图9 | 61 / 57.90% | **51 / 58.9%** | 51 / 74.9% |

（图7/8/9 就是第 15 节那三张；棉区占比：图7 94.1%、图8 89.1%、图9 66.0%。）

**「先裁棉花 ROI 再分类」已实测否决，不要做。** 在作者 75 张标注集上，裁 ROI 后：一致率 71/75 → **66/75**，中位置信度 0.801 → 0.677，≥90% 从 19 张掉到 12 张。它只是让那三张实拍图好看了，对模型原本擅长的那批图（黑底满框棉样）明显有害——**训练分布里本来就包含边框与构图信息**。第 15 节与 `docs/pending-questions.md` 里原来把「裁 ROI」列为提升方向，属当时的猜测，现按实测结论划掉。

修复后这三张图仍是 33% / 64% / 59%，说明它们对模型本来就偏难（实拍取景、光照与训练样本差别大）。要真正达到业务期望，只有两条路：

1. **规范拍摄**：按训练样本的样子拍 —— 棉样居中、深色/黑底、尽量填满画面、光照稳定，别用大范围环境背景；
2. **补数据重训**：由业务方提供带标注的现场实拍图（每级若干张），和训练集一起重训后替换 `fourtime-best.pth`。

### 20.7 本次改了什么

| 文件 | 改动 |
|---|---|
| `services/backend/model-service-python/model_service2.py` | `COLOR_RESIZE_SIZE` 默认 320 → **256**（附注释说明依据与回退方式） |
| `services/backend/model-service-python/README.md` | 环境变量表补 `COLOR_RESIZE_SIZE` / `COLOR_IMG_SIZE` 与注意事项 |
| `docs/handoff.md` | 新增本节；第 15 节第 3、4 条结论修订 |
| `docs/pending-questions.md` | 「已确认」补第 18 条；「仍待业务确认」第 12 条按实测更新 |

明确**没做**的事（避免后人重复踩）：不改权重（哈希证明已一致）、不裁 ROI（实测变差）、不加滑窗平均（第 15 节实测 9 窗口平均把各类都拉平到 ~20%~44%，属同类「靠投票消抖」的伪提升）。

仍需业务方/模型作者确认：

- ⏳ 能否重训：包里**没有训练集**（`datasets/cotton_fourtime_data` 未提供），重训需要作者配合；
- ⏳ 现场拍摄规范能否限定，这直接决定置信度能否稳定在高位；
- ⏳ 修复已在代码与本地复验，但**尚未在部署服务器上重启验证**。重新部署后按下面两条确认（Python 代码是**打进镜像**的，必须带 `--build`，只 `restart` 无效）：

  ```bash
  # 有 GPU（默认目标机形态）
  sudo docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d --build model-service
  # 无 GPU（CPU 回退）
  sudo docker compose up -d --build model-service

  # ① 预处理参数（应为 256 / 224）
  sudo docker compose exec model-service python -c "import model_service2 as m;print(m.COLOR_RESIZE_SIZE, m.COLOR_IMG_SIZE)"
  # ② 端到端（三张对照图应为 51/33.2%、51/63.7%、51/58.9%）
  curl -s -F "file=@sample1.jpg" "http://127.0.0.1:8088/recognition?images=0" | grep -oE '"(colorGrade|confidence)":[0-9.]+'
  ```

  为方便现场确认，模型服务 `/health` 与识别结果 `modelInfo` 已新增 `colorResize` / `colorCrop` 字段（有 GPU 映射 5000 端口时可 `curl http://127.0.0.1:5000/health` 直接看到 `"colorResize": 256`）。

---

*本文档由当前开发会话整理，未验证的内容均已标注。*
