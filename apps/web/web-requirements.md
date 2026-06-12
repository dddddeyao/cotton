# 棉花识别助手 Web 前端需求文档 v2.0

## 1. 项目概述

项目名称：棉花识别助手（Web 版）

项目目标：为"棉花识别助手"开发 Web 前端，完全复刻 Android 端全部功能模块，通过浏览器直接访问使用，并支持响应式适配（PC + 手机浏览器）。

定位：纯前端项目，调用已有后端 API，不涉及后端开发。

## 2. 技术栈

```text
React 18+ + TypeScript + Vite + React Router v6 + Tailwind CSS
```

| 技术 | 用途 |
|---|---|
| React 18+ | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| React Router v6 | 页面路由 |
| Tailwind CSS | 样式方案 |
| localStorage | 本地缓存（新闻、临时识别记录、登录 session） |

## 3. 页面布局

- **PC 端（>= 768px）**：左侧栏固定导航 + 右侧内容区域
- **移动端（< 768px）**：底部 Tab 导航，同 Android 端风格

## 4. 页面结构与路由

| Tab 名称 | 路由 | 说明 |
|---|---|---|
| 前沿瞭望 | `/news` | 新闻列表 + 搜索 |
| 分类标准 | `/standards` | 分类标准长页，静态内容 |
| 智能识别 | `/recognition` | 选图/拍照 → 识别 → 结果 |
| 我的信息 | `/profile` | 登录注册、编辑资料、设置 |

子页面路由：

```text
/recognition/result       识别结果详情
/recognition/history      识别记录（含全选删除）
/profile/edit             编辑资料
/profile/collection       我的收藏（占位）
/profile/settings         应用设置
/agreement/user           用户协议（占位）
/agreement/privacy        隐私政策（占位）
```

注：登录和注册内嵌在"我的信息"页面中（Tab 切换模式），不需要独立路由。

## 5. 设计规范 — 色彩 & 版式

直接从 Android 端 theme.ts 复刻：

```ts
// 主色调
primary:       '#2768e8'    // 主蓝色，选中态、按钮、链接
primaryDark:   '#173eaa'    // 深蓝色，Tab 选中背景
primarySoft:   '#dbe8ff'    // 浅蓝色，徽章、缩略图背景

// 背景
background:    '#f6efff'    // 浅紫白主背景
backgroundDeep:'#eadfff'
surface:       '#fffaff'    // 卡片背景
surfaceStrong: '#ffffff'    // 纯白卡片

// 文字
ink:           '#20202a'    // 主文字色
muted:         '#77738a'    // 次要文字色

// 其他
line:          '#ddd4ed'    // 边框线
danger:        '#f07455'    // 删除/退出
success:       '#248b5c'
warning:       '#b77800'
tabMuted:      '#9a92aa'    // 未选中 Tab 色

// 字号
title: 22, section: 24, body: 16, meta: 13

// 阴影
shadowColor: '#4c3575'，阴影偏移 (0, 6)，透明度 0.08，模糊 14
```

## 6. 数据类型

```ts
type TabKey = 'news' | 'standards' | 'recognition' | 'profile';

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  date: string;
  source: string;
  tone: 'blue' | 'green' | 'orange' | 'purple';   // 缩略图色调
};

type RecognitionMetric = {
  label: string;
  value: string;
  hint?: string;
};

type RecognitionResult = {
  id: string;
  imageUri: string;
  createdAt: string;
  grade: string;
  confidence: number;
  metrics: RecognitionMetric[];
  conclusion: string;
  isLocal: boolean;            // 是否仅本地临时记录
};

type UserSession = {
  username: string;
  token: string;
};
```

## 7. 前端配置（config.ts 结构）

```ts
export const appConfig = {
  apiBaseUrl: '',               // 待填入后端地址
  requestTimeoutMs: 15000,
  recognitionTimeoutMs: 30000,  // 识别接口超时更长
  mockWhenApiUnavailable: true, // apiBaseUrl 为空时走 mock 兜底

  auth: {
    tokenHeader: 'Authorization',
    tokenPrefix: 'Bearer',       // 请求头格式: Bearer xxx
  },

  endpoints: {
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    changePassword: '/auth/change-password',
    news: '/news',
    recognition: '/recognition',
    recognitionHistory: '/recognition/history',
    userProfile: '/user/profile',
  },

  recognition: {
    uploadFieldName: 'file',     // 后端接收的字段名（可选 file/image/photo）
    defaultFileName: 'cotton-sample.jpg',
    defaultMimeType: 'image/jpeg',
  },

  successCodes: [0, 200],       // 后端成功码
};
```

## 8. API 请求层设计

### 8.1 统一包装

需要实现一个 `requestJson<T>` 函数，功能：

- **URL 拼接**：`apiBaseUrl + path`
- **超时控制**：AbortController，默认 15s，识别接口 30s
- **Token 注入**：请求头 `Authorization: Bearer <token>`
- **Content-Type**：JSON 请求自动加 `Content-Type: application/json`，FormData 不加
- **响应解包**：后端返回 `{ code, message, data }` 格式，判断 `code` 是否在 `successCodes` 列表中，然后提取 `data` 字段
- **mock 兜底**：`apiBaseUrl` 未配置或网络不可用时走 mock

### 8.2 接口列表

```ts
api.login(username, password)         // POST /auth/login，返回 UserSession
api.register(username, password)      // POST /auth/register，返回 UserSession
api.logout(token)                     // POST /auth/logout
api.fetchNews()                       // GET  /news，返回 NewsItem[]
api.recognizeImage(imageFile, token?) // POST /recognition，FormData 上传，返回 RecognitionResult
api.fetchHistory(token)               // GET  /recognition/history，返回 RecognitionResult[]
api.deleteHistory(ids[], token)       // DELETE /recognition/history，body: { ids }
```

### 8.3 图片上传

- 前端通过 `<input type="file">` 获取 File 对象
- 构建 FormData，字段名 = `appConfig.recognition.uploadFieldName`（默认 `'file'`）
- 不设 Content-Type header（让浏览器自动生成 multipart boundary）
- 识别接口超时 30s

## 9. 本地缓存（localStorage 实现）

需要三个缓存 key：

| Key | 内容 | 说明 |
|---|---|---|
| `news_cache` | NewsItem[] | 新闻列表缓存 |
| `history_cache` | RecognitionResult[] | 本地临时识别记录 |
| `session_cache` | UserSession \| null | 登录状态 |

缓存策略：
- 启动时优先读缓存展示，后台请求后端刷新
- "清理缓存"（应用设置）只清除新闻缓存和本地识别记录，**保留登录状态**
- "退出登录"清除 session_cache

## 10. Mock 数据

### 10.1 新闻 Mock（4 条）

| title | summary | date | source | tone |
|---|---|---|---|---|
| 江门海关助力进口棉花快速投入生产 | 运用两步申报... | 2020-06-20 | 海关发布 | blue |
| 3年2万箱 黄岛海关创新进口棉花监管 | 黄岛口岸是全国... | 2023-08-28 | 口岸动态 | green |
| 淄博海关：助力棉花进口企业高质量发展 | 海关人员对进口... | 2024-12-09 | 地方海关 | orange |
| 棉花检验智能化应用持续扩展 | 围绕颜色级... | 2026-05-18 | 行业观察 | purple |

### 10.2 识别结果 Mock

```ts
{
  grade: '颜色级 21 / 叶屑 LG2',
  confidence: 0.92,
  conclusion: '当前为前端 mock 识别结果。真实接口接入后将展示后端返回的完整参数。',
  metrics: [
    { label: '反射率 Rd', value: '76.6%', hint: '基于 HVI 测试口径' },
    { label: '黄度 +b', value: '9.3', hint: '越高代表偏黄' },
    { label: '杂质面积', value: '0.20%', hint: '叶屑等级 LG2' },
    { label: '置信度', value: '92%', hint: '模型输出概率' },
  ],
}
```

### 10.3 历史记录 Mock

```ts
{
  grade: '颜色级 21 / 叶屑 LG2',
  confidence: 0.91,
  conclusion: '样品颜色与二级标准接近，杂质比例处于可接受范围。',
  metrics: [
    { label: '反射率 Rd', value: '76.6%' },
    { label: '黄度 +b', value: '9.3' },
    { label: '杂质面积', value: '0.20%' },
  ],
}
```

## 11. 各页面详细 UI 说明

### 11.1 前沿瞭望（/news）

**布局**：
- 顶部棉花大图 Banner（占位图或装饰色块）
- 搜索框：圆角胶囊形，左侧搜索图标，placeholder "搜索"
- 新闻卡片列表：横向布局（缩略图 + 正文）
  - 缩略图：根据 `tone` 显示不同颜色方块（blue/green/orange/purple），约 80x60px
  - 标题：粗体 20px
  - 摘要：灰色 16px，最多 3 行
  - 日期 + 来源：底部灰色小字
- 搜索无结果：显示"没有找到相关新闻"

### 11.2 分类标准（/standards）

纯静态内容，可离线查看。**白色背景**，结构如下：

```
标题栏：棉花智能(AI)识别采集说明（浅紫背景条）
一、颜色分级
  - 说明段落
  - 棉花实物标准数值（小标题）
  - 迷你示意图占位（色块图）
  - 颜色分级表格：
    | 级别 | 反射率(%) | 黄度(+b) | 备注 |
    | 一级(11) | 77.2 | 11.5 | 黄度偏高... |
    | 二级(21) | 76.6 | 9.3 | 21和31的交界处 |
    | 三级(31) | 75.5 | 8.0 | 颜色稳定... |
    | 四级(41) | 74.4 | 7.0 | 反射率继续降低 |
    | 五级(51) | 72.2 | 5.7 | 建议复核... |
    | 六级(61) | 70.1 | 4.8 | 低反射率样品 |
  - 备注说明框（浅紫背景）
二、杂质分级
  - 说明段落
  - 杂质分级表格：
    | 叶屑代码 | 叶屑等级 | 符号 | 杂质面积/% |
    | 1 | Leaf Grade 1 | LG1 | 0.12 |
    | 2 | Leaf Grade 2 | LG2 | 0.20 |
    | 3 | Leaf Grade 3 | LG3 | 0.33 |
    | 4 | Leaf Grade 4 | LG4 | 0.50 |
    | 5 | Leaf Grade 5 | LG5 | 0.68 |
    | 6 | Leaf Grade 6 | LG6 | 0.92 |
    | 7 | Leaf Grade 7 | LG7 | 1.21 |
    | 8 | Leaf Grade 8 | LG8 | >1.21 |
```

### 11.3 智能识别（/recognition）

**整体布局（上中下三段）**：
- **上方预览区**：占主要高度，浅蓝背景 `#ccdff3`
  - 未选图时：显示棉花装饰图（纯 CSS 或 SVG 占位）
  - 已选图时：显示完整预览图（object-fit: cover）
- **中间操作区**：深灰紫背景 `#9791a4`，三个操作按钮横向排列
  - 相册模式（图片图标 + 文字）
  - 相机圆按钮（白色胶囊形，居中突出）
  - 识别记录（图标 + 文字）
- **下方按钮区**：白色背景
  - 提示文字："拍摄或选择一张棉花图片后开始识别" / "图片已选择，可开始识别。"
  - "开始识别"按钮（主色，圆角），识别中显示"识别中..."并禁用

**交互**：
- PC 端：相机按钮调用 `<input type="file" capture="environment">`
- 移动端：相机按钮调用 `<input type="file" capture="environment">`，相册按钮调用 `<input type="file" accept="image/*">`
- 选图后自动跳转到预览 + 可识别状态
- 识别中显示 loading 状态
- 识别成功 → 跳转结果页，结果加入历史
- 识别失败 → alert 提示

### 11.4 识别结果（/recognition/result）

- 顶部导航栏："识别结果" 标题 + 返回按钮
- 原图展示区（圆角卡片，约 260px 高）
- 结果摘要卡片：
  - 左侧：标签"识别等级" + 等级文字（粗体21px）
  - 右侧：置信度圆形徽章（百分比，蓝色背景）
- 结论文字
- 指标网格（2 列布局）：
  - 每个指标卡片含标签、数值、提示说明
- 底部："重新选择图片"按钮

### 11.5 识别记录（/recognition/history）

- 顶部导航栏："识别记录" 标题 + 返回按钮
- 列表项（卡片式，横向）：
  - 左侧勾选圆（点击切换选中）
  - 缩略图（62x62，有图显示图，无图显示"AI"文字）
  - 右侧信息：等级标题、日期、置信度
  - 点击整行 → 进入该条结果详情
- 底部操作栏：
  - 左侧："全选"（勾选圆 + 文字）
  - 右侧："删除"按钮（红色），未选中时置灰
- 空状态："暂无识别记录"

### 11.6 我的信息（/profile）

**未登录状态**：
- 顶部登录/注册 Tab 切换（胶囊形切换条）
- 表单：
  - 账号/用户名输入框
  - 密码输入框（右侧显示/隐藏图标）
  - 注册模式多一个确认密码输入框
  - 提示文字（错误或成功信息）
  - 登录/注册按钮

**已登录状态**：
- 登录状态横幅（蓝色卡片）：
  - 对勾图标 + "已登录：{用户名}"
  - 说明文字
  - "退出登录"按钮（红色描边）

**功能入口卡片**（3 列，始终显示）：
- 编辑资料（Person Information）
- 我的收藏（Collection）
- 应用设置（Settings）

**底部链接**：
- 用户协议 | 隐私政策
- 客服电话：18967096861

### 11.7 编辑资料（/profile/edit）

- 顶部导航栏："编辑资料" + 返回
- 表单字段：用户名（显示但不能改）、昵称、手机号等
- 保存按钮

### 11.8 应用设置（/profile/settings）

- 顶部导航栏："应用设置" + 返回
- 功能列表：修改密码、检查更新、清理缓存、退出登录
- 退出登录需弹窗确认

### 11.9 我的收藏（/profile/collection）

- 顶部导航栏："我的收藏" + 返回
- 空内容："暂无收藏内容"

### 11.10 用户协议 / 隐私政策（/agreement/*）

- 顶部导航栏 + 返回
- 占位文字："第一版先展示占位内容。正式发布前需要补齐完整协议正文、数据使用范围、权限说明和联系方式。"

## 12. 全局状态管理

App 级状态（可用 React Context 或 useState + props）：

| 状态 | 类型 | 说明 |
|---|---|---|
| activeTab | TabKey | 当前选中 Tab |
| currentView | view 标识 | tabs / recognitionResult / recognitionHistory / editProfile / collection / settings / agreement |
| news | NewsItem[] | 新闻列表 |
| history | RecognitionResult[] | 识别记录 |
| session | UserSession \| null | 登录状态 |
| selectedImage | File \| null | 当前选中的图片文件 |
| isRecognizing | boolean | 识别中标识 |

## 13. 关键交互流程

### 13.1 启动流程
```
1. 读 localStorage：新闻缓存、历史记录缓存、session 缓存
2. 渲染缓存数据到页面
3. 后台请求后端新闻接口刷新
4. 成功后更新页面和缓存
```

### 13.2 识别流程
```
1. 用户点击相机/相册 → input[file] 对话框
2. 选择图片 → File 对象保存到状态 → 预览区显示
3. 点击"开始识别" → FormData 上传 → loading 状态
4. 成功 → 结果加到历史头部 → 跳转结果页
5. 失败 → alert 错误信息
```

### 13.3 登录流程
```
1. 填写账号密码 → 点击登录 → loading
2. 成功 → 保存 session 到状态和 localStorage → 显示已登录横幅
3. 失败 → 显示错误信息
```

### 13.4 退出登录流程
```
1. 点击退出 → 确认弹窗（"确认退出账号 xxx？"）
2. 确认 → 调用 logout 接口 → 清除 session → 回到未登录状态
```

### 13.5 清理缓存
```
1. 应用设置 → 清理缓存
2. 清除新闻缓存 + 本地识别记录
3. 保留登录状态
4. alert "已清理"
```

## 14. 字段适配

后端返回字段可能不统一，需要 normalizer 适配以下常见变体：

```text
登录 token：token / accessToken / jwt
新闻列表：list / records / data
新闻标题：title / newsTitle
新闻摘要：summary / description
识别等级：grade / colorGrade / leafGrade
置信度：confidence / score / probability
历史列表：list / records
```

## 15. 不做的功能

- 新闻详情页
- 新闻收藏（仅保留占位页面）
- 识别结果导出 / 报告 / PDF
- 收藏业务（仅保留占位页面）
- 用户协议 / 隐私政策实际内容（仅占位）
- 实时新闻爬取
- 修改密码 / 检查更新后端对接（UI 保留，接口待定）
- 编辑资料后端对接（UI 保留，接口待定）

## 16. 交付标准

- Web 前端项目源码
- `npm install && npm run dev` 可运行
- `npm run build` 可构建
- 接口配置说明（修改 apiBaseUrl 即可切换后端）
- 测试账号说明