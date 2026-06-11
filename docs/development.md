# 前端开发说明

## 工程位置

```text
app/
```

## 技术栈

```text
Expo SDK 56
React Native
TypeScript
expo-image-picker
@react-native-async-storage/async-storage
```

## 运行命令

```text
cd app
npm install
npm run start
```

## 当前页面

```text
前沿瞭望：mock 新闻、搜索、本地缓存占位
分类标准：颜色分级、杂质分级、标准表格
智能识别：拍照、相册选择、图片预览、mock 识别结果
识别记录：列表、详情、全选、批量删除
我的信息：登录、注册、编辑资料、收藏占位、设置、协议占位
```

## 代码结构

```text
app/App.tsx                 # 全局状态、页面分发、图片选择和识别入口
app/src/screens/            # 各业务页面
app/src/components/         # Tab、通用按钮、表格、视觉组件
app/src/data/mockData.ts    # mock 新闻、标准表格、识别结果
app/src/services/api.ts     # 后端接口适配层
app/src/services/http.ts    # 统一请求、超时、token、统一返回格式解析
app/src/services/normalizers.ts # 后端字段到前端展示模型的适配
app/src/storage/cache.ts    # 本地缓存
app/src/config.ts           # 后端地址、接口路径、上传字段名、超时时间
app/src/theme.ts            # 颜色、间距、阴影等样式常量
```

## 接口适配位置

```text
app/src/services/api.ts
```

当前 `app/src/config.ts` 中 `apiBaseUrl` 为空，因此新闻、登录、识别会走 mock 兜底。后端地址确认后，先补：

```ts
export const appConfig = {
  apiBaseUrl: 'http://your-backend-host',
  // ...
};
```

然后按真实字段调整：

```text
POST /auth/login
POST /auth/logout
POST /auth/register
GET  /news
POST /recognition
GET  /recognition/history
DELETE /recognition/history/:id
```

## 图片上传配置

智能识别上传字段名在：

```text
app/src/config.ts
```

默认值：

```ts
recognition: {
  uploadFieldName: 'file',
  defaultFileName: 'cotton-sample.jpg',
  defaultMimeType: 'image/jpeg',
}
```

如果后端要求字段名是 `image` 或 `photo`，只改 `uploadFieldName`。

## 字段适配

后端返回字段不一致时，优先改：

```text
app/src/services/normalizers.ts
```

当前已兼容的常见字段包括：

```text
登录：token / accessToken / jwt
新闻：list / records / title / newsTitle / summary / description
识别：grade / colorGrade / leafGrade / confidence / score / probability
历史：list / records
```

## 清理缓存策略

应用设置里的“清理缓存”只清除：

```text
新闻缓存
本地临时识别记录
```

不会清除登录状态；退出登录由“退出登录”单独处理。

## 本地缓存

缓存封装在：

```text
app/src/storage/cache.ts
```

当前缓存内容：

```text
新闻列表
本地临时识别记录
登录 session
```

## 素材参考

鸿蒙端截图已复制到：

```text
assets/references/
```

这些截图只作为视觉参考，正式 App 内部图片仍建议使用原始棉花、分类标准图表、App 图标素材。
