const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { difficulty, levelId, limit = 100, stats } = event;

  try {
    const whereCondition = { openid };

    if (difficulty && difficulty !== 'all') {
      whereCondition.difficulty = difficulty;
    }

    if (levelId && levelId !== 'all') {
      whereCondition.levelId = String(levelId);
    }

    // ========== 统计模式 ==========
    if (stats) {
      const countAll = await db.collection('movingBlock_records')
        .where(whereCondition).count();

      const bestMovesRes = await db.collection('movingBlock_records')
        .where({ ...whereCondition, moves: db.command.gt(0) })
        .orderBy('moves', 'asc').limit(1).get();
      const bestMoves = bestMovesRes.data.length > 0 ? bestMovesRes.data[0].moves : null;

      const bestTimeRes = await db.collection('movingBlock_records')
        .where({ ...whereCondition, time: db.command.gt(0) })
        .orderBy('time', 'asc').limit(1).get();
      const bestTime = bestTimeRes.data.length > 0 ? bestTimeRes.data[0].time : null;

      return {
        code: 200,
        stats: { totalCount: countAll.total, bestMoves, bestTime }
      };
    }

    // ========== 记录列表模式 ==========
    const recordsRes = await db.collection('movingBlock_records')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return { code: 200, data: recordsRes.data };
  } catch (err) {
    return { code: 500, message: err.message, error: err.toString() };
  }
};
