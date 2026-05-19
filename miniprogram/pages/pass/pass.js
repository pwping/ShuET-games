const app = getApp();

Page({
  data: {
    bestRecord: null,
    nextLevel: 1,
    skipLevel: 6,
    nextLevelTime: 90,
    skipLevelTime: 65
  },

  onShow() {
    this.loadBestRecord();
  },

  loadBestRecord() {
    // 尝试从云端加载
    const openid = app.globalData.openid;
    if (!openid) {
      this.loadLocalBest();
      return;
    }

    wx.cloud.callFunction({
      name: 'getPassProgress',
      data: { openid },
      success: res => {
        if (res.result && res.result.code === 200 && res.result.data) {
          this.computeBestFromCloud(res.result.data);
        } else {
          this.loadLocalBest();
        }
      },
      fail: () => this.loadLocalBest()
    });
  },

  loadLocalBest() {
    const records = wx.getStorageSync('shult_records') || [];
    // 过滤出闯关模式(classic + pass)的记录
    const passRecords = records.filter(r => {
      const isPass = r.mode === 'classic' && r.size === 5;
      return isPass && r.status === 'success';
    });

    if (passRecords.length === 0) {
      this.setData({ bestRecord: null });
      return;
    }

    // 找出最快用时
    const fastest = passRecords.reduce((best, r) => {
      return (!best || r.timeCost < best.timeCost) ? r : best;
    }, null);

    this.setData({
      bestRecord: {
        level: passRecords.length,
        fastestTime: this.formatDuration(fastest.timeCost)
      }
    });
  },

  computeBestFromCloud(progress) {
    // progress.totalCurrent 记录总闯关数
    const totalCurrent = progress.totalCurrent || 0;
    if (totalCurrent === 0) {
      this.setData({ bestRecord: null });
      return;
    }

    // 尝试获取本地纪录中的最快用时
    const records = wx.getStorageSync('shult_records') || [];
    const passRecords = records.filter(r => r.mode === 'classic' && r.size === 5 && r.status === 'success');
    const fastest = passRecords.reduce((best, r) => {
      return (!best || r.timeCost < best.timeCost) ? r : best;
    }, null);

    this.setData({
      bestRecord: {
        level: totalCurrent,
        fastestTime: fastest ? this.formatDuration(fastest.timeCost) : '--'
      }
    });
  },

  formatDuration(ms) {
    if (!ms) return '00:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  },

  onShow() {
    this.loadBestRecord();
    this.computeLevelInfo();
  },

  computeLevelInfo() {
    // 先从本地缓存获取挑战进度
    const progress = wx.getStorageSync('shult_challenge_progress');
    console.log('computeLevelInfo - local progress:', progress);
    
    if (progress && progress.passLevel) {
      // 本地缓存有数据，直接显示
      console.log('computeLevelInfo - using local progress');
      const passLevel = progress.passLevel;
      const success = progress.success || false;
      
      let nextLevel;
      if (success) {
        nextLevel = passLevel + 1;
      } else {
        nextLevel = passLevel;
      }
      
      this.updateLevelDisplay(nextLevel);
      return;
    }
    
    // 本地缓存没有数据，查询云端
    console.log('computeLevelInfo - querying cloud...');
    wx.cloud.callFunction({
      name: 'getChallengeRecords',
      data: { page: 1, pageSize: 1 },
      success: res => {
        console.log('computeLevelInfo - cloud response:', res);
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data) && res.result.data.length > 0) {
          // 云端有记录，使用云端最新记录计算
          const cloudRecord = res.result.data[0];
          console.log('computeLevelInfo - using cloud record:', cloudRecord);
          const passLevel = cloudRecord.passLevel || 1;
          const success = cloudRecord.success || false;
          
          // 保存到本地缓存
          this.saveChallengeProgressToLocal(passLevel, success);
          
          let nextLevel;
          if (success) {
            nextLevel = passLevel + 1;
          } else {
            nextLevel = passLevel;
          }
          
          this.updateLevelDisplay(nextLevel);
        } else {
          // 云端无记录，显示第1关
          console.log('computeLevelInfo - no cloud records');
          this.updateLevelDisplay(1);
        }
      },
      fail: (err) => {
        console.error('computeLevelInfo - cloud fail:', err);
        // 查询失败，显示第1关
        this.updateLevelDisplay(1);
      }
    });
  },

  // 保存挑战进度到本地缓存
  saveChallengeProgressToLocal(passLevel, success) {
    const progress = {
      passLevel: passLevel,
      success: success,
      updateTime: new Date().toISOString()
    };
    wx.setStorageSync('shult_challenge_progress', progress);
    console.log('saveChallengeProgressToLocal:', progress);
  },

  // 更新关卡显示
  updateLevelDisplay(nextLevel) {
    const skipLevel = nextLevel + 5;
    const nextLevelTime = this.getPassTimeLimit(nextLevel);
    const skipLevelTime = this.getPassTimeLimit(skipLevel);

    this.setData({
      nextLevel,
      skipLevel,
      nextLevelTime,
      skipLevelTime
    });
  },

  // 规则：初始90s，>50s时每关减5s，30s~50s时每关减2s，10s~30s时每关减1s，到10s为最后一关
  getPassTimeLimit(level) {
    let time = 90;
    for (let i = 2; i <= level; i++) {
      if (time > 50) {
        time -= 5;
      } else if (time > 30) {
        time -= 2;
      } else if (time > 10) {
        time -= 1;
      } else {
        time = 10;
        break;
      }
    }
    return Math.max(time, 10);
  },

  onStartChallenge() {
    const { nextLevel } = this.data;
    wx.navigateTo({
      url: `/pages/challenge/challenge?passLevel=${nextLevel}`
    });
  },

  onSkipChallenge() {
    const { skipLevel } = this.data;
    wx.navigateTo({
      url: `/pages/challenge/challenge?passLevel=${skipLevel}`
    });
  }
});
