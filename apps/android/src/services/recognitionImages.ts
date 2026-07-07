import { RecognitionResult } from '../types';

type RecognitionImageField =
  | 'imageUri'
  | 'impurityOverlayImage'
  | 'cottonOverlayImage'
  | 'blackBackgroundImpurityOverlay'
  | 'impurityMaskImage'
  | 'cottonMaskImage'
  | 'impurityAreaImage'
  | 'cottonAreaImage';

export type RecognitionImageLayer = {
  key: RecognitionImageField;
  title: string;
  badge: string;
  uri: string | null;
};

type LayerDefinition = {
  key: RecognitionImageField;
  title: string;
  badge: string;
  isSource?: boolean;
};

const primaryImageOrder: RecognitionImageField[] = ['imageUri'];

const layerDefinitions: LayerDefinition[] = [
  { key: 'imageUri', title: '原始样本', badge: 'SOURCE', isSource: true },
  { key: 'impurityOverlayImage', title: '杂质叠加', badge: 'OVERLAY' },
  { key: 'cottonOverlayImage', title: '棉区叠加', badge: 'OVERLAY' },
  { key: 'blackBackgroundImpurityOverlay', title: '黑底杂质', badge: 'OVERLAY' },
  { key: 'impurityMaskImage', title: '杂质掩模', badge: 'MASK' },
  { key: 'cottonMaskImage', title: '棉花掩模', badge: 'MASK' },
];

function getImageUri(result: RecognitionResult, key: RecognitionImageField) {
  return key === 'imageUri' ? result.imageUri || null : result[key] || null;
}

export function getPrimaryRecognitionImageUri(result: RecognitionResult) {
  for (const key of primaryImageOrder) {
    const uri = getImageUri(result, key);
    if (uri) {
      return uri;
    }
  }

  return '';
}

export function getRecognitionImageLayers(
  result: RecognitionResult,
  {
    includeMissing = false,
    includeSource = true,
  }: {
    includeMissing?: boolean;
    includeSource?: boolean;
  } = {},
) {
  const seenUris = new Set<string>();
  const layers: RecognitionImageLayer[] = [];

  for (const definition of layerDefinitions) {
    if (definition.isSource && !includeSource) {
      continue;
    }

    const uri = getImageUri(result, definition.key);
    if (!uri && !includeMissing) {
      continue;
    }

    if (uri) {
      if (seenUris.has(uri)) {
        continue;
      }
      seenUris.add(uri);
    }

    layers.push({
      key: definition.key,
      title: definition.title,
      badge: definition.badge,
      uri,
    });
  }

  return layers;
}