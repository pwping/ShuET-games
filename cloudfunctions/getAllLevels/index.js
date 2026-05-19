const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const LEVELS = [
  { level: 'base', name: '基础', size: 3, sort: 1 },
  { level: 'primary', name: '初阶', size: 4, sort: 2 },
  { level: 'high', name: '高阶', size: 5, sort: 3 },
  { level: 'super', name: '超凡', size: 6, sort: 4 },
  { level: 'unique', name: '绝世', size: 7, sort: 5 },
  { level: 'matchless', name: '无双', size: 8, sort: 6 },
  { level: 'sky', name: '九天', size: 9, sort: 7 },
  { level: 'crazy', name: '疯狂', size: 10, sort: 8 }
];

exports.main = async (event, context) => {
  return {
    code: 200,
    msg: '获取成功',
    data: LEVELS
  };
};
