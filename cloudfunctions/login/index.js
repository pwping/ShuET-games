const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取用户信息失败' };
  }

  try {
    // 查询用户是否存在
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length > 0) {
      // 更新登录时间
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: { updateTime: db.serverDate() }
      });
      return { code: 200, message: '登录成功', data: userRes.data[0] };
    }

    // 创建新用户
    const newUser = {
      openid,
      nickName: event.nickName || '微信用户',
      avatarUrl: event.avatarUrl || '',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const addRes = await db.collection('users').add({ data: newUser });

    // 初始化闯关进度
    await db.collection('level_progress').add({
      data: {
        openid,
        currentLevel: 'base',
        maxSize: 3,
        updateTime: db.serverDate()
      }
    });

    return { code: 200, message: '注册成功', data: { ...newUser, _id: addRes._id } };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
