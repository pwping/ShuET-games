const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { level, size } = event;

  try {
    const progressRes = await db.collection('level_progress').where({ openid }).get();

    if (progressRes.data.length > 0) {
      const current = progressRes.data[0];
      if (size > current.maxSize) {
        await db.collection('level_progress').doc(current._id).update({
          data: {
            currentLevel: level,
            maxSize: size,
            updateTime: db.serverDate()
          }
        });
      }
    }

    return { code: 200, message: '解锁成功' };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
