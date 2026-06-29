// 游戏配置数据，从 app.js 中拆分出来以减少启动开销
var MODES = [
  { key: 'classic', name: '经典模式', desc: '从1开始按顺序点击数字' },
  { key: 'interference', name: '干扰模式', desc: '彩色背景下的抗干扰训练' },
  { key: 'shuffle', name: '换位模式', desc: '正确后数字重新排列' },
  { key: 'reverse', name: '倒序模式', desc: '从大到小倒序点击' },
  { key: 'parity', name: '奇偶模式', desc: '从小到大点击奇数或偶数' },
  { key: 'challenge', name: '限时模式', desc: '每步限时2秒' },
  { key: 'alphabet', name: '字母模式', desc: '按顺序点击A-Z字母' },
  { key: 'memory', name: '记忆模式', desc: '先记忆，然后按顺序点击' }
];

var LEVELS = [
  { key: 'base', name: '基础', size: 3 },
  { key: 'primary', name: '初阶', size: 4 },
  { key: 'high', name: '标准', size: 5 },
  { key: 'super', name: '中阶', size: 6 },
  { key: 'unique', name: '高阶', size: 7 },
  { key: 'matchless', name: '极限', size: 8 },
  { key: 'sky', name: '疯狂', size: 9 },
  { key: 'crazy', name: '宗师', size: 10 }
];

module.exports = { MODES: MODES, LEVELS: LEVELS };
