const cloud = require('wx-server-sdk')

cloud.init({
  env: 'xcx-prj-d5gzqi12z8482282f'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { page = 1, pageSize = 100 } = event
  
  try {
    const result = await db.collection('challenge_records')
      .where({
        openid: cloud.getWXContext().OPENID
      })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    return {
      code: 200,
      message: '查询成功',
      data: result.data
    }
  } catch (error) {
    console.error('查询挑战记录失败:', error)
    return {
      code: -1,
      message: '查询失败',
      error: error.message
    }
  }
}
