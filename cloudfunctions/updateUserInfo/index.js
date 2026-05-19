const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '未登录' };
  }

  const { nickName, avatarUrl } = event;

  try {
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length > 0) {
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: {
          nickName: nickName || '微信用户',
          avatarUrl: avatarUrl || '',
          updateTime: db.serverDate()
        }
      });
    }

    return { code: 200, message: '更新成功' };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
