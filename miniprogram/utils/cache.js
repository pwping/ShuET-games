/**
 * 简单缓存工具 - 减少重复云函数调用
 * 缓存策略：内存缓存 + 存储缓存（写入 wx storage）
 */

const MEMO = {};

/**
 * 获取缓存数据
 * @param {string} key 缓存键
 * @returns {any|null} 如果缓存有效返回值，否则返回 null
 */
function get(key) {
  const entry = MEMO[key];
  if (entry && Date.now() < entry.expire) {
    return entry.data;
  }
  return null;
}

/**
 * 设置缓存数据
 * @param {string} key 缓存键
 * @param {any} data 数据
 * @param {number} ttl 有效期（毫秒），默认 60 秒
 */
function set(key, data, ttl) {
  if (ttl === undefined) ttl = 60000;
  MEMO[key] = { data, expire: Date.now() + ttl };
}

/**
 * 带缓存的云函数调用
 * @param {object} options - 参数 { name, data, cacheKey, ttl }
 * @returns {Promise<any>}
 */
async function cloudCall(options) {
  const cacheKey = options.cacheKey || `${options.name}_${JSON.stringify(options.data || {})}`;
  const cached = get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const res = await wx.cloud.callFunction({
    name: options.name,
    data: options.data
  });

  set(cacheKey, res, options.ttl);
  return res;
}

/**
 * 清除缓存
 * @param {string} key 指定键，不传则清空所有
 */
function clear(key) {
  if (key) {
    delete MEMO[key];
  } else {
    Object.keys(MEMO).forEach(k => delete MEMO[k]);
  }
}

module.exports = { get, set, clear, cloudCall };
