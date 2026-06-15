const levelData = require('../game/levels-data.js');

// 自动获取关卡总数
const TOTAL = Math.max(...levelData.ALL_LEVELS.map(l => parseInt(l.id)));

Page({
  data: {
    totalLevels: TOTAL,
    levels: [],
    displayLevels: [],
    completedCount: 0,
    progressPercent: 0,
    showCount: 20,
    canLoadMore: true
  },

  onShow() {
    this.loadLevels();
  },

  loadLevels() {
    const localCompleted = wx.getStorageSync('mb_completed') || {};

    // 先渲染本地数据（立即显示）
    this.renderLevels(localCompleted);

    // 再异步从云端加载合并
    wx.cloud.callFunction({
      name: 'getMovingBlockRecords',
      data: { limit: 200 },
      success: res => {
        let cloudCompleted = {};
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
          res.result.data.forEach(r => {
            if (r.levelId) cloudCompleted[String(r.levelId)] = true;
          });
        }
        // 合并本地 + 云端
        const merged = { ...localCompleted };
        Object.keys(cloudCompleted).forEach(id => {
          merged[id] = merged[id] || { fromCloud: true };
        });
        // 保存到本地缓存，供下次使用
        wx.setStorageSync('mb_completed', merged);
        // 用合并数据重新渲染
        this.renderLevels(merged);
      },
      fail: () => {}
    });
  },

  renderLevels(completed) {
    let completedCount = 0;
    const allLevels = [];
    const maxId = Math.max(...levelData.ALL_LEVELS.map(l => parseInt(l.id)));

    for (let i = 0; i < maxId; i++) {
      const id = String(i + 1);
      const lvl = levelData.ALL_LEVELS.find(l => l.id === id);
      const isCompleted = !!completed[id];
      // 第1关可用，后续关需要前一关已通关
      const prevId = String(i);
      const prevCompleted = i === 0 || !!completed[prevId];
      const isAvailable = !!lvl && prevCompleted;
      allLevels.push({
        id, available: isAvailable, completed: isCompleted,
        steps: lvl ? lvl.steps : 0,
        showLock: !isCompleted && !isAvailable
      });
      if (isCompleted) completedCount++;
    }

    this.setData({
      levels: allLevels,
      displayLevels: allLevels.slice(0, 20),
      completedCount,
      progressPercent: Math.round((completedCount / maxId) * 100),
      showCount: 20,
      canLoadMore: allLevels.length > 20
    });
  },

  onLoadMore() {
    const next = this.data.showCount + 20;
    const items = this.data.levels.slice(0, next).map(d => ({ ...d, isNew: false }));
    this.setData({
      displayLevels: items,
      showCount: next,
      canLoadMore: next < this.data.levels.length
    });
  },

  onLevelTap(e) {
    const index = e.currentTarget.dataset.index;
    const level = this.data.levels[index];
    if (!level) return;

    if (!level.available) {
      wx.showToast({ title: '请先完成前面的关卡解锁', icon: 'none' });
      return;
    }

    const lvl = levelData.ALL_LEVELS.find(l => l.id === level.id);
    if (!lvl) {
      wx.showToast({ title: '关卡数据不存在', icon: 'none' });
      return;
    }

    const diff = levelData.getDifficulty(lvl.id);
    const groups = levelData.ALL_LEVELS.filter(l => levelData.getDifficulty(l.id) === diff);
    const idx = groups.findIndex(g => g.id === level.id);

    if (idx === -1) {
      wx.showToast({ title: '关卡加载失败', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/movingBlocks/game/game?diff=${diff}&level=${idx}`
    });
  }
});
