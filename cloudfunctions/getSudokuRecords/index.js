const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { difficulty, limit = 50, stats } = event;

  try {
    const whereCondition = { openid };

    if (difficulty) {
      whereCondition.difficulty = difficulty;
    }

    // ========== 单难度统计模式（前端会调用此分支） ==========
    if (stats) {
      const countAll = await db.collection('sudoku_records')
        .where(whereCondition)
        .count();

      let bestTime = null;

      const bestTimeRes = await db.collection('sudoku_records')
        .where({ ...whereCondition, time: db.command.gt(0) })
        .orderBy('time', 'asc')
        .limit(1)
        .get();
      if (bestTimeRes.data.length > 0) {
        bestTime = bestTimeRes.data[0].time;
      }

      return {
        code: 200,
        stats: { totalCount: countAll.total, bestTime }
      };
    }

    // ========== 记录列表 ==========
    const recordsRes = await db.collection('sudoku_records')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return { code: 200, data: recordsRes.data };
  } catch (err) {
    return { code: 500, message: err.message, error: err.toString() };
  }
};
