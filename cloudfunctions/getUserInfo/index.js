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
    const userRes = await db.collection('users').where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 404, message: '用户不存在' };
    }
    return { code: 200, data: userRes.data[0] };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
