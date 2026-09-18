# 方案：让 App 支持在应用内配置服务器地址（暂缓实施）

> 状态：**已设计并实现过一版，随后按要求回滚**。本文档保留方案与实现要点，后续需要时可直接恢复。
>
> 相关提交：`8696093`（feat(android): 服务器地址支持在 App 内配置与自动搜索）
> 恢复方式：`git cherry-pick 8696093`
> 回滚提交：`7a7df7a`

---

## 一、要解决的问题

当前 APK 的后端地址是**编译期写死**的：

```
apps/android/.env.local
  EXPO_PUBLIC_API_BASE_URL=http://192.168.1.123:8088
```

打包时由 `build-apk-lan.ps1 -LanIP <IP>` 写入，并被 Expo 内联进 JS bundle。

**后果**：每换一台部署电脑、每换一个网段，都必须重新打包 APK 并让所有人重装。
出差部署时，一旦现场 IP 和预期不一致，就要现场重新打包（需要 Android SDK + 3~8 分钟构建），非常被动。

## 二、目标

1. **地址可调**：在 App 内就能修改后端地址，改完立即生效，无需重装。
2. **自动识别**：最好能自动找到局域网内的后端，使用者不用知道 IP。
3. **一次打包**：一个 APK 走遍所有部署现场。

## 三、方案设计

### 3.1 地址解析优先级

```
用户在 App 内保存的地址（AsyncStorage）
        ↓ 没有时
打包时的默认值（EXPO_PUBLIC_API_BASE_URL）
        ↓ 也没有时
进入「服务器地址」引导页
```

### 3.2 地址规范化

用户输入可能五花八门，统一处理：

| 输入 | 规范化结果 |
|---|---|
| `192.168.1.123` | `http://192.168.1.123:8088` |
| `192.168.1.123:9000` | `http://192.168.1.123:9000` |
| `http://192.168.1.123:8088/` | `http://192.168.1.123:8088` |

规则：补 `http://`、去尾部斜杠、未写端口时补默认 `8088`。

### 3.3 自动搜索原理

1. 用 `expo-network` 的 `getIpAddressAsync()` 拿到**手机自身 IP**，例如 `192.168.1.55`
2. 推导出所在 `/24` 网段：`192.168.1.x`
3. 对该网段 `1~254` 并发请求 `http://<ip>:8088/health`（并发 48、单个超时 1.2s）
4. 第一个返回成功的即为服务器地址；手机网段未命中时，再兜底扫描 `192.168.1.x`、`192.168.0.x`

> 实测：同一网段内一般 **3~8 秒**出结果。

### 3.4 交互设计

设置页新增「服务器地址」入口，进入后有：

- 输入框（预填当前地址）
- **保存并测试连接**：先探测 `/health`，失败时明确提示是网络不通还是地址错误
- **自动搜索服务器**：一键扫描
- 底部附「怎么查看电脑 IP」说明（Windows `ipconfig` / Linux `hostname -I`）

首次启动且没有任何可用地址时，自动跳到该页面引导填写。

## 四、实现要点（供恢复时参考）

| 文件 | 改动 |
|---|---|
| `src/services/serverConfig.ts` | **新增**。地址规范化、读写 AsyncStorage、`/health` 探测、网段并发扫描 |
| `src/screens/ServerSetupScreen.tsx` | **新增**。设置界面 |
| `src/config.ts` | 增加 `setRuntimeApiBaseUrl()` / `getApiBaseUrl()` / `getDefaultApiBaseUrl()`，支持运行时覆盖 |
| `src/services/http.ts` | `buildUrl()` 改用 `getApiBaseUrl()` |
| `src/screens/SettingsScreen.tsx` | 新增「服务器地址」行 |
| `src/types.ts` | `AppView` 增加 `{ name: 'serverSetup' }` |
| `App.tsx` | 启动时读取本地地址并生效；无地址时跳引导页；新增路由 |
| `build-apk-lan.ps1` | `-LanIP` 改为可选；不传时构建「通用版」APK（地址留空，命名为 `cotton-recognition.apk`） |
| `package.json` | 新增依赖 `expo-network`（原生模块，需重新构建 APK） |

关键代码骨架：

```ts
// config.ts —— 运行时可覆盖的地址
let runtimeApiBaseUrl = '';
export function setRuntimeApiBaseUrl(url: string) { runtimeApiBaseUrl = trimTrailingSlash(url); }
export function getApiBaseUrl(): string { return runtimeApiBaseUrl || appConfig.apiBaseUrl; }

// App.tsx —— 启动时决定用哪个地址
const storedServerUrl = await getStoredServerUrl();
const initialServerUrl = storedServerUrl || getDefaultApiBaseUrl();
if (initialServerUrl) setRuntimeApiBaseUrl(initialServerUrl);
else setView({ name: 'serverSetup' });
```

## 五、注意事项与风险

1. **引入了原生模块 `expo-network`**
   必须重新构建 APK（`gradlew` 会自动链接），不能只做 JS 热更新。若目标环境构建链路不稳定，这是主要风险点。

2. **自动搜索只在同一网段有效**
   手机与电脑不在同一 `/24`（例如跨 VLAN）时会失败，此时需手动填写地址。

3. **切换服务器后登录态失效**
   换了后端地址，旧的 token 属于另一台服务器，需要重新登录。实现时可在保存新地址后清除本地 session。

4. **扫描会产生 254~762 次并发请求**
   属正常行为，但个别企业网络可能触发安全告警，必要时可关闭「自动搜索」只保留手动填写。

## 六、暂缓实施的原因

- 当前主流程（部署 + 识别）已经跑通，交接在即，优先保证**稳定性**，不在交付前引入原生依赖与新交互。
- 现阶段的替代做法：**现场用 `.\build-apk-lan.ps1 -LanIP <现场IP>` 重新打包**，或在部署前确认现场网段与预置 IP 一致。

## 七、恢复步骤（将来需要时）

```bash
git cherry-pick 8696093      # 恢复该功能
cd apps/android && npm install   # 装回 expo-network
# 然后重新构建 APK
```
