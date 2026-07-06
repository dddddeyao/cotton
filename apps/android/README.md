# 棉花识别助手 Android 前端

基于 Expo + React Native + TypeScript 的 Android 客户端，包含前沿瞭望、分类标准、智能识别、识别记录和我的信息等页面。

## 运行

```bash
npm install
npm run start
npm run typecheck
```

## 接口配置

复制 `.env.example` 为 `.env.local`：

```text
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE=true
```

留空时应用直接使用 mock 数据，适合界面演示。真机联调或正式打包时改为公网域名、服务器 IP 或局域网 IP，例如：

```text
EXPO_PUBLIC_API_BASE_URL=https://cotton.example.com
EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE=false
```

不要在真机上使用 `localhost` 作为后端地址；它通常会指向手机自身，而不是电脑或服务器。
