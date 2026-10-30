const appConfig = require('../../config.js');
const app = getApp();
const settingsSync = require('../../utils/settings-sync');

// 插屏广告
let interstitialAd = null

// 计算闯关时间限制（秒）
// 规则：初始90s，>50s时每关减5s，30s~50s时每关减2s，10s~30s时每关减1s，到10s为最后一关
function getPassTimeLimit(level) {
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
}

function formatDateTimeNow() {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${da} ${h}:${mi}:${s}`;
}

Page({
  data: {
    mode: 'classic',
    modeName: '接受挑战',
    level: 'high',
    levelName: '标准',
    size: 5,
    total: 25,
    board: [],
    currentTarget: 1,
    hintNumber: 1,
    formattedTime: '00:00',
    showStartOverlay: true,
    showCountdownOverlay: false,
    countdown: 3,
    isPassMode: true,
    passLevelNumber: 1,
    cellFontSize: '44rpx',
    countdownLimit: 90,
    countdownRemaining: 90,
    // 结果遮罩
    showResult: false,
    resultAnimIn: false,
    passResultSuccess: false,
    isLastLevel: false,
    resultFormattedTime: '00:00.00',
    resultAccuracy: 0,
    resultSuccessText: '',
    resultFailText: '',
    isGameOver: false,
    showSettings: false,
    soundEnabled: true,
    vibrateEnabled: true
  },

  timer: null,
  startTime: null,
  wrongValues: new Set(),
  doneValues: new Set(),
  firstTryCorrect: new Set(),
  _audioCtx: null,
  _hasTappedAny: false,

  onLoad(options) {
    const passLevel = parseInt(options.passLevel) || 1;
    const countdownLimit = getPassTimeLimit(passLevel);

    this.setData({
      passLevelNumber: passLevel,
      countdownLimit,
      countdownRemaining: countdownLimit,
      total: 25,
      size: 5
    });

    wx.setNavigationBarTitle({
      title: `第 ${passLevel} 关 · 开始挑战`
    });
    wx.setNavigationBarColor({
      backgroundColor: '#EEF2FF',
      frontColor: '#000000'
    });

    // 加载音效/震动设置
    const settings = wx.getStorageSync('shult_challenge_settings') || {};
    this.setData({
      soundEnabled: settings.sound !== false,
      vibrateEnabled: settings.vibration !== false
    });

    this.generateBoard();

    // 创建插屏广告实例
    if (wx.createInterstitialAd) {
      interstitialAd = wx.createInterstitialAd({
        adUnitId: appConfig.adUnits.interstitial
      })
      interstitialAd.onLoad(() => {})
      interstitialAd.onError((err) => {
        console.error('插屏广告加载失败', err)
      })
      interstitialAd.onClose(() => {})
    }
  },

  onShow() {
    if (!this.data.showResult) {
      // 广告会污染导航栏，用 setTimeout 确保覆盖系统的默认样式
      wx.setNavigationBarColor({
        backgroundColor: '#EEF2FF',
        frontColor: '#000000'
      });
      wx.setBackgroundColor({
        backgroundColor: '#EEF2FF'
      });
      setTimeout(() => {
        wx.setNavigationBarColor({
          backgroundColor: '#EEF2FF',
          frontColor: '#000000'
        });
      }, 100);
    }
  },

  onUnload() {
    this.stopTimer();
  },

  generateBoard() {
    const total = 25;
    const numbers = [];
    for (let i = 1; i <= total; i++) {
      numbers.push(i);
    }
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const board = numbers.map((value, index) => ({
      value,
      index,
      done: false,
      flash: ''
    }));

    this.setData({ board });
    this.wrongValues.clear();
    this.doneValues.clear();
    this.firstTryCorrect.clear();
    this._hasTappedAny = false;
  },

  async onStartGame() {
    await this._initAudio();
    this.setData({ showStartOverlay: false });
    this.startAfterDelay();
  },

  async _initAudio() {
    try {
      if (!this._audioCtx) {
        this._audioCtx = wx.createWebAudioContext();
      }
      if (this._audioCtx.state === 'suspended') {
        await this._audioCtx.resume();
      }
    } catch (e) {}
  },

  startGame() {
    this.setData({ isGameOver: false });
    this.startTime = Date.now();
    this.startTimer();
  },

  startTimer() {
    this._remainingMs = this.data.countdownLimit * 1000;
    this.timer = setInterval(() => {
      this._remainingMs -= 20;
      if (this._remainingMs <= 0) {
        this.setData({ formattedTime: '00:00.00' });
        this.onTimeOut();
      } else {
        this.setData({ formattedTime: this.formatCountdown(this._remainingMs) });
      }
    }, 20);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  formatCountdown(ms) {
    if (ms <= 0) return '00:00.00';
    const totalMs = Math.max(ms, 0);
    const totalSec = Math.floor(totalMs / 1000);
    const cs = Math.floor((totalMs % 1000) / 10);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  },

  onCellTap(e) {
    if (this.data.isGameOver) return;

    this._hasTappedAny = true;
    const index = e.currentTarget.dataset.index;
    const cell = this.data.board[index];
    const expected = this.data.currentTarget;

    if (cell.done) {
      this.wrongValues.add(cell.value);
      this.onWrongTap(index);
      return;
    }

    if (cell.value !== expected) {
      this.wrongValues.add(cell.value);
      this.onWrongTap(index);
      return;
    }

    // 正确
    this.playSound('correct');
    this.playVibration();
    this.doneValues.add(cell.value);
    if (!this.wrongValues.has(expected)) {
      this.firstTryCorrect.add(expected);
    }
    this.doneCell(index, cell);
  },

  onWrongTap(index) {
    if (this.data.isGameOver) return;
    this.setData({ isGameOver: true });

    this.playSound('wrong');
    this.playVibration();
    this.setData({ [`board[${index}].flash`]: 'wrong' });
    this.stopTimer();
    this.wrongValues.add(this.data.board[index].value);
    setTimeout(() => {
      const elapsed = Date.now() - this.startTime;
      const timeStr = this.formatSeconds(elapsed);
      const accuracy = Math.round(this.firstTryCorrect.size / this.data.total * 100);
      this.saveRecord(false, elapsed);
      this.showResultOverlay(false, this.data.countdownLimit <= 10, timeStr, accuracy);
    }, 500);
  },

  doneCell(index, cell) {
    const newTarget = this.data.currentTarget + 1;
    const updates = {
      [`board[${index}].done`]: true,
      currentTarget: newTarget
    };

    updates[`board[${index}].flash`] = 'correct';
    setTimeout(() => this.setData({ [`board[${index}].flash`]: '' }), 300);

    this.setData(updates);
    this.setData({ hintNumber: newTarget });

    if (newTarget > this.data.total) {
      this.stopTimer();
      this.setData({ hintNumber: '成功', isGameOver: true });

      const elapsed = Date.now() - this.startTime;
      const isLast = this.data.countdownLimit <= 10;
      const accuracy = 100;
      const usedMs = this.data.countdownLimit * 1000 - this._remainingMs;
      const timeStr = this.formatSeconds(usedMs);

      // 通关成功立即记录闯关进度
      const progress = wx.getStorageSync('shult_pass_progress') || { currentSize: 5, stageCurrent: 0, totalCurrent: 0 };
      if (this.data.passLevelNumber > progress.totalCurrent) {
        progress.totalCurrent = this.data.passLevelNumber;
        progress.stageCurrent = this.data.passLevelNumber;
        progress.currentSize = 5;
        wx.setStorageSync('shult_pass_progress', progress);
      }

      setTimeout(() => {
        this.saveRecord(true, elapsed);
        this.showResultOverlay(true, isLast, timeStr, accuracy);
      }, 500);
    }
  },

  saveRecord(success, elapsed) {
    const dateTime = new Date().toISOString();
    const accuracy = success ? 100 : Math.round(this.firstTryCorrect.size / this.data.total * 100);
    const record = {
      type: 'challenge',
      passLevel: this.data.passLevelNumber,
      timeMs: elapsed,
      success,
      accuracy,
      dateTime
    };

    // 更新挑战进度缓存
    const progress = {
      passLevel: this.data.passLevelNumber,
      success: success,
      updateTime: dateTime
    };
    wx.setStorageSync('shult_challenge_progress', progress);

    // 未登录：保存到本地缓存
    if (!app.globalData.isLoggedIn) {
      const records = wx.getStorageSync('shult_challenge_records') || [];
      records.unshift(record);
      wx.setStorageSync('shult_challenge_records', records.slice(0, 100));
      return;
    }

    // 已登录：保存到云端，然后删除本地缓存（不管同步是否成功）
    wx.cloud.callFunction({
      name: 'saveChallengeRecord',
      data: {
        passLevel: this.data.passLevelNumber,
        timeMs: elapsed,
        success: success,
        accuracy: accuracy,
        createTime: dateTime
      }
    });
    wx.removeStorageSync('shult_challenge_records');
  },

  onTimeOut() {
    this.stopTimer();
    this.setData({ isGameOver: true });
    const elapsed = Date.now() - this.startTime;
    const accuracy = this._hasTappedAny ? Math.round(this.firstTryCorrect.size / this.data.total * 100) : 0;
    const isLast = this.data.countdownLimit <= 10;
    const elapsedMs = Math.min(elapsed, this.data.countdownLimit * 1000);
    const timeStr = this.formatSeconds(elapsedMs);

    this.saveRecord(false, elapsed);
    this.showResultOverlay(false, isLast, timeStr, accuracy);
  },

  formatSeconds(ms) {
    if (ms <= 0) return '0.00s';
    return (ms / 1000).toFixed(2) + 's';
  },

  getRandomText(success) {
    const successTexts = [
      '天神下凡！你的手指是装了火箭吗？🚀',
      '这速度，博尔特看了都流泪 😂',
      '就这？我还没热身你就点完了？🔥',
      '你已经超越了 99% 的人类！剩下 1% 是外星人 👽',
      '建议直接保送国家队，别耽误了 🏅',
      '你的手指是不是偷偷练过佛山无影脚？👣',
      '大脑超频模式已开启 ⚡',
      '恭喜获得称号：「闪电侠」⚡',
      '你是不是偷偷开了 2 倍速？🎮',
      '这个水平，建议直接挑战开发者 👨‍💻'
    ];
    const failTexts = [
      '别慌，爱因斯坦当年也没点完 🤓',
      '看来手指今天有点疲惫，喝杯奶茶再战 🧋',
      '没关系，失败是成功的妈，虽然这位妈有点严格 😅',
      '你离成功只差一个「再来一次」的距离 📏',
      '大脑：我看完了。手指：我还没准备好 😵',
      '建议先做个手指操再来挑战 🖐️',
      '这关太难了，一定是游戏的问题！对！👆',
      '不是你不强，是这数字太狡猾了 🦊',
      '温馨提示：深呼吸，手指放松，再来 💪',
      '今天的失败，是为了明天吹牛的时候更有素材 📝'
    ];
    const texts = success ? successTexts : failTexts;
    return texts[Math.floor(Math.random() * texts.length)];
  },

  showResultOverlay(success, isLast, timeStr, accuracy) {
    wx.setNavigationBarColor({
      backgroundColor: success ? '#F0FDF4' : '#FFF0F0',
      frontColor: '#000000'
    });

    // 显示插屏广告
    if (interstitialAd) {
      interstitialAd.show().catch((err) => {
        console.error('插屏广告显示失败', err)
      })
    }

    const resultSuccessText = this.getRandomText(true);
    const resultFailText = this.getRandomText(false);
    this.setData({
      showResult: true,
      passResultSuccess: success,
      isLastLevel: isLast,
      resultFormattedTime: timeStr,
      resultAccuracy: accuracy,
      resultSuccessText,
      resultFailText
    });
    setTimeout(() => {
      this.setData({ resultAnimIn: true });
    }, 50);
  },

  onResultNextLevel() {
    const nextLevel = this.data.passLevelNumber + 1;
    const progress = wx.getStorageSync('shult_pass_progress') || { currentSize: 5, stageCurrent: 0, totalCurrent: 0 };
    progress.stageCurrent = nextLevel - 1;
    progress.totalCurrent = nextLevel - 1;
    progress.currentSize = 5;
    wx.setStorageSync('shult_pass_progress', progress);
    // 恢复导航栏颜色为游戏界面背景色（虽然redirectTo会重新加载页面，但为了保险起见）
    wx.setNavigationBarColor({
      backgroundColor: '#EEF2FF',
      frontColor: '#000000'
    });
    wx.redirectTo({
      url: `/pages/challenge/challenge?passLevel=${nextLevel}`
    });
  },

  onResultRetry() {
    this.stopTimer();
    this.wrongValues.clear();
    this.doneValues.clear();
    this._hasTappedAny = false;
    // 恢复导航栏颜色为游戏界面背景色
    wx.setNavigationBarColor({
      backgroundColor: '#EEF2FF',
      frontColor: '#000000'
    });
    this.setData({
      showResult: false,
      resultAnimIn: false,
      currentTarget: 1,
      formattedTime: '00:00',
      hintNumber: 1
    });
    this.generateBoard();
    this.startAfterDelay();
  },

  onResultGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onResultMaskTap() {
    // Do nothing, prevent closing by tapping mask
  },

  onRestart() {
    this.stopTimer();
    this.wrongValues.clear();
    this.doneValues.clear();
    this._hasTappedAny = false;
    this.setData({
      showResult: false,
      resultAnimIn: false,
      currentTarget: 1,
      formattedTime: '00:00',
      hintNumber: 1
    });
    this.generateBoard();
    this.startAfterDelay();
  },

  startAfterDelay() {
    this.setData({ showCountdownOverlay: true, countdown: 3 });
    this.playSound('countdown');
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        this.setData({ countdown: count });
        this.playSound('countdown');
      } else {
        clearInterval(interval);
        this.setData({ showCountdownOverlay: false });
        this.startGame();
      }
    }, 1000);
  },

  playVibration() {
    const settings = wx.getStorageSync('shult_challenge_settings') || {};
    if (settings.vibration === false) return;
    try {
      wx.vibrateShort({ type: 'medium' });
    } catch (e) {
      try { wx.vibrateShort({ type: 'light' }); } catch (e2) {}
    }
  },

  playSound(type) {
    const settings = wx.getStorageSync('shult_challenge_settings') || {};
    if (settings.sound === false) return;
    try {
      if (!this._audioCtx) {
        this._audioCtx = wx.createWebAudioContext();
      }
      const audioCtx = this._audioCtx;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      if (type === 'correct') {
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'countdown') {
        oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.12);
      } else {
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {}
  },

  /* ===== 设置弹窗 ===== */
  preventMove() {},
  onShowSettings() {
    const settings = wx.getStorageSync('shult_challenge_settings') || {};
    this.setData({
      showSettings: true,
      soundEnabled: settings.sound !== false,
      vibrateEnabled: settings.vibration !== false
    });
  },
  onCloseSettings() {
    this.setData({ showSettings: false });
  },
  onSoundToggle(e) {
    const enabled = e.detail.value;
    const settings = wx.getStorageSync('shult_challenge_settings') || {};
    settings.sound = enabled;
    wx.setStorageSync('shult_challenge_settings', settings);
    this.setData({ soundEnabled: enabled });
    settingsSync.syncGlobalAfterToggle('sound', enabled);
  },
  onVibrateToggle(e) {
    const enabled = e.detail.value;
    const settings = wx.getStorageSync('shult_challenge_settings') || {};
    settings.vibration = enabled;
    wx.setStorageSync('shult_challenge_settings', settings);
    this.setData({ vibrateEnabled: enabled });
    settingsSync.syncGlobalAfterToggle('vibration', enabled);
  },

  onShareAppMessage() {
    return {
      title: `第 ${this.data.passLevelNumber || 1} 关挑战结束，你能挑战到第几关？`,
      path: '/pages/game-select/game-select',
      imageUrl: appConfig.shareImageUrl
    };
  }
});
