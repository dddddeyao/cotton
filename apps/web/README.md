# 棉花识别助手 Web 前端

面向棉花颜色级、叶屑等级与图像识别记录管理的 React + TypeScript 静态前端。项目默认使用 mock 数据，可在不启动后端的情况下完成论文展示、流程演示和静态页面验收。

## 技术栈

- React 19 + TypeScript + Vite
- React Router
- Tailwind CSS
- localStorage 本地缓存
- 统一 API 请求层，支持后端接口与 mock 兜底

## 运行

```bash
npm install
npm run dev
npm run build
npm run lint
```

Windows PowerShell 若拦截 `npm.ps1`，可使用：

```bash
npm.cmd run dev
npm.cmd run build
```

## 页面模块

- `/news`：前沿瞭望，支持资讯搜索与本地/接口数据展示
- `/standards`：颜色分级、叶屑分级与采集质量控制
- `/recognition`：相册/拍照选图、预览、识别提交
- `/recognition/result`：单样本识别报告、指标摘要、复制摘要
- `/recognition/history`：识别记录、全选删除、统计摘要
- `/profile`：登录/注册、账号状态、功能入口
- `/profile/edit`：本地资料编辑与持久化
- `/profile/settings`：缓存状态、修改密码校验、清理缓存、退出登录

## 后端接入

复制 `.env.example` 为 `.env.local`，按需填写后端地址：

```bash
VITE_API_BASE_URL=https://api.example.com
VITE_MOCK_WHEN_API_UNAVAILABLE=true
VITE_RECOGNITION_UPLOAD_FIELD_NAME=file
```

接口端点仍集中在 `src/config/index.ts`。配置 `VITE_API_BASE_URL` 后，请求层会自动拼接 URL、注入 Bearer Token、处理 JSON/FormData、执行超时控制，并对常见字段差异进行适配，例如 `token/accessToken/jwt`、`list/records/data`、`confidence/score/probability`。

后端响应既可以使用统一包裹：

```json
{ "code": 200, "message": "ok", "data": {} }
```

也可以直接返回 `{ "data": ... }` 或业务对象/数组，前端会在请求层做解包。

## 缓存策略

- `news_cache`：新闻缓存
- `history_cache`：识别历史
- `session_cache`：登录会话
- `profile_cache_{username}`：本地资料

设置页的“清理缓存”只清除新闻缓存和识别历史，保留登录会话与本地资料。
