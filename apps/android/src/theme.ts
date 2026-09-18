export const colors = {
  background: '#f4fafc',
  backgroundDeep: '#e7f4f8',
  surface: '#ffffff',
  surfaceStrong: '#f8fdff',
  primary: '#263b96',
  primaryDark: '#1d2f86',
  primarySoft: '#c4edf3',
  accentSoft: '#e2f7fb',
  ink: '#151a24',
  muted: '#657482',
  line: '#d7e8ee',
  danger: '#9f3f36',
  success: '#24727b',
  warning: '#7c671e',
  tabMuted: '#73818c',
};

export const spacing = {
  page: 18,
  card: 14,
  // 全局圆角：卡片、图片、按钮等统一使用
  radius: 12,
  // 底部标签栏单独使用较小圆角
  tabRadius: 8,
};


export const shadow = {
  shadowColor: '#142b3a',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
};

/**
 * 识别记录页面专用的中性灰调色板。
 * 只使用：深灰黑（主要文字）/ 中灰（次要信息）/ 浅灰（边框分隔）/ 白色（记录内容）/ 橙色（危险操作与置信度强调）。
 * 独立于上方 colors，改动此对象不会影响其他页面。
 */
export const recordTheme = {
  // 页面底色：浅灰白
  pageBackground: '#f5f6f8',
  // 记录内容底色：白色
  surface: '#ffffff',
  // 极细浅灰边框
  border: '#e5e7eb',
  // 选中态边框（略深一点的浅灰）
  borderStrong: '#cfd4da',
  // 主要文字：深灰黑
  textStrong: '#22262c',
  // 次要信息（检测时间）：中灰
  textMuted: '#6b7280',
  // 检测项目、图片名称：深灰
  textLabel: '#4b5563',
  // 选择框描边
  checkBorder: '#c3c8cf',
  // 选择框选中填充（中性灰，不使用蓝色）
  checkActive: '#4b5563',
  // 强调色：仅用于删除按钮与置信度数值
  accent: '#e8792b',
  // 禁用态
  disabled: '#c9cfd6',
};