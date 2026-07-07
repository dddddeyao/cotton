import { appConfig } from '../config';
import { DetectionResult, NewsItem, RecognitionMetric, RecognitionResult, UserProfile, UserSession } from '../types';
import { hasRealNewsImage } from './newsImages';

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

function nullableImageUri(value: unknown) {
  const parsed = nullableString(value);
  return parsed ? resolveImageUri(parsed) : null;
}

function pickField(raw: AnyRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
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
  const parsed = nullableNumber(value);
  if (parsed === null) {
    return null;
  }

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

  const baseUrl = appConfig.apiBaseUrl;
  if (!baseUrl) {
    return value;
  }

  return `${baseUrl}/${value.replace(/^\/+/, '')}`;
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
  const parsed = nullableNumber(value);
  if (parsed === null) {
    return '未返回';
  }

  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return `${Math.round(Math.max(0, Math.min(1, normalized)) * 10000) / 100}%`;
}


function normalizeDetectionResult(raw: AnyRecord): DetectionResult {
  return {
    colorGrade: nullableNumber(pickField(raw, 'colorGrade', 'color_grade', 'colorLevel')),
    impurityGrade: nullableNumber(pickField(raw, 'impurityGrade', 'impurity_grade', 'leafGrade', 'leafLevel')),
    cottonArea: nullableNumber(pickField(raw, 'cottonArea', 'cotton_area')),
    impurityArea: nullableNumber(pickField(raw, 'impurityArea', 'impurity_area', 'trashArea', 'leafArea')),
    areaRatio: nullableNumber(pickField(raw, 'areaRatio', 'area_ratio')),
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
  const detectionPayload = base.detectionResult ?? base.detection_result;
  const detectionResult = isRecord(detectionPayload) ? detectionPayload : {};
  return { ...base, ...detectionResult };
}

export function normalizeNewsList(payload: unknown): NewsItem[] {
  const record = isRecord(payload) ? payload : {};
  const nestedData = isRecord(record.data) ? record.data : {};
  const nestedResult = isRecord(record.result) ? record.result : {};
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
            : Array.isArray(nestedData.list)
              ? nestedData.list
              : Array.isArray(nestedData.records)
                ? nestedData.records
                : Array.isArray(nestedData.items)
                  ? nestedData.items
                  : Array.isArray(nestedResult.list)
                    ? nestedResult.list
                    : Array.isArray(nestedResult.records)
                      ? nestedResult.records
                      : Array.isArray(nestedResult.items)
                        ? nestedResult.items
                        : [];

  return list
    .map((item, index) => {
      const record = isRecord(item) ? item : {};
      const title = stringValue(record.title ?? record.newsTitle);
      if (!title) {
        return null;
      }

      const summary = stringValue(record.summary ?? record.description ?? record.content);
      const content = stringValue(record.content ?? record.body ?? record.detail, summary);
      const resolvedImageUrl = resolveImageUri(stringValue(record.imageUrl ?? record.coverImage ?? record.thumbnail ?? record.image));
      const imageUrl = hasRealNewsImage(resolvedImageUrl) ? resolvedImageUrl : '';
      const sourceUrl = resolveImageUri(stringValue(record.sourceUrl ?? record.url ?? record.link));

      return {
        id: stringValue(record.id ?? record.newsId, sourceUrl || `${title}-${index + 1}`),
        title,
        summary,
        content,
        date: stringValue(record.date ?? record.publishDate ?? record.createdAt ?? record.crawledAt, ''),
        source: stringValue(record.source ?? record.origin),
        sourceUrl,
        imageUrl,
        category: stringValue(record.category ?? record.type),
        keywords: stringValue(record.keywords ?? record.tags),
        tone: (['blue', 'green', 'orange', 'purple'] as const)[index % 4],
      };
    })
    .filter((item): item is NewsItem => Boolean(item));
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
  const detectionResult = normalizeDetectionResult(raw);
  const metrics = buildMetrics(raw, detectionResult);
  const colorGrade = stringValue(pickField(raw, 'colorGrade', 'color_grade', 'colorLevel'));
  const impurityGrade = stringValue(pickField(raw, 'impurityGrade', 'impurity_grade', 'leafGrade', 'leafLevel'));
  const grade = stringValue(raw.grade ?? raw.level ?? raw.resultText, [colorGrade, impurityGrade].filter(Boolean).join(' / '));
  const createdAt = stringValue(pickField(raw, 'createdAt', 'created_at', 'time', 'recognitionTime', 'timestamp'));
  const timestamp = stringValue(raw.timestamp, createdAt);
  const resolvedImageUri = resolveImageUri(stringValue(pickField(raw, 'imageUri', 'image_uri', 'imageUrl', 'url'), imageUri));

  return {
    id: stringValue(pickField(raw, 'id', 'recordId', 'record_id'), timestamp || resolvedImageUri),
    imageUri: resolvedImageUri,
    createdAt,
    grade: grade || '未返回',
    confidence: normalizeConfidence(raw.confidence ?? raw.score ?? raw.probability ?? detectionResult.confidence),
    label: stringValue(raw.label, colorGrade),
    timestamp,
    filename: stringValue(raw.filename),
    cottonMaskImage: nullableImageUri(pickField(raw, 'cottonMaskImage', 'cotton_mask_image')),
    impurityMaskImage: nullableImageUri(pickField(raw, 'impurityMaskImage', 'impurity_mask_image')),
    cottonOverlayImage: nullableImageUri(pickField(raw, 'cottonOverlayImage', 'cotton_overlay_image')),
    impurityOverlayImage: nullableImageUri(pickField(raw, 'impurityOverlayImage', 'impurity_overlay_image')),
    blackBackgroundImpurityOverlay: nullableImageUri(
      pickField(raw, 'blackBackgroundImpurityOverlay', 'black_background_impurity_overlay'),
    ),
    cottonAreaImage: nullableImageUri(pickField(raw, 'cottonAreaImage', 'cotton_area_image')),
    impurityAreaImage: nullableImageUri(pickField(raw, 'impurityAreaImage', 'impurity_area_image')),
    detectionResult,
    metrics,
    conclusion: stringValue(raw.conclusion ?? raw.message ?? raw.remark),
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
    const imageUri = isRecord(item) ? stringValue(pickField(item, 'imageUri', 'image_uri', 'imageUrl', 'url')) : '';
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
    role: stringValue(record.role ?? record.identity),
  };
}
