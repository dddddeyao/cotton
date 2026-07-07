# apps

本目录用于存放面向用户的前端应用。

```text
apps/
  android/  # React Native / Expo Android 前端
```

Android 前端通过统一接口约定接入 `services/backend`。应用只使用真实接口数据和本地缓存，不再提供后端不可用时的本地替代演示数据。
