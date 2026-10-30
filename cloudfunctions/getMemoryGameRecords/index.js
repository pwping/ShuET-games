const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { level, limit = 50, stats } = event;

  try {
    const whereCondition = { openid };

    if (level) {
      whereCondition.level = level;
    }

    if (stats) {
      const maxLevelRes = await db.collection('memoryGame_records')
        .where({ openid })
        .orderBy('level', 'desc')
        .limit(1)
        .get();

      const countAll = await db.collection('memoryGame_records')
        .where({ openid })
        .count();

      return {
        code: 200,
        stats: {
          maxCompleted: maxLevelRes.data.length > 0 ? maxLevelRes.data[0].level : 0,
          totalCount: countAll.total
        }
      };
    }

    const recordsRes = await db.collection('memoryGame_records')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return { code: 200, data: recordsRes.data };
  } catch (err) {
    return { code: 500, message: err.message, error: err.toString() };
  }
};
