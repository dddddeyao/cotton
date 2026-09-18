/**
 * 解析日期输入，支持 ISO 8601、Unix 时间戳（秒/毫秒）、普通日期字符串
 * 无法解析时返回 null
 */
function parseDateInput(raw: string | number | null | undefined): Date | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  if (typeof raw === 'number') {
    const date = new Date(raw > 1e12 ? raw : raw * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof raw !== 'string') {
    return null;
  }

  // 尝试直接解析 ISO 字符串
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  // 尝试处理 "YYYY-MM-DD HH:mm:ss" 格式（不含 TZ 后缀）
  const cleaned = raw.replace(/\.\d+/, '').replace(/[T]/, ' ').replace(/Z$/, '').trim();
  const fallback = Date.parse(cleaned);
  return Number.isNaN(fallback) ? null : new Date(fallback);
}

function fallbackText(raw: string | number | null | undefined) {
  return typeof raw === 'string' ? raw : String(raw);
}

/**
 * 格式化时间戳为 YYYY/MM/DD 上午|下午 hh:mm:ss
 * 全部使用中文，不出现 AM / PM 等英文标记
 */
export function formatTimestamp(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') {
    return '';
  }

  const date = parseDateInput(raw);
  if (!date) {
    return fallbackText(raw);
  }

  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const hours24 = date.getHours();
  const period = hours24 < 12 ? '上午' : '下午';
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const h = String(hour12).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  return `${Y}/${M}/${D} ${period} ${h}:${m}:${s}`;
}

/**
 * 格式化日期为 YYYY-MM-DD（仅年月日，不含时分秒）
 */
export function formatDate(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') {
    return '';
  }

  const date = parseDateInput(raw);
  if (!date) {
    return fallbackText(raw);
  }

  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');

  return `${Y}-${M}-${D}`;
}
