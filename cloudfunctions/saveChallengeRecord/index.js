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
    const result = await db.collection('challenge_records').add({
      data: {
        passLevel: passLevel || 1,
        timeMs: timeMs || 0,
        success: success || false,
        accuracy: accuracy || 0,
        createTime: createTime || new Date().toISOString(),
        openid: openid,
        createdAt: db.serverDate()
      }
    });
    
    console.log('saveChallengeRecord - save success:', result);
    
    return {
      code: 200,
      message: '保存成功',
      data: result
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
