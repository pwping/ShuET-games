const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  // ========== 清理旧记录 ==========
  if (event.action === 'cleanup') {
    try {
      const totalRes = await db.collection('train_records')
        .where({ openid })
        .count();
      const total = totalRes.total;
      const batchSize = 20;
      let deleted = 0;

      while (deleted < total) {
        const res = await db.collection('train_records')
          .where({ openid })
          .limit(batchSize)
          .get();
        const ids = res.data.map(r => r._id);
        if (ids.length === 0) break;
        await db.collection('train_records')
          .where({ _id: db.command.in(ids) })
          .remove();
        deleted += ids.length;
      }
      return { code: 200, message: `已清理 ${deleted} 条记录` };
    } catch (err) {
      return { code: 500, message: err.message };
    }
  }

  // ========== 保存记录 ==========
  const { mode, level, size, timeCost, status, accuracy, createTime } = event;

  try {
    let finalCreateTime;
    if (typeof createTime === 'string' && createTime.length > 0) {
      finalCreateTime = createTime;
    } else {
      finalCreateTime = new Date().toISOString();
    }

    const record = {
      openid,
      mode,
      level,
      size,
      timeCost,
      status,
      accuracy,
      createTime: finalCreateTime
    };

    await db.collection('train_records').add({ data: record });
    return { code: 200, message: '保存成功', createTime: finalCreateTime };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
