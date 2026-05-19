const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { mode, size, limit = 50 } = event;

  try {
    const whereCondition = { openid };
    
    if (mode && mode !== 'all') {
      whereCondition.mode = mode;
    }
    
    if (size && size !== 0) {
      const sizeNum = parseInt(size);
      if (!isNaN(sizeNum)) {
        whereCondition.size = sizeNum;
      }
    }

    const recordsRes = await db.collection('train_records')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return { code: 200, data: recordsRes.data };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
