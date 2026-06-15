const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { levelId, moves, steps, time, difficulty, createTime } = event;

  try {
    let finalCreateTime;
    if (typeof createTime === 'string' && createTime.length > 0) {
      finalCreateTime = createTime;
    } else {
      finalCreateTime = new Date().toISOString();
    }

    const result = await db.collection('movingBlock_records').add({
      data: {
        openid,
        levelId: String(levelId || ''),
        moves: parseInt(moves) || 0,
        steps: parseInt(steps) || 0,
        time: parseInt(time) || 0,
        difficulty: String(difficulty || 'easy'),
        createTime: finalCreateTime
      }
    });

    return {
      code: 200,
      message: '保存成功',
      createTime: finalCreateTime,
      _id: result._id
    };
  } catch (err) {
    return { code: 500, message: err.message, error: err.toString() };
  }
};
