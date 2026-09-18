import { appConfig } from '../config';
import { DetectionResult, NewsItem, RecognitionMetric, RecognitionResult, UserProfile, UserSession } from '../types';
import { hasRealNewsImage } from './newsImages';
import { filterCottonCustomsNews } from './newsPolicy';

type AnyRecord = Record<string, unknown>;

const missingResultMarker = '\u672a\u8fd4\u56de';

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed && !trimmed.includes(missingResultMarker) ? trimmed : fallback;
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

function formatNumber(value: number, suffix = '') {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(6))}${suffix}`;
}

function formatPercentRatio(value: number) {
  return `${Number((value * 100).toFixed(4))}%`;
}

function formatConfidence(value: number) {
  const normalized = value > 1 ? value / 100 : value;
  return `${Math.round(Math.max(0, Math.min(1, normalized)) * 10000) / 100}%`;
}

function metricFromNumber(label: string, value: number | null, hint: string, suffix = ''): RecognitionMetric | null {
  return value === null ? null : { label, value: formatNumber(value, suffix), hint };
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
    metricFromNumber('颜色等级', detection.colorGrade, 'colorGrade'),
    metricFromNumber('杂质等级', detection.impurityGrade, 'impurityGrade'),
    metricFromNumber('棉花区域占比', detection.cottonArea, 'cottonArea', '%'),
    metricFromNumber('杂质面积', detection.impurityArea, 'impurityArea'),
    detection.areaRatio === null ? null : { label: '杂质面积比', value: formatPercentRatio(detection.areaRatio), hint: 'areaRatio' },
    detection.confidence === null ? null : { label: '模型置信度', value: formatConfidence(detection.confidence), hint: 'confidence' },
  ].filter((metric): metric is RecognitionMetric => Boolean(metric));
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
  const imageUrlCounts = new Map<string, number>();
  list.forEach((item) => {
    const record = isRecord(item) ? item : {};
    const resolvedImageUrl = resolveImageUri(stringValue(record.imageUrl ?? record.coverImage ?? record.thumbnail ?? record.image));
    if (hasRealNewsImage(resolvedImageUrl)) {
      imageUrlCounts.set(resolvedImageUrl, (imageUrlCounts.get(resolvedImageUrl) ?? 0) + 1);
    }
  });

  const news = list
    .map((item, index) => {
      const record = isRecord(item) ? item : {};
      const title = stringValue(record.title ?? record.newsTitle);
      if (!title) {
        return null;
      }

      const summary = stringValue(record.summary ?? record.description ?? record.content);
      const content = stringValue(record.content ?? record.body ?? record.detail, summary);
      const resolvedImageUrl = resolveImageUri(stringValue(record.imageUrl ?? record.coverImage ?? record.thumbnail ?? record.image));
      const imageUrl = hasRealNewsImage(resolvedImageUrl) && (imageUrlCounts.get(resolvedImageUrl) ?? 0) <= 2 ? resolvedImageUrl : '';
      const sourceUrl = resolveImageUri(stringValue(record.sourceUrl ?? record.url ?? record.link));

      return {
        id: stringValue(record.id ?? record.newsId, sourceUrl || `${title}-${index + 1}`),
        title,
        summary,
        content,
        date: stringValue(record.date || record.publishDate || record.createdAt || record.crawledAt, ''),
        source: stringValue(record.source ?? record.origin),
        sourceUrl,
        imageUrl,
        category: stringValue(record.category ?? record.type),
        keywords: stringValue(record.keywords ?? record.tags),
        tone: (['blue', 'green', 'orange', 'purple'] as const)[index % 4],
      };
    })
    .filter((item): item is NewsItem => Boolean(item));

  return filterCottonCustomsNews(news);
}

export function normalizeSession(payload: unknown, fallbackUsername: string): UserSession {
  const record = isRecord(payload) ? payload : {};
  const nestedUser = isRecord(record.user) ? record.user : {};

  return {
    username: stringValue(record.username ?? nestedUser.username ?? nestedUser.name, fallbackUsername),
    token: stringValue(record.token ?? record.accessToken ?? record.jwt),
  };
}

export function normalizeRecognitionResult(
  payload: unknown,
  imageUri: string,
  options: { isLocal?: boolean } = {},
): RecognitionResult {
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
    grade,
    confidence: normalizeConfidence(raw.confidence ?? raw.score ?? raw.probability ?? detectionResult.confidence),
    label: stringValue(raw.label, colorGrade),
    timestamp,
    filename: stringValue(raw.filename),
    colorFeedbackImage: nullableImageUri(pickField(raw, 'colorFeedbackImage', 'color_feedback_image')),
    cottonMaskImage: nullableImageUri(pickField(raw, 'cottonMaskImage', 'cotton_mask_image')),
    impurityMaskImage: nullableImageUri(pickField(raw, 'impurityMaskImage', 'impurity_mask_image')),
    cottonOverlayImage: nullableImageUri(pickField(raw, 'cottonOverlayImage', 'cotton_overlay_image')),
    impurityOverlayImage: nullableImageUri(pickField(raw, 'impurityOverlayImage', 'impurity_overlay_image')),
    blackBackgroundImpurityOverlay: nullableImageUri(
      pickField(raw, 'blackBackgroundImpurityOverlay', 'black_background_impurity_overlay'),
    ),
    detectionResult,
    metrics,
    conclusion: stringValue(raw.conclusion ?? raw.message ?? raw.remark),
    isLocal: options.isLocal ?? false,
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
    const result = normalizeRecognitionResult(item, imageUri, { isLocal: false });
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


