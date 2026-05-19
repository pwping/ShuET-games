/**
 * 舒尔特方格 - 不同难度下不同年龄段的大众参考数据
 *
 * apply: 是否适用该规格
 * - true: 显示优秀/良好/待提升三档时间范围
 * - false: 标注为"不适用"并显示原因
 *
 * noData: 该规格无参考数据
 * - true: 显示无数据提示消息
 */
const NO_DATA_MESSAGE = (size) => `${size}×${size}规格暂无国际通用的参考标准数据，你能顺利完成该规格，就是自己的赢家。坚持训练，时间越短，说明专注力越好。`;

const RATING_DATA = {
  3: {
    label: '3×3',
    ages: [
      { age: '4-6岁',   apply: true, excellent: '5秒以内',  good: '5-9秒',   poor: '9秒以上' },
      { age: '7-11岁',  apply: true, excellent: '3秒以内',  good: '3-6秒',   poor: '6秒以上' },
      { age: '12-17岁', apply: true, excellent: '2秒以内',  good: '2-4秒',   poor: '4秒以上' },
      { age: '18岁以上',apply: true, excellent: '1.8秒以内',good: '1.8-4秒', poor: '4秒以上' },
    ],
    source: '认知训练平台及儿童发展研究推算',
  },
  4: {
    label: '4×4',
    ages: [
      { age: '4-6岁',   apply: true, excellent: '12秒以内', good: '12-20秒', poor: '20秒以上' },
      { age: '7-11岁',  apply: true, excellent: '7秒以内',  good: '7-14秒',  poor: '14秒以上' },
      { age: '12-17岁', apply: true, excellent: '5秒以内',  good: '5-10秒',  poor: '10秒以上' },
      { age: '18岁以上',apply: true, excellent: '4秒以内',  good: '4-9秒',   poor: '9秒以上' },
    ],
    source: '认知训练平台及儿童发展研究推算',
  },
  5: {
    label: '5×5',
    ages: [
      { age: '4-6岁',   apply: true, excellent: '30秒以内', good: '30-50秒', poor: '50秒以上' },
      { age: '7-11岁',  apply: true, excellent: '22秒以内', good: '22-38秒', poor: '38秒以上' },
      { age: '12-17岁', apply: true, excellent: '14秒以内', good: '14-24秒', poor: '24秒以上' },
      { age: '18岁以上',apply: true, excellent: '10秒以内', good: '10-18秒', poor: '18秒以上' },
    ],
    source: '《中国心理测验标准化手册》及俄罗斯航空医学研究所',
  },
  6: {
    label: '6×6',
    ages: [
      { age: '4-6岁',   apply: false, excellent: '不适用（难度过大）', good: '不适用（难度过大）', poor: '不适用（难度过大）' },
      { age: '7-11岁',  apply: true,  excellent: '35秒以内', good: '35-55秒', poor: '55秒以上' },
      { age: '12-17岁', apply: true,  excellent: '20秒以内', good: '20-34秒', poor: '34秒以上' },
      { age: '18岁以上',apply: true,  excellent: '15秒以内', good: '15-28秒', poor: '28秒以上' },
    ],
    source: '基于5x5数据模型及认知负荷推算',
  },
  7: { label: '7×7', noData: true },
  8: { label: '8×8', noData: true },
  9: { label: '9×9', noData: true },
  10: { label: '10×10', noData: true },
};

/**
 * 获取指定规格的参考数据
 * @param {number} size - 方格规格 (3/4/5/6/7/8/9/10)
 * @returns {object|null} 该规格的数据对象
 */
function getRatingData(size) {
  return RATING_DATA[size] || null;
}

/**
 * 获取所有支持的规格列表
 * @returns {number[]}
 */
function getAvailableSizes() {
  return Object.keys(RATING_DATA).map(Number);
}

module.exports = {
  RATING_DATA,
  NO_DATA_MESSAGE,
  getRatingData,
  getAvailableSizes,
};
