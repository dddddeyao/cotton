# 棉花识别助手确认与待确认清单

## 已确认

```text
1. 后端技术栈：Spring Boot 3.1 + MySQL + JWT；模型服务为 Flask + PyTorch。
2. 后端项目路径：services/backend。
3. 本地后端默认地址：http://localhost:8080。
4. Docker 生产入口：Android 端直接访问 Spring Boot 后端 API。
5. 登录响应字段：统一响应 data.username 与 data.token，前端也兼容 accessToken/jwt。
6. token 请求头：Authorization: Bearer <token>。
7. 注册字段：username/password。
8. 修改密码接口：POST /auth/change-password，需要登录。
9. 退出登录接口：POST /auth/logout，当前后端无状态返回成功，前端清除本地会话。
10. 识别上传字段名：file，可通过前端环境变量调整。
11. 识别接口：POST /recognition；兼容旧入口 POST /api/v1/upload。
12. 识别记录：GET /recognition/history，需要登录。
13. 删除识别记录：DELETE /recognition/history，支持批量 body: { ids: number[] }。
14. 历史记录点击详情：Android 支持。
```

## 仍待业务确认

```text
1. token 过期后前端是否只提示重新登录，还是后续增加刷新 token。
2. 新闻来源由谁维护，是否需要后台录入或定时同步外部来源。
3. 新闻封面图是否需要真实图片素材。
4. 识别返回结果是否还要补充更多业务字段，例如颜色级、叶屑等级、置信度、叠加图、检测框、人工复核状态。
5. 识别失败的正式提示文案和客服/排查入口。
6. 是否允许前端上传前自动压缩图片，以及压缩质量要求。
7. 未登录识别记录是否需要登录后自动同步到账号。
8. 分类标准原始资料和图片的最终来源。
9. 除颜色分级、叶屑等级外，是否还要增加其他标准内容。
10. App 图标、启动页和品牌视觉是否采用当前素材，还是替换为正式设计稿。
11. 主要测试机型、Android 最低版本和未来上架渠道。
```
