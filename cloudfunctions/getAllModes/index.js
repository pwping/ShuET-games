const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MODES = [
  { mode: 'classic', name: '经典模式', desc: '数字正序，无干扰基础训练' },
  { mode: 'interfere', name: '干扰模式', desc: '彩色背景干扰，锻炼抗干扰能力' },
  { mode: 'swap', name: '换位模式', desc: '每次点击后数字重新洗牌换位' },
  { mode: 'reverse', name: '倒序模式', desc: '按最大到最小倒序点击数字' },
  { mode: 'parity', name: '奇偶模式', desc: '先点击所有奇数，再点击所有偶数' },
  { mode: 'challenge', name: '挑战模式', desc: '每步限时2秒，超时即失败' },
  { mode: 'memory', name: '记忆模式', desc: '数字隐藏后凭记忆按顺序点击' }
];

exports.main = async (event, context) => {
  return {
    code: 200,
    msg: '获取成功',
    data: MODES
  };
};
