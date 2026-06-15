const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { size, moves, time, createTime } = event;

  try {
    let finalCreateTime;
    if (typeof createTime === 'string' && createTime.length > 0) {
      finalCreateTime = createTime;
    } else {
      finalCreateTime = new Date().toISOString();
    }

    // 使用 add 创建新记录（wx-server-sdk 的 update 不支持 upsert）
    const result = await db.collection('huarong_records').add({
      data: {
        openid, size, moves, time, createTime: finalCreateTime
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
