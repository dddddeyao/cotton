import { appConfig } from '../config';
import { requestJson, requestWithMock } from './request';
import type { NewsItem, RecognitionMetric, RecognitionResult, UserSession } from '../types';
import { mockNews, mockRecognitionResult, mockHistory } from './mock';

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function pickValue(record: AnyRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function pickString(record: AnyRecord, keys: string[], fallback = ''): string {
  const value = pickValue(record, keys);
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function pickBoolean(record: AnyRecord, keys: string[], fallback = false): boolean {
  const value = pickValue(record, keys);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return fallback;
}

function pickArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeConfidence(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return Math.max(0, Math.min(1, normalized));
}

function normalizeSession(raw: unknown, fallbackUsername: string): UserSession {
  const record = asRecord(raw);
  return {
    username: pickString(record, ['username', 'userName', 'account', 'name'], fallbackUsername),
    token: pickString(record, ['token', 'accessToken', 'jwt'], `mock_token_${Date.now()}`),
  };
}

function normalizeNewsItem(raw: unknown, index: number): NewsItem {
  const record = asRecord(raw);
  const tone = pickString(record, ['tone'], ['blue', 'green', 'orange', 'purple'][index % 4]);
  const normalizedTone: NewsItem['tone'] =
    tone === 'green' || tone === 'orange' || tone === 'purple' ? tone : 'blue';

  return {
    id: pickString(record, ['id', 'newsId'], `news_${index + 1}`),
    title: pickString(record, ['title', 'newsTitle'], '未命名资讯'),
    summary: pickString(record, ['summary', 'description', 'content'], '暂无摘要'),
    date: pickString(record, ['date', 'publishDate', 'createdAt', 'createTime'], ''),
    source: pickString(record, ['source', 'sourceName', 'publisher'], '来源待定'),
    tone: normalizedTone,
  };
}

function normalizeNewsList(raw: unknown): NewsItem[] {
  const record = asRecord(raw);
  const list = Array.isArray(raw) ? raw : pickArray(pickValue(record, ['list', 'records', 'data', 'items']));
  return list.map(normalizeNewsItem);
}

function normalizeMetric(raw: unknown, index: number): RecognitionMetric {
  const record = asRecord(raw);
  return {
    label: pickString(record, ['label', 'name', 'metricName'], `指标 ${index + 1}`),
    value: pickString(record, ['value', 'metricValue', 'val'], ''),
    hint: pickString(record, ['hint', 'description', 'remark'], ''),
  };
}

function fallbackMetrics(record: AnyRecord, confidence: number): RecognitionMetric[] {
  const rd = pickValue(record, ['rd', 'Rd', 'reflectance', 'reflectionRate']);
  const yellow = pickValue(record, ['b', '+b', 'yellow', 'yellowness']);
  const impurity = pickValue(record, ['trashArea', 'impurityArea', 'leafArea']);
  const metrics: RecognitionMetric[] = [];

  if (rd !== undefined) metrics.push({ label: '反射率 Rd', value: String(rd) });
  if (yellow !== undefined) metrics.push({ label: '黄度 +b', value: String(yellow) });
  if (impurity !== undefined) metrics.push({ label: '杂质面积', value: String(impurity) });
  metrics.push({ label: '置信度', value: `${Math.round(confidence * 100)}%` });

  return metrics;
}

function normalizeMetrics(raw: unknown, confidence: number): RecognitionMetric[] {
  const record = asRecord(raw);
  const rawMetrics = pickArray(pickValue(record, ['metrics', 'indicators', 'items']));
  if (rawMetrics.length > 0) {
    return rawMetrics.map(normalizeMetric).filter((metric) => metric.value !== '');
  }
  return fallbackMetrics(record, confidence);
}

function normalizeRecognitionResult(
  raw: unknown,
  imageFile: File | null,
  fallbackLocal: boolean
): RecognitionResult {
  const topLevelRecord = asRecord(raw);
  const detectionResult = asRecord(topLevelRecord.detectionResult);
  const record = { ...topLevelRecord, ...detectionResult };
  const confidence = normalizeConfidence(
    pickValue(record, ['confidence', 'score', 'probability']),
    0.9
  );
  const colorGrade = pickString(record, ['colorGrade', 'color_grade']);
  const leafGrade = pickString(record, ['leafGrade', 'leaf_grade']);
  const derivedGrade = [colorGrade, leafGrade].filter(Boolean).join(' / ');
  const imageUri =
    pickString(topLevelRecord, ['imageUri', 'imageUrl', 'image', 'url']) ||
    (imageFile ? URL.createObjectURL(imageFile) : '');

  return {
    id: pickString(record, ['id', 'resultId', 'historyId'], generateId()),
    imageUri,
    createdAt: pickString(record, ['createdAt', 'createTime', 'time'], new Date().toISOString()),
    grade: pickString(record, ['grade', 'level', 'result'], derivedGrade || '待复核'),
    confidence,
    metrics: normalizeMetrics(raw, confidence),
    conclusion: pickString(
      record,
      ['conclusion', 'summary', 'suggestion'],
      '识别完成，建议结合分类标准进行复核。'
    ),
    isLocal: pickBoolean(record, ['isLocal', 'local'], fallbackLocal),
  };
}

function normalizeHistory(raw: unknown): RecognitionResult[] {
  const record = asRecord(raw);
  const list = Array.isArray(raw) ? raw : pickArray(pickValue(record, ['list', 'records', 'data', 'items']));
  return list.map((item) => normalizeRecognitionResult(item, null, false));
}

export const api = {
  async login(username: string, password: string): Promise<UserSession> {
    const result = await requestWithMock<unknown>(
      appConfig.endpoints.login,
      { username, token: 'mock_token_' + Date.now() },
      { method: 'POST', body: { username, password } }
    );
    return normalizeSession(result, username);
  },

  async register(username: string, password: string): Promise<UserSession> {
    const result = await requestWithMock<unknown>(
      appConfig.endpoints.register,
      { username, token: 'mock_token_' + Date.now() },
      { method: 'POST', body: { username, password } }
    );
    return normalizeSession(result, username);
  },

  async logout(): Promise<void> {
    return requestWithMock(appConfig.endpoints.logout, undefined, { method: 'POST' });
  },

  async fetchNews(): Promise<NewsItem[]> {
    if (!appConfig.apiBaseUrl) {
      return delay(mockNews);
    }
    const data = await requestWithMock<unknown>(appConfig.endpoints.news, mockNews);
    return normalizeNewsList(data);
  },

  async recognizeImage(imageFile: File): Promise<RecognitionResult> {
    if (!appConfig.apiBaseUrl) {
      const result = await delay(mockRecognitionResult, 1000);
      return normalizeRecognitionResult({
        ...result,
        id: generateId(),
        imageUri: URL.createObjectURL(imageFile),
        createdAt: new Date().toISOString(),
        isLocal: true,
      }, imageFile, true);
    }

    const formData = new FormData();
    formData.append(appConfig.recognition.uploadFieldName, imageFile, imageFile.name || appConfig.recognition.defaultFileName);

    const data = await requestJson<unknown>(appConfig.endpoints.recognition, {
      method: 'POST',
      body: formData,
      isFormData: true,
      timeout: appConfig.recognitionTimeoutMs,
    });
    return normalizeRecognitionResult(data, imageFile, false);
  },

  async fetchHistory(): Promise<RecognitionResult[]> {
    if (!appConfig.apiBaseUrl) {
      return delay(mockHistory);
    }
    const data = await requestWithMock<unknown>(appConfig.endpoints.recognitionHistory, mockHistory);
    return normalizeHistory(data);
  },

  async deleteHistory(ids: string[]): Promise<void> {
    const normalizedIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    return requestWithMock(
      appConfig.endpoints.recognitionHistory,
      undefined,
      { method: 'DELETE', body: { ids: normalizedIds } }
    );
  },
};
