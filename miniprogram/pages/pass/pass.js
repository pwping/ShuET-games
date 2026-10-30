const appConfig = require('../../config.js');
const app = getApp();

// 激励视频广告
let videoAd = null

Page({
  data: {
    bestRecord: null,
    nextLevel: 1,
    skipLevel: 6,
    nextLevelTime: 90,
    skipLevelTime: 65
  },

  loadBestRecord() {
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

  formatDuration(ms) {
    if (!ms) return '00:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  },

  onLoad() {
    // 创建激励视频广告实例
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: appConfig.adUnits.reward
      })
  videoAd.onLoad(() => {})
  videoAd.onError((err) => {
    console.error('激励视频广告加载失败', err)
  })
      videoAd.onClose((res) => {})
    }
  },

  onShow() {
    // 从广告返回后恢复导航栏样式
    wx.setNavigationBarColor({
      backgroundColor: '#FAF8F5',
      frontColor: '#000000'
    });
    wx.setBackgroundColor({
      backgroundColor: '#FAF8F5'
    });
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

  // 原生模板广告事件
  adLoad() {
    console.log('原生模板广告加载成功')
    // 广告加载后会污染导航栏，立即重置
    wx.setNavigationBarColor({
      backgroundColor: '#FAF8F5',
      frontColor: '#000000'
    })
  },
  adError(err) {
    console.error('原生模板广告加载失败', err)
  },
  adClose() {
    console.log('原生模板广告关闭')
  },

  onSkipChallenge() {
    const { skipLevel } = this.data;
    let navigated = false;
    const doNavigate = () => {
      if (navigated) return;
      navigated = true;
      wx.navigateTo({
        url: `/pages/challenge/challenge?passLevel=${skipLevel}`
      });
    };

    // 显示激励视频广告（先恢复导航栏，避免黑线）
    if (videoAd) {
      wx.setNavigationBarColor({
        backgroundColor: '#FAF8F5',
        frontColor: '#000000'
      });
      wx.setBackgroundColor({
        backgroundColor: '#FAF8F5'
      });
      videoAd.onClose((res) => {
        if (res && res.isEnded) {
          doNavigate(); // 完整观看广告后跳转
        } else {
          wx.showToast({ title: '需要看完广告才能跳关', icon: 'none' });
        }
      });
      videoAd.show().catch(() => {
        // 失败重试
        videoAd.load()
          .then(() => videoAd.show())
          .catch(err => {
            console.error('激励视频广告显示失败', err);
            doNavigate(); // 广告失败仍然跳转
          })
      });
    } else {
      doNavigate();
    }
  }
});
