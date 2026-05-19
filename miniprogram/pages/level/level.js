const app = getApp();

const ALL_LEVELS = [
  { key: 'base', name: '基础', size: 3, tag: '入门',
    color: '#10B981', desc: '基础辨认与追踪' },
  { key: 'primary', name: '初阶', size: 4, tag: '简单',
    color: '#8B5CF6', desc: '初级视觉广度锻炼' },
  { key: 'high', name: '标准', size: 5, tag: '标准',
    color: '#14B8A6', desc: '国际标准方格' },
  { key: 'super', name: '中阶', size: 6, tag: '进阶',
    color: '#0284C7', desc: '中级挑战配合记忆辅助' },
  { key: 'unique', name: '高阶', size: 7, tag: '高手',
    color: '#D97706', desc: '高强度视觉搜索与快速定位协同' },
  { key: 'matchless', name: '极限', size: 8, tag: '极限',
    color: '#E11D48', desc: '极限视觉扫视' },
  { key: 'sky', name: '疯狂', size: 9, tag: '巅峰',
    color: '#BE185D', desc: '疯狂挑战但别在意速度' },
  { key: 'crazy', name: '宗师', size: 10, tag: '终极',
    color: '#EA580C', desc: '能完成就很不错了' }
];

const ALPHABET_LEVELS = [
  { key: 'base', name: '基础', size: 3, tag: '入门',
    color: '#10B981', desc: '基础辨认与追踪' },
  { key: 'primary', name: '初阶', size: 4, tag: '简单',
    color: '#8B5CF6', desc: '初级视觉广度锻炼' },
  { key: 'high', name: '标准', size: 5, tag: '标准',
    color: '#14B8A6', desc: '国际标准方格' }
];

Page({
  data: {
    mode: '',
    modeName: '',
    levels: [],
    animIn: false
  },

  onLoad(options) {
    const mode = options.mode || 'classic';
    const modeInfo = app.globalData.MODES
      ? app.globalData.MODES.find(m => m.key === mode)
      : null;
    this.setData({
      mode: mode,
      modeName: modeInfo ? modeInfo.name : '经典模式',
      animIn: true
    });
    setTimeout(() => this.setData({ animIn: false }), 350);
    this.setLevels();
  },

  setLevels() {
    const mode = this.data.mode;
    const levels = mode === 'alphabet'
      ? ALPHABET_LEVELS.map(l => ({ ...l }))
      : ALL_LEVELS.map(l => ({ ...l }));
    this.setData({ levels });
  },

  onLevelTap(e) {
    const index = e.currentTarget.dataset.index;
    const level = this.data.levels[index];
    wx.navigateTo({
      url: `/pages/game/game?mode=${this.data.mode}&level=${level.key}&size=${level.size}`
    });
  }
});
