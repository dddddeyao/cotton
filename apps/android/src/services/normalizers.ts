import { appConfig } from '../config';
import { createMockRecognitionResult } from '../data/mockData';
import { NewsItem, RecognitionMetric, RecognitionResult, UserProfile, UserSession } from '../types';

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = '') {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function normalizeConfidence(value: unknown) {
  const parsed = numberValue(value, 0.9);
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return Math.max(0, Math.min(1, normalized));
}

function resolveImageUri(value: string) {
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    const baseUrl = appConfig.apiBaseUrl;
    if (!baseUrl || value === baseUrl || value.startsWith(`${baseUrl}/`)) {
      return value;
    }
    return `${baseUrl}${value}`;
  }

  return value;
}

function normalizeMetric(item: unknown): RecognitionMetric | null {
  if (!isRecord(item)) {
    return null;
  }

  const label = stringValue(item.label ?? item.name ?? item.key);
  const value = stringValue(item.value ?? item.result ?? item.score);

  if (!label || !value) {
    return null;
  }

  return {
    label,
    value,
    hint: stringValue(item.hint ?? item.description),
  };
}

function buildMetrics(raw: AnyRecord): RecognitionMetric[] {
  const rawMetrics = raw.metrics ?? raw.parameters ?? raw.items;
  const metrics = Array.isArray(rawMetrics)
    ? rawMetrics.map(normalizeMetric).filter((item): item is RecognitionMetric => Boolean(item))
    : [];

  const knownMetrics: RecognitionMetric[] = [
    { label: '反射率 Rd', value: stringValue(raw.reflectance ?? raw.rd) },
    { label: '黄度 +b', value: stringValue(raw.yellowness ?? raw.bValue ?? raw.plusB) },
    { label: '杂质面积', value: stringValue(raw.impurityArea ?? raw.trashArea ?? raw.leafArea) },
    { label: '叶屑等级', value: stringValue(raw.leafGrade ?? raw.leafLevel) },
  ].filter((item) => item.value);

  return metrics.length > 0 ? metrics : knownMetrics;
}

function pickRecognitionPayload(payload: unknown): AnyRecord {
  if (!isRecord(payload)) {
    return {};
  }

  const nested = payload.result ?? payload.recognition ?? payload.detail;
  const base = isRecord(nested) ? nested : payload;
  const detectionResult = isRecord(base.detectionResult) ? base.detectionResult : {};
  return { ...base, ...detectionResult };
}

export function normalizeNewsList(payload: unknown): NewsItem[] {
  const record = isRecord(payload) ? payload : {};
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(record.list)
      ? record.list
      : Array.isArray(record.records)
        ? record.records
        : Array.isArray(record.data)
          ? record.data
          : Array.isArray(record.items)
            ? record.items
            : [];

  return list.map((item, index) => {
    const record = isRecord(item) ? item : {};
    const title = stringValue(record.title ?? record.newsTitle, `棉花新闻 ${index + 1}`);
    const summary = stringValue(record.summary ?? record.description ?? record.content, '暂无摘要');

    return {
      id: stringValue(record.id ?? record.newsId, `news-${index + 1}`),
      title,
      summary,
      date: stringValue(record.date ?? record.publishDate ?? record.createdAt, ''),
      source: stringValue(record.source ?? record.origin, '海关动态'),
      tone: (['blue', 'green', 'orange', 'purple'] as const)[index % 4],
    };
  });
}

export function normalizeSession(payload: unknown, fallbackUsername: string): UserSession {
  const record = isRecord(payload) ? payload : {};
  const nestedUser = isRecord(record.user) ? record.user : {};

  return {
    username: stringValue(record.username ?? nestedUser.username ?? nestedUser.name, fallbackUsername),
    token: stringValue(record.token ?? record.accessToken ?? record.jwt),
  };
}

export function normalizeRecognitionResult(payload: unknown, imageUri: string): RecognitionResult {
  const raw = pickRecognitionPayload(payload);
  const mock = createMockRecognitionResult(imageUri);
  const metrics = buildMetrics(raw);
  const colorGrade = stringValue(raw.colorGrade ?? raw.colorLevel);
  const leafGrade = stringValue(raw.leafGrade ?? raw.leafLevel);
  const grade = stringValue(raw.grade ?? raw.level ?? raw.resultText, [colorGrade, leafGrade].filter(Boolean).join(' / '));

  return {
    ...mock,
    id: stringValue(raw.id ?? raw.recordId, mock.id),
    imageUri: resolveImageUri(stringValue(
      raw.imageUri ?? raw.imageUrl ?? raw.url ?? raw.cottonAreaImage ?? raw.impurityAreaImage,
      imageUri,
    )),
    createdAt: stringValue(raw.createdAt ?? raw.time ?? raw.recognitionTime, mock.createdAt),
    grade: grade || mock.grade,
    confidence: normalizeConfidence(raw.confidence ?? raw.score ?? raw.probability),
    metrics: metrics.length > 0 ? metrics : mock.metrics,
    conclusion: stringValue(raw.conclusion ?? raw.message ?? raw.remark, mock.conclusion),
    isLocal: false,
  };
}

export function normalizeRecognitionHistory(payload: unknown): RecognitionResult[] {
  const record = isRecord(payload) ? payload : {};
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(record.list)
      ? record.list
      : Array.isArray(record.records)
        ? record.records
        : Array.isArray(record.data)
          ? record.data
          : Array.isArray(record.items)
            ? record.items
            : [];

  return list.map((item, index) => {
    const imageUri = isRecord(item) ? stringValue(item.imageUri ?? item.imageUrl ?? item.url) : '';
    const result = normalizeRecognitionResult(item, imageUri);
    return {
      ...result,
      id: result.id || `history-${index + 1}`,
      isLocal: false,
    };
  });
}

export function normalizeProfile(payload: unknown, username: string): UserProfile {
  const record = isRecord(payload) ? payload : {};
  return {
    username: stringValue(record.username ?? record.userName ?? record.account, username),
    nickname: stringValue(record.nickname ?? record.name),
    phone: stringValue(record.phone ?? record.mobile),
    organization: stringValue(record.organization ?? record.company ?? record.department),
    role: stringValue(record.role ?? record.identity, '研究人员'),
  };
}
