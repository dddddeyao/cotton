#!/usr/bin/env bash
# ============================================================
#  棉花识别系统 — 一键设置服务器静态 IP（Linux）
#
#  用法（不需要 chmod，直接用 bash 运行）：
#    sudo bash tools/set-static-ip.sh -i 192.168.1.123
#    sudo bash tools/set-static-ip.sh -i 192.168.1.123 -g 192.168.1.1 -n eth0 -y
#
#  参数：
#    -i  要设置的静态 IP（必填）
#    -g  网关（默认自动读取当前默认网关）
#    -n  网卡名（默认自动检测承载默认路由的网卡）
#    -d  DNS（默认 114.114.114.114,8.8.8.8）
#    -y  使用 netplan apply（跳过交互确认；远程操作不推荐）
#
#  三道安全机制：
#    1. 改配置前自动备份（同目录 .bak-时间戳）
#    2. ping 目标 IP，若已被别的设备占用则直接中止
#    3. Ubuntu 默认走 `netplan try`：120 秒内不确认会自动回滚，不会把 SSH 关在门外
#
#  做完之后：App 内填 http://<该IP>:8088 一次即可，以后不用再改。
# ============================================================
set -euo pipefail

STATIC_IP=""
GATEWAY=""
IFACE=""
DNS="114.114.114.114,8.8.8.8"
USE_TRY=1
STAMP="$(date +%Y%m%d-%H%M%S)"

usage() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -n 22
  exit 0
}

while getopts "i:g:n:d:yh" opt; do
  case $opt in
    i) STATIC_IP="$OPTARG" ;;
    g) GATEWAY="$OPTARG" ;;
    n) IFACE="$OPTARG" ;;
    d) DNS="$OPTARG" ;;
    y) USE_TRY=0 ;;
    h) usage ;;
    *) usage ;;
  esac
done

log()  { echo -e "\033[0;36m==>\033[0m $1"; }
ok()   { echo -e "  \033[0;32m[OK]\033[0m $1"; }
warn() { echo -e "  \033[1;33m[WARN]\033[0m $1"; }
err()  { echo -e "  \033[0;31m[ERR]\033[0m $1"; }

# ── 0. 参数与权限 ──
if [[ -z "$STATIC_IP" ]]; then
  err "必须用 -i 指定要设置的静态 IP，例如：sudo bash $0 -i 192.168.1.123"
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  err "需要 root 权限，请用 sudo 运行"
  exit 1
fi

# ── 1. 自动检测网卡 / 网关 / 掩码 ──
if [[ -z "$IFACE" ]]; then
  IFACE="$(ip -4 route get 1.1.1.1 2>/dev/null | grep -oP 'dev \K\S+' | head -1 || true)"
  [[ -z "$IFACE" ]] && IFACE="$(ip -4 route | awk '/default/ {print $5; exit}')"
fi

if [[ -z "$GATEWAY" ]]; then
  GATEWAY="$(ip -4 route | awk '/default/ {print $3; exit}')"
fi

if [[ -z "$IFACE" || -z "$GATEWAY" ]]; then
  err "无法自动检测网卡或网关，请用 -n <网卡> -g <网关> 手动指定"
  exit 1
fi

PREFIX="$(ip -4 -o addr show dev "$IFACE" | awk '{print $4}' | awk -F/ '{print $2}' | head -1)"
[[ -z "$PREFIX" ]] && PREFIX=24
CURRENT_IP="$(ip -4 -o addr show dev "$IFACE" | awk '{print $4}' | awk -F/ '{print $1}' | head -1)"

log "网卡: $IFACE   当前 IP: ${CURRENT_IP:-无}   掩码前缀: /$PREFIX   网关: $GATEWAY"
log "目标静态 IP: $STATIC_IP"

# ── 2. 冲突检测 ──
if [[ "$STATIC_IP" != "$CURRENT_IP" ]]; then
  if ping -c 2 -W 1 "$STATIC_IP" >/dev/null 2>&1; then
    err "IP $STATIC_IP 已被其它设备占用（ping 有响应），请换一个未使用的 IP"
    exit 1
  fi
  ok "IP $STATIC_IP 未被占用，可以安全使用"
else
  warn "目标 IP 与当前 IP 相同，仅把配置方式从 DHCP 改为静态"
fi

# ── 3. 写入配置 ──
if command -v netplan >/dev/null 2>&1 && [[ -d /etc/netplan ]] && ! systemctl is-active --quiet NetworkManager 2>/dev/null; then
  # ---- 方案 A：Ubuntu / netplan（独立文件，不覆盖系统原有配置）----
  CONF="/etc/netplan/99-cotton-static.yaml"
  [[ -f "$CONF" ]] && cp "$CONF" "$CONF.bak-$STAMP" && ok "已备份旧配置: $CONF.bak-$STAMP"

  DNS_BLOCK=""
  IFS=',' read -ra DNS_ARR <<< "$DNS"
  for d in "${DNS_ARR[@]}"; do
    DNS_BLOCK="${DNS_BLOCK}          - ${d}"$'\n'
  done

  cat > "$CONF" << EOF
# 棉花识别系统 — 静态 IP 配置（由 tools/set-static-ip.sh 生成于 $STAMP）
# 如需恢复 DHCP：删除本文件后执行 sudo netplan apply
network:
  version: 2
  ethernets:
    ${IFACE}:
      dhcp4: false
      addresses:
        - ${STATIC_IP}/${PREFIX}
      routes:
        - to: default
          via: ${GATEWAY}
      nameservers:
        addresses:
${DNS_BLOCK}
EOF
  chmod 600 "$CONF"
  ok "已写入 $CONF"

  log "校验配置..."
  netplan generate
  ok "语法校验通过"

  if [[ $USE_TRY -eq 1 ]]; then
    echo ""
    warn "即将执行 sudo netplan try：请保持 SSH 连接，出现确认提示时先按住回车前再看看是否能重连"
    warn "120 秒内不确认将自动回滚到原配置（安全机制）"
    if ! netplan try; then
      warn "netplan try 未完成（可能因为当前会话没有交互终端）。"
      warn "配置已写入，请在 FinalShell 里手动执行：sudo netplan try"
      exit 1
    fi
  else
    netplan apply
    ok "已执行 netplan apply"
  fi

elif command -v nmcli >/dev/null 2>&1; then
  # ---- 方案 B：NetworkManager（CentOS / RHEL 等）----
  CONN="$(nmcli -t -f NAME,DEVICE con show --active | awk -F: -v d="$IFACE" '$2==d {print $1; exit}')"
  [[ -z "$CONN" ]] && { err "未找到网卡 $IFACE 对应的连接，请手动用 nmcli 配置"; exit 1; }

  nmcli con show "$CONN" > "./nmcli-backup-$CONN-$STAMP.txt" 2>/dev/null || true
  ok "已备份当前连接信息: $(pwd)/nmcli-backup-$CONN-$STAMP.txt"

  nmcli con mod "$CONN" ipv4.method manual \
    ipv4.addresses "${STATIC_IP}/${PREFIX}" \
    ipv4.gateway "$GATEWAY" \
    ipv4.dns "${DNS//,/ }"
  warn "即将重启连接 $CONN（SSH 会短暂断开，请重新连接）"
  nmcli con up "$CONN"
  ok "已切换为静态 IP"
else
  err "系统既没有 netplan 也没有 nmcli，请按下面方式手动修改："
  cat <<'MANUAL'
  1) 编辑 /etc/sysconfig/network-scripts/ifcfg-<网卡>，改为：
       BOOTPROTO=static
       ONBOOT=yes
       IPADDR=<你的静态IP>
       NETMASK=255.255.255.0
       GATEWAY=<网关>
       DNS1=114.114.114.114
  2) 重启网络：sudo systemctl restart network
  3) 用 ip addr 确认
MANUAL
  exit 1
fi

# ── 4. 结果确认 ──
echo ""
log "当前网卡地址："
ip -4 -br addr show dev "$IFACE" || true
echo ""
log "连通性测试："
if ping -c 2 -W 2 "$GATEWAY" >/dev/null 2>&1; then ok "网关 $GATEWAY 可达"; else warn "网关不可达，请检查网关地址是否正确"; fi
if ping -c 2 -W 2 114.114.114.114 >/dev/null 2>&1; then ok "外网可达"; else warn "外网不可达（不影响局域网使用）"; fi

echo ""
ok "完成。请把下面这个地址填进 App 一次，以后不用再改："
echo "     http://${STATIC_IP}:8088"
echo ""
echo "  如需恢复 DHCP：删除 /etc/netplan/99-cotton-static.yaml 后执行 sudo netplan apply"
