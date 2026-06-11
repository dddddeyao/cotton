import { NewsItem, RecognitionResult } from '../types';

export const mockNews: NewsItem[] = [
  {
    id: 'news-1',
    title: '江门海关助力进口棉花快速投入生产',
    summary:
      '运用两步申报、提前申报、汇总缴税、简化单证、上门检验等便利化措施，让棉花等进口原材料更快进入生产环节。',
    date: '2020-06-20',
    source: '海关发布',
    tone: 'blue',
  },
  {
    id: 'news-2',
    title: '3年2万箱 黄岛海关创新进口棉花监管提升通关便利',
    summary:
      '黄岛口岸是全国重要棉花进口口岸，通过优化现场检验与监管模式，持续提升企业通关体验。',
    date: '2023-08-28',
    source: '口岸动态',
    tone: 'green',
  },
  {
    id: 'news-3',
    title: '淄博海关：助力棉花进口企业高质量发展',
    summary:
      '海关人员对进口棉花进行现场查验，落实质量安全监管要求，服务企业稳定生产。',
    date: '2024-12-09',
    source: '地方海关',
    tone: 'orange',
  },
  {
    id: 'news-4',
    title: '棉花检验智能化应用持续扩展',
    summary:
      '围绕颜色级、杂质、含水率等关键指标，探索图像识别与实验室检测协同的数字化质检流程。',
    date: '2026-05-18',
    source: '行业观察',
    tone: 'purple',
  },
];

export const colorGradeRows = [
  ['一级(11)', '77.2', '11.5', '黄度偏高，反射率偏低，实际为12'],
  ['二级(21)', '76.6', '9.3', '21和31的交界处'],
  ['三级(31)', '75.5', '8.0', '颜色稳定，接近标准样品'],
  ['四级(41)', '74.4', '7.0', '反射率继续降低'],
  ['五级(51)', '72.2', '5.7', '建议复核储存时间'],
  ['六级(61)', '70.1', '4.8', '低反射率样品'],
];

export const leafGradeRows = [
  ['1', 'Leaf Grade 1', 'LG1', '0.12'],
  ['2', 'Leaf Grade 2', 'LG2', '0.20'],
  ['3', 'Leaf Grade 3', 'LG3', '0.33'],
  ['4', 'Leaf Grade 4', 'LG4', '0.50'],
  ['5', 'Leaf Grade 5', 'LG5', '0.68'],
  ['6', 'Leaf Grade 6', 'LG6', '0.92'],
  ['7', 'Leaf Grade 7', 'LG7', '1.21'],
  ['8', 'Leaf Grade 8', 'LG8', '>1.21'],
];

export const mockRecognitionHistory: RecognitionResult[] = [
  {
    id: 'history-1',
    imageUri: '',
    createdAt: '2026-05-26 17:05',
    grade: '颜色级 21 / 叶屑 LG2',
    confidence: 0.91,
    isLocal: false,
    conclusion: '样品颜色与二级标准接近，杂质比例处于可接受范围。',
    metrics: [
      { label: '反射率 Rd', value: '76.6%' },
      { label: '黄度 +b', value: '9.3' },
      { label: '杂质面积', value: '0.20%' },
    ],
  },
];

export function createMockRecognitionResult(imageUri: string): RecognitionResult {
  const createdAt = new Date();

  return {
    id: `local-${createdAt.getTime()}`,
    imageUri,
    createdAt: createdAt.toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    grade: '颜色级 21 / 叶屑 LG2',
    confidence: 0.92,
    isLocal: true,
    conclusion: '当前为前端 mock 识别结果。真实接口接入后将展示后端返回的完整参数。',
    metrics: [
      { label: '反射率 Rd', value: '76.6%', hint: '基于 HVI 测试口径' },
      { label: '黄度 +b', value: '9.3', hint: '越高代表偏黄' },
      { label: '杂质面积', value: '0.20%', hint: '叶屑等级 LG2' },
      { label: '置信度', value: '92%', hint: '模型输出概率' },
    ],
  };
}
