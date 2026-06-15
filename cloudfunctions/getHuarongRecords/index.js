const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { size, limit = 50, stats } = event;

  try {
    const whereCondition = { openid };

    if (size && size !== 0) {
      const sizeNum = parseInt(size);
      if (!isNaN(sizeNum)) {
        whereCondition.size = sizeNum;
      }
    }

    // ========== 统计模式（轻量查询） ==========
    if (stats) {
      const countAll = await db.collection('huarong_records')
        .where(whereCondition)
        .count();

      let bestTime = null;
      let minMoves = null;

      const bestTimeRes = await db.collection('huarong_records')
        .where({ ...whereCondition, time: db.command.gt(0) })
        .orderBy('time', 'asc')
        .limit(1)
        .get();
      if (bestTimeRes.data.length > 0) {
        bestTime = bestTimeRes.data[0].time;
      }

      const bestMovesRes = await db.collection('huarong_records')
        .where({ ...whereCondition, moves: db.command.gt(0) })
        .orderBy('moves', 'asc')
        .limit(1)
        .get();
      if (bestMovesRes.data.length > 0) {
        minMoves = bestMovesRes.data[0].moves;
      }

      return {
        code: 200,
        stats: { totalCount: countAll.total, bestTime, minMoves }
      };
    }

    // ========== 记录列表模式 ==========
    const recordsRes = await db.collection('huarong_records')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return { code: 200, data: recordsRes.data };
  } catch (err) {
    return { code: 500, message: err.message, error: err.toString() };
  }
};
