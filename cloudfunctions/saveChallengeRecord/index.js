const cloud = require('wx-server-sdk')

cloud.init({
  env: 'xcx-prj-d5gzqi12z8482282f'
})

const db = cloud.database()

exports.main = async (event, context) => {
  console.log('saveChallengeRecord - received event:', event);
  
  const { passLevel, timeMs, success, accuracy, createTime } = event;
  const openid = cloud.getWXContext().OPENID;
  
  console.log('saveChallengeRecord - openid:', openid);
  
  try {
    const finalCreateTime = createTime || new Date().toISOString();

    // 先查重：同一用户同一时间戳的记录已存在则跳过
    const existRes = await db.collection('challenge_records')
      .where({ openid, createTime: finalCreateTime })
      .limit(1)
      .get();

    if (existRes.data.length > 0) {
      console.log('saveChallengeRecord - 记录已存在，跳过');
      return { code: 200, message: '记录已存在，跳过', skipped: true };
    }

    const result = await db.collection('challenge_records').add({
      data: {
        openid,
        passLevel: passLevel || 1,
        timeMs: timeMs || 0,
        success: success || false,
        accuracy: accuracy || 0,
        createTime: finalCreateTime
      }
    });

    console.log('saveChallengeRecord - save success:', result);

    return {
      code: 200,
      message: '保存成功',
      data: result,
      _id: result._id
    };
  } catch (error) {
    console.error('saveChallengeRecord - save error:', error);
    return {
      code: -1,
      message: '保存失败',
      error: error.message
    };
  }
};
