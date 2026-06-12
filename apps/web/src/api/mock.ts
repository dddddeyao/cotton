import type { NewsItem, RecognitionResult } from '../types';

export const mockNews: NewsItem[] = [
  {
    id: '1',
    title: '江门海关助力进口棉花快速投入生产',
    summary: '运用两步申报、提前申报等便捷通关模式，保障进口棉花供应链稳定，助力企业降本增效。',
    date: '2020-06-20',
    source: '海关发布',
    tone: 'blue',
  },
  {
    id: '2',
    title: '3年2万箱 黄岛海关创新进口棉花监管',
    summary: '黄岛口岸是全国最大的棉花进口口岸之一，海关通过信息化手段实现高效监管。',
    date: '2023-08-28',
    source: '口岸动态',
    tone: 'green',
  },
  {
    id: '3',
    title: '淄博海关：助力棉花进口企业高质量发展',
    summary: '海关人员对进口棉花实施精准检验，保障国内棉花市场供应质量。',
    date: '2024-12-09',
    source: '地方海关',
    tone: 'orange',
  },
  {
    id: '4',
    title: '棉花检验智能化应用持续扩展',
    summary: '围绕颜色级、叶屑等级等关键指标，AI 辅助检验正在成为行业新趋势。',
    date: '2026-05-18',
    source: '行业观察',
    tone: 'purple',
  },
];

export const mockRecognitionResult: RecognitionResult = {
  id: '',
  imageUri: '',
  createdAt: '',
  grade: '颜色级 21 / 叶屑 LG2',
  confidence: 0.92,
  conclusion: '当前为前端 mock 识别结果。真实接口接入后将展示后端返回的完整参数。',
  metrics: [
    { label: '反射率 Rd', value: '76.6%', hint: '基于 HVI 测试口径' },
    { label: '黄度 +b', value: '9.3', hint: '越高代表偏黄' },
    { label: '杂质面积', value: '0.20%', hint: '叶屑等级 LG2' },
    { label: '置信度', value: '92%', hint: '模型输出概率' },
  ],
  isLocal: true,
};

export const mockHistory: RecognitionResult[] = [
  {
    id: 'h1',
    imageUri: '',
    createdAt: '2026-05-28T10:30:00',
    grade: '颜色级 21 / 叶屑 LG2',
    confidence: 0.91,
    conclusion: '样品颜色与二级标准接近，杂质比例处于可接受范围。',
    metrics: [
      { label: '反射率 Rd', value: '76.6%' },
      { label: '黄度 +b', value: '9.3' },
      { label: '杂质面积', value: '0.20%' },
    ],
    isLocal: false,
  },
];