# apps

本目录用于存放面向用户的前端应用。

```text
apps/
  android/  # React Native / Expo Android 前端
```

Android 前端通过统一接口约定接入 `services/backend`，并保留 mock / 缓存兜底能力，便于在后端不可用时独立演示。
