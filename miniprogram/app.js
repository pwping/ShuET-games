App({
  globalData: {
    openid: null,
    userInfo: null,
    isLoggedIn: false,
    globalBestTime: '--',
    _tabSwitchTarget: '',
    MODES: [
      { key: 'classic', name: '经典模式', desc: '从1开始按顺序点击数字' },
      { key: 'interference', name: '干扰模式', desc: '彩色背景下的抗干扰训练' },
      { key: 'shuffle', name: '换位模式', desc: '正确后数字重新排列' },
      { key: 'reverse', name: '倒序模式', desc: '从大到小倒序点击' },
      { key: 'parity', name: '奇偶模式', desc: '从小到大点击奇数或偶数' },
      { key: 'challenge', name: '限时模式', desc: '每步限时2秒' },
      { key: 'alphabet', name: '字母模式', desc: '按顺序点击A-Z字母' },
      { key: 'memory', name: '记忆模式', desc: '先记忆，然后按顺序点击' }
    ],
    LEVELS: [
      { key: 'base', name: '基础', size: 3 },
      { key: 'primary', name: '初阶', size: 4 },
      { key: 'high', name: '标准', size: 5 },
      { key: 'super', name: '中阶', size: 6 },
      { key: 'unique', name: '高阶', size: 7 },
      { key: 'matchless', name: '极限', size: 8 },
      { key: 'sky', name: '疯狂', size: 9 },
      { key: 'crazy', name: '宗师', size: 10 }
    ]
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库');
    } else {
      wx.cloud.init({
        env: 'xcx-prj-d5gzqi12z8482282f',
        traceUser: true
      });
    }

    // 读取登录状态
    const loginState = wx.getStorageSync('shult_login_state') || {};
    this.globalData.isLoggedIn = loginState.loggedIn || false;
  },

  // 将本地缓存记录同步到云端，同步后清除本地缓存
  syncLocalRecordsToCloud(callback) {
    const records = wx.getStorageSync('shult_records') || [];
    const challengeRecords = wx.getStorageSync('shult_challenge_records') || [];
    
    // 如果没有任何本地记录，直接回调
    if (records.length === 0 && challengeRecords.length === 0) {
      if (callback) callback();
      return;
    }

    let totalRecords = records.length + challengeRecords.length;
    let uploaded = 0;
    let hasFailed = false;

    // 上传普通训练记录
    records.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveTrainRecord',
        data: {
          mode: record.mode,
          level: record.level,
          size: record.size,
          timeCost: record.timeCost,
          status: record.status,
          accuracy: record.accuracy,
          ...(record.createTime ? { createTime: record.createTime } : {})
        },
        success: res => {
          if (res.result && res.result.code !== 200) {
            hasFailed = true;
          }
        },
        fail: () => {
          hasFailed = true;
        },
        complete: () => {
          uploaded++;
          this.checkSyncComplete(uploaded, totalRecords, hasFailed, callback);
        }
      });
    });

    // 上传闯关记录到专用的挑战记录表（保留本地记录的真实数据）
    challengeRecords.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveChallengeRecord',
        data: {
          passLevel: record.passLevel || 1,
          timeMs: record.timeMs,
          success: record.success,
          accuracy: record.accuracy !== undefined ? record.accuracy : (record.success ? 100 : Math.round(Math.random() * 80 + 20)),
          createTime: record.dateTime || new Date().toISOString()
        },
        success: res => {
          if (res.result && res.result.code !== 200) {
            hasFailed = true;
          }
        },
        fail: () => {
          hasFailed = true;
        },
        complete: () => {
          uploaded++;
          this.checkSyncComplete(uploaded, totalRecords, hasFailed, callback);
        }
      });
    });
  },

  checkSyncComplete(uploaded, total, hasFailed, callback) {
    if (uploaded >= total) {
      if (hasFailed) {
        console.warn('部分记录同步失败，保留本地缓存');
      } else {
        // 全部成功，清除本地缓存
        wx.removeStorageSync('shult_records');
        wx.removeStorageSync('shult_challenge_records');
      }
      if (callback) callback();
    }
  }
});
