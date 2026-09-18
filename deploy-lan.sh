#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  棉花智能识别系统 — Linux 局域网一键部署脚本
#
#  用法：
#    chmod +x deploy-lan.sh
#    sudo ./deploy-lan.sh              # 自动检测局域网 IP
#    sudo ./deploy-lan.sh -i 192.168.1.100  # 指定 IP
#    sudo ./deploy-lan.sh -p 8080      # 指定后端端口（默认 8088）
#
#  前置要求：
#    - Docker Engine 24+ 已安装
#    - docker compose 插件已安装（docker compose version）
#    - nvidia-container-toolkit（如有 GPU，否则用 CPU）
# ============================================================

# ── 全局变量 ──
LAN_IP=""
BACKEND_PORT="8088"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.linux.yml"
SERVICE_NAME="cotton-recognition"

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}==>${NC} $1"; }
ok()   { echo -e "  ${GREEN}[OK]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "  ${RED}[ERR]${NC} $1"; }

# ── 参数解析 ──
while getopts "i:p:h" opt; do
  case $opt in
    i) LAN_IP="$OPTARG" ;;
    p) BACKEND_PORT="$OPTARG" ;;
    h)
      echo "用法: $0 [-i <IP>] [-p <端口>]"
      echo "  -i  指定局域网 IP（默认自动检测）"
      echo "  -p  后端 API 端口（默认 8088）"
      exit 0
      ;;
    *) exit 1 ;;
  esac
done

# ──────────────────────────────────────────────
# 0. Root 检查
# ──────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  warn "部分功能（firewall、systemd）需要 root 权限"
  warn "建议: sudo $0 $*"
fi

# ──────────────────────────────────────────────
# 1. 检测局域网 IP
# ──────────────────────────────────────────────
log "检测局域网 IP..."
if [[ -z "$LAN_IP" ]]; then
  # 优先取非 docker/vmware 的局域网 IP
  LAN_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+\.\d+\.\d+\.\d+' \
    | grep -v '^127\.' | grep -v '^172\.' | grep -v '^169\.254' \
    | head -1)
  if [[ -z "$LAN_IP" ]]; then
    LAN_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+\.\d+\.\d+\.\d+' \
      | grep -v '^127\.' | head -1)
  fi
  if [[ -z "$LAN_IP" ]]; then
    err "无法自动检测局域网 IP，请用 -i 参数指定"
    exit 1
  fi
fi
ok "局域网 IP: ${LAN_IP}:${BACKEND_PORT}"

echo -e "  ${YELLOW}⚠ 共用电脑提醒：本脚本不会修改网络配置（不改 IP / DNS / 路由），${NC}"
echo -e "  ${YELLOW}  不影响他人使用。若 IP 为动态分配，重启后可能变化，${NC}"
echo -e "  ${YELLOW}  届时需重新构建 APK。请勿在共用电脑上设置静态 IP。${NC}"
read -rp "  确认继续使用 ${LAN_IP}？[Y/n] " confirm
if [[ "$confirm" =~ ^[nN] ]]; then
  err "已取消"
  exit 1
fi

# ──────────────────────────────────────────────
# 2. 检查前置依赖
# ──────────────────────────────────────────────
log "检查前置依赖..."

command -v docker &>/dev/null || { err "docker 未安装"; exit 1; }
ok "Docker: $(docker --version)"

docker compose version &>/dev/null || { err "docker compose 未安装"; exit 1; }
ok "docker compose: $(docker compose version)"

# 检查 GPU（必须同时满足：有显卡 + Docker 已配置 nvidia runtime，否则回退 CPU）
if nvidia-smi &>/dev/null; then
  if docker info 2>/dev/null | grep -qi 'nvidia'; then
    ok "NVIDIA GPU 可用（Docker 已配置 nvidia runtime）"
    HAS_GPU=true
  else
    warn "检测到 NVIDIA GPU，但 Docker 未配置 nvidia runtime"
    warn "本次将使用 CPU 推理；如需 GPU 加速，请先安装 nvidia-container-toolkit 后重跑本脚本"
    HAS_GPU=false
  fi
else
  warn "未检测到 NVIDIA GPU，将使用 CPU 推理（速度较慢）"
  HAS_GPU=false
fi

# ── 端口占用检查（避免与他人服务冲突）──
if command -v ss &>/dev/null && ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${BACKEND_PORT}$"; then
  if ! docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "${BACKEND_PORT}->"; then
    warn "端口 ${BACKEND_PORT} 已被本机其它服务占用"
    warn "为避免影响他人，建议改用其它端口，例如: sudo $0 -p 8090"
    read -rp "  仍要使用 ${BACKEND_PORT}？[y/N] " force_port
    [[ "$force_port" =~ ^[yY] ]] || { err "已取消"; exit 1; }
  fi
fi

# ──────────────────────────────────────────────
# 3. 检查模型文件
# ──────────────────────────────────────────────
log "检查模型文件..."
MODEL_DIR="$PROJECT_DIR/services/backend/model-service-python"
for f in fourtime-best.pth fenge_best.pth impurityarea_best.pth; do
  if [[ -f "$MODEL_DIR/$f" ]]; then
    ok "模型文件: $f"
  else
    err "模型文件缺失: $MODEL_DIR/$f"
    exit 1
  fi
done

# ──────────────────────────────────────────────
# 4. 检查防火墙（仅在防火墙已启用时追加一条放行，不改变其开关状态）
# ──────────────────────────────────────────────
log "检查防火墙..."
if command -v ufw &>/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "$BACKEND_PORT/tcp" >/dev/null 2>&1 && ok "ufw 已放行 TCP/$BACKEND_PORT" \
    || warn "ufw 放行失败，请手动执行: sudo ufw allow $BACKEND_PORT/tcp"
elif command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
  firewall-cmd --permanent --add-port="$BACKEND_PORT/tcp" >/dev/null 2>&1 && \
  firewall-cmd --reload >/dev/null 2>&1 && ok "firewalld 已放行 TCP/$BACKEND_PORT" \
    || warn "firewalld 放行失败，请手动放行 TCP/$BACKEND_PORT"
else
  ok "未检测到已启用的 ufw/firewalld，未做任何防火墙改动"
  warn "若手机无法访问，请手动放行 TCP/$BACKEND_PORT（不要为此关闭防火墙）"
fi

# ──────────────────────────────────────────────
# 5. 启动 Docker 服务
# ──────────────────────────────────────────────
log "启动 Docker 服务..."
cd "$PROJECT_DIR"

# 如果没有 GPU，去掉 GPU 配置
if ! $HAS_GPU; then
  export COMPOSE_FILE="docker-compose.yml"
  COMPOSE_ARGS="-f $PROJECT_DIR/docker-compose.yml"
  warn "使用 CPU 模式运行（模型推理速度较慢）"
else
  export COMPOSE_FILE="docker-compose.yml:docker-compose.linux.yml"
  COMPOSE_ARGS="-f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.linux.yml"
fi

# 生成 / 修正 .env
if [[ ! -f ".env" ]] && [[ -f ".env.lan.example" ]]; then
  sed -e "s/LAN_HOST_IP=.*/LAN_HOST_IP=$LAN_IP/" \
      -e "s/BACKEND_PUBLIC_PORT=.*/BACKEND_PUBLIC_PORT=$BACKEND_PORT/" \
      .env.lan.example > .env
  ok ".env 已由模板生成"
fi

if [[ -f ".env" ]]; then
  # 本机相关配置（无论新建还是已存在都对齐）
  sed -i "s|^LAN_HOST_IP=.*|LAN_HOST_IP=$LAN_IP|" .env
  sed -i "s|^BACKEND_PUBLIC_PORT=.*|BACKEND_PUBLIC_PORT=$BACKEND_PORT|" .env
  # Linux 下模型服务运行在容器内，后端经 Docker 内部网络访问
  if grep -q '^PYTHON_SERVICE_URL=' .env; then
    sed -i "s|^PYTHON_SERVICE_URL=.*|PYTHON_SERVICE_URL=http://model-service:5000|" .env
  else
    sed -i -e '$a\' .env
    echo "PYTHON_SERVICE_URL=http://model-service:5000" >> .env
  fi
  # 补全 JWT_SECRET（Docker Compose 要求必须显式配置）
  if ! grep -q '^JWT_SECRET=.\+' .env; then
    JWT=$(head -c 48 /dev/urandom | base64)
    if grep -q '^JWT_SECRET=' .env; then
      sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" .env
    else
      sed -i -e '$a\' .env
      echo "JWT_SECRET=$JWT" >> .env
    fi
    ok "JWT_SECRET 已自动生成"
  fi
  ok ".env 已就绪（LAN_HOST_IP=$LAN_IP, BACKEND_PUBLIC_PORT=$BACKEND_PORT）"
fi

log "拉取 & 构建 Docker 镜像..."
docker compose pull 2>/dev/null || true
docker compose build 2>&1 | tail -5

log "启动服务..."
docker compose up -d

# 等待健康检查
log "等待服务健康检查（最多 90 秒）..."
for i in $(seq 1 30); do
  HEALTHY=$(docker compose ps --format "{{.Name}} {{.Status}}" 2>/dev/null | grep -c 'healthy' || true)
  if [[ "$HEALTHY" -ge 2 ]]; then
    ok "所有服务健康检查通过"
    break
  fi
  sleep 3
done

# ──────────────────────────────────────────────
# 6. 开机自启（可选；共用电脑建议不启用）
# ──────────────────────────────────────────────
log "开机自启（可选）..."
echo -e "  ${YELLOW}注册 systemd 服务会在开机时自动启动容器，并常驻占用内存/GPU。${NC}"
echo -e "  ${YELLOW}若这台电脑与他人共用，建议选择「不启用」，需要时手动启动即可。${NC}"
read -rp "  是否注册开机自启？[y/N] " enable_boot
if [[ "$enable_boot" =~ ^[yY] ]]; then
  SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
  if [[ -f "$SERVICE_FILE" ]]; then
    ok "systemd 服务已存在: ${SERVICE_NAME}.service"
  else
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Cotton Recognition System (Docker Compose)
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/docker compose $COMPOSE_ARGS up -d
ExecStop=/usr/bin/docker compose $COMPOSE_ARGS down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}.service" >/dev/null 2>&1
    ok "systemd 服务已注册: ${SERVICE_NAME}.service"
  fi
  warn "如需取消: sudo systemctl disable --now ${SERVICE_NAME}.service"
else
  ok "已跳过开机自启（不影响他人；需要时手动执行 docker compose up -d）"
fi

# ──────────────────────────────────────────────
# 7. 验证
# ──────────────────────────────────────────────
log "验证服务..."
sleep 5
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}/health"
MODEL_URL="http://127.0.0.1:5000/health"

echo ""
if curl -sf "$BACKEND_URL" > /dev/null 2>&1; then
  ok "后端 API: $BACKEND_URL → 正常"
else
  warn "后端 API 尚未就绪，稍后检查: curl $BACKEND_URL"
fi

if curl -sf "$MODEL_URL" > /dev/null 2>&1; then
  ok "模型服务: $MODEL_URL → 正常"
else
  warn "模型服务尚未就绪，稍后检查: curl $MODEL_URL"
fi

# ──────────────────────────────────────────────
# 8. 部署摘要
# ──────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "  ${GREEN}│              棉花智能识别系统 — Linux 部署完成               │${NC}"
echo -e "  ${GREEN}├────────────────────────────────────────────────────────────┤${NC}"
printf "  ${GREEN}│  ${NC}后端地址:        http://%s:%-44d${GREEN}│${NC}\n" "$LAN_IP" "$BACKEND_PORT"
printf "  ${GREEN}│  ${NC}健康检查:        http://%s:%d/health       ${GREEN}│${NC}\n" "$LAN_IP" "$BACKEND_PORT"
echo -e "  ${GREEN}│  ${NC}模型服务:        http://127.0.0.1:5000/health          ${GREEN}│${NC}"
echo -e "  ${GREEN}│  ${NC}服务状态:        docker compose ps                     ${GREEN}│${NC}"
echo -e "  ${GREEN}│  ${NC}日志查看:        docker compose logs -f                   ${GREEN}│${NC}"
echo -e "  ${GREEN}└────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${YELLOW}手机端配置:${NC}"
echo -e "    1. 手机连接与电脑同一个 WiFi"
echo -e "    2. 用浏览器打开 http://${LAN_IP}:${BACKEND_PORT}/health 确认可访问"
echo -e "    3. APK 需用 ${LAN_IP} 重新构建，联系开发人员生成"
echo ""
echo -e "  ${YELLOW}常用命令（在项目目录下执行）:${NC}"
echo -e "    启动:    docker compose $COMPOSE_ARGS up -d"
echo -e "    停止:    docker compose $COMPOSE_ARGS down    # 用完即停，释放内存/GPU"
echo -e "    状态:    docker compose ps"
echo -e "    日志:    docker compose logs -f"
if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
  echo -e "    自启服务: sudo systemctl restart|stop ${SERVICE_NAME}.service"
fi
echo ""
echo -e "  ${YELLOW}完全卸载（恢复电脑原状，不影响他人）:${NC}"
echo -e "    ./undeploy-lan.sh"
echo ""
echo -e "  ${YELLOW}部署后需要做的:${NC}"
echo -e "    1. 将本机的 LAN IP（${LAN_IP}）告知开发人员"
echo -e "    2. 开发人员用此 IP 重新构建 APK"
echo -e "    3. 将 APK 传给手机安装即可使用"
echo ""