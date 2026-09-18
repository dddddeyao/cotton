/**
 * 分类标准数据（唯一数据源）
 *
 * 「分类标准」页展示的表格，与「智能识别」检测结果的等级判定口径、等级写法，
 * 全部取自本文件，保证检测标准与分类标准始终一致：
 * - 颜色等级：标准代码 11/21/31/41/51/61/71，按反射率 Rd(%) 与黄度 +b 判定；
 * - 杂质等级：标准代码 1~8（叶屑等级），按杂质所占的面积/% 判定。
 */

export const standardParameterRows = [
  ['判定模型', 'HVI / Hunter Lab'],
  ['颜色变量', 'Rd(%) + +b'],
  ['颜色等级', '7 级'],
  ['叶屑等级', '8 级'],
];

/** 颜色等级：反射率 Rd(%) + 黄度 +b，共 7 级 */
export type ColorGradeLevel = {
  /** 等级序号，即「几级」前面的数字（1~7），界面只显示这个数字 */
  level: number;
  /** 等级代码，与模型输出、后端 colorGrade 字段一致 */
  code: number;
  /** 中文等级名称 */
  name: string;
  /** 反射率 Rd(%) */
  reflectance: number;
  /** 黄度 +b */
  yellowness: number;
  /** 标准备注 */
  remark: string;
};

export const colorGradeLevels: ColorGradeLevel[] = [
  { level: 1, code: 11, name: '一级', reflectance: 77.2, yellowness: 11.5, remark: '黄度偏高，反射率偏低，实际为12' },
  { level: 2, code: 21, name: '二级', reflectance: 76.6, yellowness: 9.3, remark: '21和31的交界处' },
  { level: 3, code: 31, name: '三级', reflectance: 74.9, yellowness: 9.2, remark: '达级 31' },
  { level: 4, code: 41, name: '四级', reflectance: 72.1, yellowness: 8.4, remark: '达级 41' },
  { level: 5, code: 51, name: '五级', reflectance: 68.3, yellowness: 6.9, remark: '达级 51' },
  { level: 6, code: 61, name: '六级', reflectance: 63.6, yellowness: 6.9, remark: '达级 61' },
  { level: 7, code: 71, name: '七级', reflectance: 55.9, yellowness: 7.4, remark: '达级 71' },
];

/** 叶屑（杂质）等级：杂质所占的面积/%，共 8 级（第 8 级为级外） */
export type LeafGradeLevel = {
  /** 叶屑代码，与后端 impurityGrade 字段一致 */
  code: number;
  /** 中文等级名称 */
  name: string;
  /** 标准原文等级名 */
  englishName: string;
  /** 标准符号 */
  symbol: string;
  /** 杂质所占的面积/% 上限，null 表示“以上” */
  maxRatioPercent: number | null;
  /** 表格展示文本 */
  ratioText: string;
};

export const leafGradeLevels: LeafGradeLevel[] = [
  { code: 1, name: '一级', englishName: 'Leaf Grade 1', symbol: 'LG1', maxRatioPercent: 0.12, ratioText: '0.12' },
  { code: 2, name: '二级', englishName: 'Leaf Grade 2', symbol: 'LG2', maxRatioPercent: 0.2, ratioText: '0.20' },
  { code: 3, name: '三级', englishName: 'Leaf Grade 3', symbol: 'LG3', maxRatioPercent: 0.33, ratioText: '0.33' },
  { code: 4, name: '四级', englishName: 'Leaf Grade 4', symbol: 'LG4', maxRatioPercent: 0.5, ratioText: '0.50' },
  { code: 5, name: '五级', englishName: 'Leaf Grade 5', symbol: 'LG5', maxRatioPercent: 0.68, ratioText: '0.68' },
  { code: 6, name: '六级', englishName: 'Leaf Grade 6', symbol: 'LG6', maxRatioPercent: 0.92, ratioText: '0.92' },
  { code: 7, name: '七级', englishName: 'Leaf Grade 7', symbol: 'LG7', maxRatioPercent: 1.21, ratioText: '1.21' },
  { code: 8, name: '八级', englishName: 'Leaf Grade 8', symbol: 'LG8', maxRatioPercent: null, ratioText: '>1.21' },
];

/** 颜色等级参数表（由 colorGradeLevels 派生，避免两处标准不一致） */
export const colorGradeRows = colorGradeLevels.map((level) => [
  `${level.name}（${level.code}）`,
  level.reflectance.toFixed(1),
  level.yellowness.toFixed(1),
  level.remark,
]);

/** 叶屑等级参数表（由 leafGradeLevels 派生，避免两处标准不一致） */
export const leafGradeRows = leafGradeLevels.map((level) => [
  String(level.code),
  level.englishName,
  level.symbol,
  level.ratioText,
]);

export const colorDetectionTip =
  '棉花随存放时间延长，反射率下降、黄度增加。显示的标准样品中1、2级因存放时间较长不达标，建议9月份用新棉花样品补充1、2级图片。';

function parseGradeCode(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  if (typeof value === 'string') {
    const matched = value.match(/-?\d+(\.\d+)?/);
    if (!matched) {
      return null;
    }
    const parsed = Number(matched[0]);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }

  return null;
}

/** 颜色等级写法：只显示「几级」前面的数字，例如 二级（21） → 2 */
export function formatColorGrade(value: number | string | null | undefined): string {
  const code = parseGradeCode(value);
  if (code === null) {
    return '';
  }

  const level = colorGradeLevels.find((item) => item.code === code);
  return level ? String(level.level) : String(code);
}

/** 杂质等级写法：直接显示叶屑代码本身，例如 1、3、8（与标准表「叶屑代码」列一致） */
export function formatLeafGrade(value: number | string | null | undefined): string {
  const code = parseGradeCode(value);
  return code === null ? '' : String(code);
}
