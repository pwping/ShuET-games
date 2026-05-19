const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  try {
    const progressRes = await db.collection('level_progress').where({ openid }).get();

    if (progressRes.data.length > 0) {
      return { code: 200, data: progressRes.data[0] };
    }

    // 创建默认进度
    const defaultProgress = {
      openid,
      currentLevel: 'base',
      maxSize: 3,
      updateTime: db.serverDate()
    };
    await db.collection('level_progress').add({ data: defaultProgress });

    return { code: 200, data: defaultProgress };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
