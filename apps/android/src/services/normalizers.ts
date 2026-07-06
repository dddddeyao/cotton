import { appConfig } from '../config';
import { createMockRecognitionResult } from '../data/mockData';
import { DetectionResult, NewsItem, RecognitionMetric, RecognitionResult, UserProfile, UserSession } from '../types';

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

function nullableString(value: unknown) {
  const parsed = stringValue(value);
  return parsed || null;
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

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

function displayValue(value: unknown, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return '未返回';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Number.isInteger(value) ? value : Number(value.toFixed(6))}${suffix}`;
  }

  return `${String(value)}${suffix}`;
}

function displayPercentRatio(value: unknown) {
  const parsed = nullableNumber(value);
  if (parsed === null) {
    return '未返回';
  }

  return `${Number((parsed * 100).toFixed(4))}%`;
}

function displayConfidence(value: unknown) {
  const normalized = normalizeConfidence(value);
  return `${Math.round(normalized * 10000) / 100}%`;
}

function normalizeDetectionResult(raw: AnyRecord): DetectionResult {
  return {
    colorGrade: nullableNumber(raw.colorGrade ?? raw.colorLevel),
    impurityGrade: nullableNumber(raw.impurityGrade ?? raw.leafGrade ?? raw.leafLevel),
    cottonArea: nullableNumber(raw.cottonArea),
    impurityArea: nullableNumber(raw.impurityArea ?? raw.trashArea ?? raw.leafArea),
    areaRatio: nullableNumber(raw.areaRatio),
    confidence: nullableNumber(raw.confidence ?? raw.score ?? raw.probability),
  };
}

function buildModelMetrics(detection: DetectionResult): RecognitionMetric[] {
  return [
    { label: '颜色等级', value: displayValue(detection.colorGrade), hint: 'colorGrade' },
    { label: '杂质等级', value: displayValue(detection.impurityGrade), hint: 'impurityGrade' },
    { label: '棉花区域占比', value: displayValue(detection.cottonArea, '%'), hint: 'cottonArea' },
    { label: '杂质面积', value: displayValue(detection.impurityArea, ' px'), hint: 'impurityArea' },
    { label: '杂质面积比', value: displayPercentRatio(detection.areaRatio), hint: 'areaRatio' },
    { label: '模型置信度', value: displayConfidence(detection.confidence), hint: 'confidence' },
  ];
}

function buildDetails(raw: AnyRecord, detection: DetectionResult, imageUri: string): RecognitionMetric[] {
  return [
    { label: '记录 ID', value: displayValue(raw.id ?? raw.recordId) },
    { label: '图片地址', value: displayValue(imageUri) },
    { label: '颜色等级 colorGrade', value: displayValue(detection.colorGrade) },
    { label: '杂质等级 impurityGrade', value: displayValue(detection.impurityGrade) },
    { label: '棉花区域 cottonArea', value: displayValue(detection.cottonArea, '%') },
    { label: '杂质面积 impurityArea', value: displayValue(detection.impurityArea, ' px') },
    { label: '面积比 areaRatio', value: displayValue(detection.areaRatio) },
    { label: '置信度 confidence', value: displayValue(detection.confidence) },
    { label: '兼容标签 label', value: displayValue(raw.label) },
    { label: '创建时间 createdAt', value: displayValue(raw.createdAt) },
    { label: '识别时间 timestamp', value: displayValue(raw.timestamp) },
    { label: '文件名 filename', value: displayValue(raw.filename) },
    { label: '结论 conclusion', value: displayValue(raw.conclusion) },
    { label: '棉花区域图 cottonAreaImage', value: displayValue(raw.cottonAreaImage) },
    { label: '杂质掩模图 impurityAreaImage', value: displayValue(raw.impurityAreaImage) },
  ];
}

function buildMetrics(raw: AnyRecord, detection: DetectionResult): RecognitionMetric[] {
  const rawMetrics = raw.metrics ?? raw.parameters ?? raw.items;
  const metrics = Array.isArray(rawMetrics)
    ? rawMetrics.map(normalizeMetric).filter((item): item is RecognitionMetric => Boolean(item))
    : [];

  return metrics.length > 0 ? metrics : buildModelMetrics(detection);
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
  const detectionResult = normalizeDetectionResult(raw);
  const metrics = buildMetrics(raw, detectionResult);
  const colorGrade = stringValue(raw.colorGrade ?? raw.colorLevel);
  const impurityGrade = stringValue(raw.impurityGrade ?? raw.leafGrade ?? raw.leafLevel);
  const grade = stringValue(raw.grade ?? raw.level ?? raw.resultText, [colorGrade, impurityGrade].filter(Boolean).join(' / '));
  const resolvedImageUri = resolveImageUri(stringValue(
    raw.imageUri ?? raw.imageUrl ?? raw.url ?? raw.cottonAreaImage ?? raw.impurityAreaImage,
    imageUri,
  ));

  return {
    ...mock,
    id: stringValue(raw.id ?? raw.recordId, mock.id),
    imageUri: resolvedImageUri,
    createdAt: stringValue(raw.createdAt ?? raw.time ?? raw.recognitionTime ?? raw.timestamp, mock.createdAt),
    grade: grade || mock.grade,
    confidence: normalizeConfidence(raw.confidence ?? raw.score ?? raw.probability ?? detectionResult.confidence),
    label: stringValue(raw.label, colorGrade || mock.label),
    timestamp: stringValue(raw.timestamp, stringValue(raw.createdAt, mock.timestamp)),
    filename: stringValue(raw.filename, mock.filename),
    cottonAreaImage: nullableString(raw.cottonAreaImage),
    impurityAreaImage: nullableString(raw.impurityAreaImage),
    detectionResult,
    metrics,
    details: buildDetails(raw, detectionResult, resolvedImageUri),
    conclusion: stringValue(raw.conclusion ?? raw.message ?? raw.remark, grade ? `等级 ${grade}` : mock.conclusion),
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
