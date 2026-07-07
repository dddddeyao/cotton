# 棉花识别助手后端

后端由 Spring Boot API 服务和 Python Flask 模型推理服务组成。

## 技术栈

- Java 17+
- Spring Boot 3.1
- Spring Security + JWT
- Spring Data JPA + MySQL
- Flask + PyTorch 模型推理服务

## 目录结构

```text
services/backend/
  src/main/java/                  # Spring Boot 源码
  src/main/resources/             # 应用配置
  model-service-python/           # Python 模型推理服务
  pom.xml                         # Maven 配置
```

## 配置

默认配置位于 `src/main/resources/application.yml`：

- Spring Boot 端口：`8080`
- MySQL 数据库：`cotton_db`
- Python 推理服务：`http://127.0.0.1:5000`

生产环境请通过环境变量或外部配置覆盖数据库账号、密码、JWT 密钥、Python 服务地址和 CORS 来源；`JWT_SECRET` 没有可用默认值，必须显式设置：

```text
SERVER_PORT
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
JWT_SECRET
JWT_EXPIRATION
PYTHON_SERVICE_URL
PYTHON_SERVICE_CONNECT_TIMEOUT_MS
PYTHON_SERVICE_READ_TIMEOUT_MS
APP_UPLOAD_DIR
APP_CORS_ALLOWED_ORIGINS
APP_CORS_ALLOW_CREDENTIALS
```

`JWT_SECRET` 必须是 Base64 编码且解码后至少 32 字节，可用 `openssl rand -base64 32` 生成。

## 运行

先启动 Python 模型服务：

```bash
cd services/backend/model-service-python
pip install -r requirements.txt
python model_service2.py
```

再启动 Spring Boot：

```bash
cd services/backend
./mvnw spring-boot:run
```

Windows PowerShell：

```bash
cd services/backend
.\mvnw.cmd spring-boot:run
```

## 接口模块

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /news`
- `POST /recognition`
- `GET /recognition/history`
- `DELETE /recognition/history`
- `GET /uploads/{filename}`
- `GET /user/profile`
- `PUT /user/profile`
- `GET /health`

## 注意事项

- 识别上传图片会保存到 `APP_UPLOAD_DIR`，默认本地目录为 `uploads/`；Docker 部署时挂载到 `/app/uploads`。
- 识别记录中的 `imageUri` 会返回 `/uploads/{filename}`，Android 端按后端基础地址拼接访问。
- `target/`、`.idea/`、`uploads/` 为本地构建或运行产物，不应提交。
- `*.pth` 模型权重文件体积较大，不应提交到 Git，可通过本地文件、对象存储或发布包单独交付。
