import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const STORAGE_KEY = 'cotton.server.baseUrl';
const PROBE_PATH = '/health';
const PROBE_TIMEOUT_MS = 1200;
const SCAN_CONCURRENCY = 48;

export const DEFAULT_SERVER_PORT = 8088;

/**
 * 把用户输入整理成规范地址：
 *   "192.168.1.123"        -> "http://192.168.1.123:8088"
 *   "192.168.1.123:9000"   -> "http://192.168.1.123:9000"
 *   "http://a.b.c:8088/"   -> "http://a.b.c:8088"
 */
export function normalizeServerUrl(input: string): string {
  const raw = (input || '').trim().replace(/\s+/g, '');
  if (!raw) {
    return '';
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  const matched = withScheme.match(/^(https?:\/\/)([^/:]+)(:\d+)?(\/.*)?$/i);

  if (!matched) {
    return withScheme.replace(/\/+$/, '');
  }

  const [, scheme, host, port, rest] = matched;
  const finalPort = port ?? `:${DEFAULT_SERVER_PORT}`;
  const finalPath = rest && rest !== '/' ? rest.replace(/\/+$/, '') : '';

  return `${scheme}${host}${finalPort}${finalPath}`;
}

export async function getStoredServerUrl(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? normalizeServerUrl(raw) : '';
  } catch {
    return '';
  }
}

export async function saveServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, normalizeServerUrl(url));
}

/** 探测地址是否为可用后端（访问 /health） */
export async function probeServer(url: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  const base = normalizeServerUrl(url);
  if (!base) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}${PROBE_PATH}`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function buildSubnetPrefixes(deviceIp: string): string[] {
  const prefixes: string[] = [];
  const matched = (deviceIp || '').match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);

  if (matched) {
    prefixes.push(matched[1]);
  }

  // 常见局域网网段兜底（手机 IP 取不到时使用）
  ['192.168.1', '192.168.0'].forEach((prefix) => {
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
    }
  });

  return prefixes;
}

/**
 * 自动搜索局域网内的后端服务：
 * 拿到手机自身 IP -> 推导所在 /24 网段 -> 并发探测 8088 端口
 */
export async function discoverServer(
  onProgress?: (message: string) => void,
  port = DEFAULT_SERVER_PORT,
): Promise<string | null> {
  let deviceIp = '';
  try {
    deviceIp = await Network.getIpAddressAsync();
  } catch {
    deviceIp = '';
  }

  const prefixes = buildSubnetPrefixes(deviceIp);
  const hosts: string[] = [];
  prefixes.forEach((prefix) => {
    for (let index = 1; index <= 254; index += 1) {
      hosts.push(`${prefix}.${index}`);
    }
  });

  onProgress?.(`正在搜索 ${prefixes.map((prefix) => `${prefix}.x`).join(' / ')} …`);

  const queue = [...hosts];
  let found: string | null = null;

  async function worker() {
    while (!found) {
      const host = queue.shift();
      if (!host) {
        return;
      }

      const url = `http://${host}:${port}`;
      const reachable = await probeServer(url, PROBE_TIMEOUT_MS);
      if (reachable && !found) {
        found = url;
      }
    }
  }

  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, () => worker()));
  return found;
}
