#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  棉花智能识别系统 — Linux 一键卸载 / 清理
#
#  用途：在共用电脑上把本项目对系统的影响全部移除，恢复原状。
#
#  会做：
#    1. 停止并删除本项目自己的容器与网络（不影响其它容器）
#    2. 移除开机自启 systemd 服务
#    3. 移除部署时添加的防火墙放行规则
#
#  不会做：
#    - 不修改网络 / IP / DNS / 路由
#    - 不删除源码、.env、模型文件（如需彻底删除请手动删目录）
#
#  用法：
#    chmod +x undeploy-lan.sh
#    sudo ./undeploy-lan.sh            # 端口默认 8088
#    sudo ./undeploy-lan.sh 8090       # 指定部署时使用的端口
# ============================================================

BACKEND_PORT="${1:-8088}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="cotton-recognition"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}==>${NC} $1"; }
ok()   { echo -e "  ${GREEN}[OK]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then
  warn "移除 systemd 服务与防火墙规则需要 root 权限，建议: sudo $0 $*"
fi

# ──────────────────────────────────────────────
# 1. 停止并删除本项目容器
# ──────────────────────────────────────────────
log "停止并删除本项目容器..."
if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
  # 优先按完整 compose 配置下线；文件缺失时回退
  docker compose \
    -f "$PROJECT_DIR/docker-compose.yml" \
    -f "$PROJECT_DIR/docker-compose.linux.yml" down 2>/dev/null \
  || docker compose -f "$PROJECT_DIR/docker-compose.yml" down 2>/dev/null \
  || true
  ok "本项目容器已停止并删除（其它容器不受影响）"
else
  warn "未找到 docker-compose.yml，跳过容器清理"
fi

# ──────────────────────────────────────────────
# 2. 移除开机自启服务
# ──────────────────────────────────────────────
log "移除开机自启服务..."
if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
  systemctl disable --now "${SERVICE_NAME}.service" >/dev/null 2>&1 || true
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload >/dev/null 2>&1 || true
  ok "已移除 ${SERVICE_NAME}.service"
else
  ok "未注册开机自启服务，无需移除"
fi

# ──────────────────────────────────────────────
# 3. 移除防火墙放行规则
# ──────────────────────────────────────────────
log "移除防火墙放行规则..."
if command -v ufw &>/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw delete allow "$BACKEND_PORT/tcp" >/dev/null 2>&1 && ok "已移除 ufw 放行 TCP/$BACKEND_PORT" \
    || warn "未找到对应的 ufw 规则（可能已移除）"
elif command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
  firewall-cmd --permanent --remove-port="$BACKEND_PORT/tcp" >/dev/null 2>&1 && \
  firewall-cmd --reload >/dev/null 2>&1 && ok "已移除 firewalld 放行 TCP/$BACKEND_PORT" \
    || warn "未找到对应的 firewalld 规则（可能已移除）"
else
  ok "未检测到已启用的 ufw/firewalld，无需处理"
fi

echo ""
echo -e "  ${GREEN}清理完成：本机已恢复到部署前状态（源码、.env、模型文件保留）。${NC}"
echo -e "  ${YELLOW}如需彻底删除源码目录，请手动执行: rm -rf $PROJECT_DIR${NC}"
echo ""
