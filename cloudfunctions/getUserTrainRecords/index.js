const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const $ = db.command.aggregate;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { mode, size, limit = 50, stats } = event;

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

    // ========== 统计模式（轻量查询，不拉取全部记录） ==========
    if (stats) {
      // 1. 总记录数
      const countAll = await db.collection('train_records')
        .where(whereCondition)
        .count();

      // 2. 最佳成绩（成功记录中用时最短的）
      const bestRes = await db.collection('train_records')
        .where({ ...whereCondition, status: 'success' })
        .orderBy('timeCost', 'asc')
        .limit(1)
        .get();

      let bestTimeMs = null;
      if (bestRes.data.length > 0 && bestRes.data[0].timeCost > 0) {
        bestTimeMs = bestRes.data[0].timeCost;
      }

      // 3. 各模式统计（按 mode+size 分组，仅成功记录）
      let modeStats = [];
      try {
        const aggRes = await db.collection('train_records')
          .aggregate()
          .match({ ...whereCondition, status: 'success' })
          .group({
            _id: {
              mode: '$mode',
              size: '$size'
            },
            count: $.sum(1),
            bestTime: $.min('$timeCost')
          })
          .sort({ count: -1 })
          .end();

        modeStats = (aggRes.list || []).map(item => ({
          mode: item._id.mode,
          size: item._id.size,
          count: item.count,
          bestTimeMs: item.bestTime
        }));
      } catch (aggErr) {
        // 聚合失败则返回空统计
        console.error('aggregation error:', aggErr);
      }

      return {
        code: 200,
        stats: {
          totalCount: countAll.total,
          bestTimeMs,
          modeStats
        }
      };
    }

    // ========== 记录列表模式（保留原行为） ==========
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
