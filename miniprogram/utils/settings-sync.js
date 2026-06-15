/**
 * 设置同步工具 - 管理全局音效/震动总开关与4个游戏独立设置的联动
 * 存储key：
 *   global_settings     - 总开关
 *   hr_settings         - 华容道
 *   mb_settings         - 积木迷阵
 *   shult_settings      - 舒尔特普通
 *   shult_challenge_settings - 舒尔特挑战
 */

// 所有游戏存储key列表
const GAME_KEYS = ['hr_settings', 'mb_settings', 'shult_settings', 'shult_challenge_settings', 'sd_settings'];

/**
 * 检查所有游戏的某个设置是否全部开启
 */
function areAllEnabled(type) {
  for (const key of GAME_KEYS) {
    const settings = wx.getStorageSync(key) || {};
    const val = type === 'sound'
      ? (key === 'hr_settings' || key === 'mb_settings' ? settings.sound : settings.sound)
      : (key === 'hr_settings' || key === 'mb_settings' ? settings.vibrate : settings.vibration);
    if (val === false) return false;
  }
  return true;
}

/**
 * 同步更新总开关（在某个游戏设置改变后调用）
 */
function syncGlobalAfterToggle(type, enabled) {
  if (!enabled) {
    const globalSettings = wx.getStorageSync('global_settings') || {};
    globalSettings[type] = false;
    wx.setStorageSync('global_settings', globalSettings);
  } else {
    if (type === 'sound' && areAllEnabled('sound')) {
      const globalSettings = wx.getStorageSync('global_settings') || {};
      globalSettings.sound = true;
      wx.setStorageSync('global_settings', globalSettings);
    }
    if (type === 'vibration' && areAllEnabled('vibration')) {
      const globalSettings = wx.getStorageSync('global_settings') || {};
      globalSettings.vibration = true;
      wx.setStorageSync('global_settings', globalSettings);
    }
  }
}

/**
 * 同步所有游戏设置到指定状态（总开关切换时调用）
 * 默认第一次使用时初始化所有游戏设置
 */
function syncAllGames(type, enabled) {
  for (const key of GAME_KEYS) {
    const settings = wx.getStorageSync(key) || {};
    if (type === 'sound') {
      settings.sound = enabled;
    } else {
      if (key === 'hr_settings' || key === 'mb_settings') {
        settings.vibrate = enabled;
      } else {
        settings.vibration = enabled;
      }
    }
    wx.setStorageSync(key, settings);
  }
  const globalSettings = wx.getStorageSync('global_settings') || {};
  globalSettings[type] = enabled;
  wx.setStorageSync('global_settings', globalSettings);
}

/**
 * 获取总开关状态
 */
function getGlobalSettings() {
  return wx.getStorageSync('global_settings') || { sound: true, vibration: true };
}

/**
 * 首次初始化：确保所有游戏设置存在
 */
function ensureInit() {
  const globalSettings = wx.getStorageSync('global_settings');
  if (!globalSettings || globalSettings.sound === undefined) {
    wx.setStorageSync('global_settings', { sound: true, vibration: true });
    for (const key of GAME_KEYS) {
      const settings = wx.getStorageSync(key);
      if (!settings || settings.sound === undefined) {
        const init = { sound: true };
        if (key === 'hr_settings' || key === 'mb_settings') {
          init.vibrate = true;
        } else {
          init.vibration = true;
        }
        wx.setStorageSync(key, init);
      }
    }
  }
}

module.exports = {
  areAllEnabled,
  syncGlobalAfterToggle,
  syncAllGames,
  getGlobalSettings,
  ensureInit
};
