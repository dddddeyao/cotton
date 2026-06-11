# 棉花识别助手 Android 前端项目

本目录用于开发“棉花识别助手”安卓 App 前端。

当前阶段：Expo 前端骨架已初始化，首版可交互页面开发中。

## 目录说明

```text
cotton-recognition-assistant/
  app/                  # React Native / Expo / TypeScript 工程
  assets/
    icons/              # App 图标、启动页图标
    references/         # 鸿蒙端截图、设计参考图
    standards/          # 分类标准图片、表格、资料
  docs/
    requirements.md     # 前端需求文档
    pending-questions.md # 待确认问题清单
```

## 推荐技术栈

```text
React Native + Expo + TypeScript
```

## 当前已完成

- `app/` 已初始化为 Expo + TypeScript 工程。
- 已搭建四个底部 Tab：前沿瞭望 / 分类标准 / 智能识别 / 我的信息。
- 已实现 mock 新闻列表、搜索、本地缓存占位。
- 已实现分类标准长页，包含颜色分级说明、图表占位、颜色等级表、杂质等级表。
- 已实现拍照、相册选图、图片预览、mock 识别结果、识别记录、全选删除 UI。
- 已实现登录 / 注册 mock 流程、编辑资料、我的收藏、应用设置、用户协议、隐私政策占位页。
- 已补充统一接口配置、请求封装、图片上传 FormData、识别结果字段适配器。
- 已复制鸿蒙端截图到 `assets/references/` 作为视觉参考。

## 本地运行

```text
cd app
npm install
npm run start
```

打开 Expo Dev Tools 后，可使用 Android 模拟器或 Expo Go 扫码预览。

## 编译检查

```text
cd app
npm run typecheck
```

## 当前核心结论

- App 名称：棉花识别助手
- 目标平台：Android
- 最终交付：可直接安装的 APK
- 页面结构：前沿瞭望 / 分类标准 / 智能识别 / 我的信息
- 登录方式：账号密码
- 分类标准：前端写死，复刻鸿蒙端
- 新闻：优先缓存展示，后端刷新，不建议前端实时爬取
- 智能识别：拍照或相册选择图片，调用后端接口识别

## 下一步

1. 补齐 `docs/pending-questions.md` 中的后端接口信息。
2. 收集 App 图标、分类标准原始资料、正式新闻图片素材。
3. 在 `app/src/config.ts` 配置后端地址、识别上传字段名和接口路径。
4. 按真实返回字段微调 `app/src/services/normalizers.ts`。
5. 接入真实 APK 打包配置与测试账号说明。
