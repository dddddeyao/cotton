FROM eclipse-temurin:17-jdk-alpine AS build

# Alpine apk 源 → 清华镜像，避免构建时下载卡死
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apk/repositories

WORKDIR /workspace

COPY .mvn .mvn
COPY mvnw pom.xml settings.xml ./
RUN chmod +x mvnw
# Maven 依赖走阿里云镜像（见 settings.xml），首次构建需下载较多依赖
RUN ./mvnw -q -DskipTests -s settings.xml dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests -s settings.xml package

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

ENV SERVER_PORT=8080

RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apk/repositories \
    && apk add --no-cache wget

COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
