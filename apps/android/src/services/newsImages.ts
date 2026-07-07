const nonDisplayNewsImageMarkers = [
  'placeholder',
  'default',
  'news-default',
  'no-image',
  'cotton-news-placeholder',
  'source-cotton-logo',
  '/logo.',
  '/logo_',
  '/images_new/logo',
  '/topimgs/',
  '/banner.',
  'banner.jpg',
  'banner.png',
];

export function hasRealNewsImage(imageUrl: string | null | undefined) {
  const normalized = imageUrl?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !nonDisplayNewsImageMarkers.some((marker) => normalized.includes(marker));
}
