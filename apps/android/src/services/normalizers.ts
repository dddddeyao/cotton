import { createMockRecognitionResult } from '../data/mockData';
import { NewsItem, RecognitionMetric, RecognitionResult, UserSession } from '../types';

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
  return parsed > 1 ? parsed / 100 : parsed;
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
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.list)
      ? payload.list
      : isRecord(payload) && Array.isArray(payload.records)
        ? payload.records
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
    imageUri: stringValue(raw.imageUri ?? raw.imageUrl ?? raw.url, imageUri),
    createdAt: stringValue(raw.createdAt ?? raw.time ?? raw.recognitionTime, mock.createdAt),
    grade: grade || mock.grade,
    confidence: normalizeConfidence(raw.confidence ?? raw.score ?? raw.probability),
    metrics: metrics.length > 0 ? metrics : mock.metrics,
    conclusion: stringValue(raw.conclusion ?? raw.message ?? raw.remark, mock.conclusion),
    isLocal: false,
  };
}

export function normalizeRecognitionHistory(payload: unknown): RecognitionResult[] {
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.list)
      ? payload.list
      : isRecord(payload) && Array.isArray(payload.records)
        ? payload.records
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
