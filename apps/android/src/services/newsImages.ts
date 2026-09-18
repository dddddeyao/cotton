const nonDisplayNewsImageMarkers = [
  'placeholder',
  'default',
  'news-default',
  'no-image',
  'noimage',
  'no_pic',
  'nopic',
  'notfound',
  'cotton-news-placeholder',
  'c11c413cc8eccf9e82c40477592558ab',
  'c9e9e554634e5b4be8b16a0d34395b52',
  'd4a811ad94ec7a9a80a76ee3bed0e157',
  '201508201641002466553',
  '201508201625068547638',
  '5a681a7949560',
  'show_qrcode',
  'uk.gif',
  'rawmex.cn',
  'images/2013',
  'upload/201508',
  'news_new/fzw',
  'source-cotton-logo',
  'cntac_logo',
  'cntac-logo',
  'cqn_logo',
  'cqn-logo',
  'site-logo',
  'website-logo',
  'web-logo',
  '/logo.',
  '/logo_',
  '/logo/',
  '/logos/',
  '/images_new/logo',
  '/topimgs/',
  '/topimg/',
  '/banner.',
  '/banner/',
  '/banners/',
  'banner.jpg',
  'banner.png',
  'banner.jpeg',
  'banner.webp',
  '/ad.',
  '/ads/',
];

export function hasRealNewsImage(imageUrl: string | null | undefined) {
  const normalized = imageUrl?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !nonDisplayNewsImageMarkers.some((marker) => normalized.includes(marker));
}



