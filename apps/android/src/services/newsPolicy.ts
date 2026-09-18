import { NewsItem } from '../types';

const MIN_YEAR = 2026;

const COTTON_KEYWORDS = [
  '棉花',
  '进口棉',
  '原棉',
  '皮棉',
  '籽棉',
  '新疆棉',
  '疆棉',
  '郑棉',
  '美棉',
  '棉价',
  '棉市',
  '棉纱',
  '棉纺',
  '棉企',
  '棉农',
  '棉花检验',
  '纤维检验',
  'cotton',
  'raw cotton',
  'cotton yarn',
];

const REJECT_KEYWORDS = [
  '娱乐',
  '体育',
  '彩票',
  '游戏',
  '汽车',
  '房产',
  '招聘',
  '广告',
  '优惠券',
  '登录 用户登录',
  '请输入用户名和密码',
  '大宗商品涨跌榜',
  '商品报价动态',
  '生意社期货通',
  '生意社股票通',
];

function containsAny(value: string, keywords: string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function newsSearchText(item: NewsItem) {
  return [item.title, item.summary, item.content, item.category, item.keywords].filter(Boolean).join(' ');
}

function yearFromText(value: string) {
  const match = value.match(/(?:^|\D)(20\d{2})(?:\D|$)/);
  return match ? Number(match[1]) : null;
}

function isInDateRange(item: NewsItem) {
  const dateYear = yearFromText(item.date || '');
  if (dateYear !== null) {
    return dateYear >= MIN_YEAR;
  }

  const textYear = yearFromText(`${item.title} ${item.summary} ${item.content}`);
  return textYear !== null && textYear >= MIN_YEAR;
}

export function isCottonCustomsNews(item: NewsItem) {
  const text = newsSearchText(item);
  return (
    isInDateRange(item)
    && containsAny(text, COTTON_KEYWORDS)
    && !containsAny(text, REJECT_KEYWORDS)
  );
}

export function filterCottonCustomsNews(items: NewsItem[]) {
  return items.filter(isCottonCustomsNews);
}