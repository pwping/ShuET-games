const app = getApp();
const settingsSync = require('../../utils/settings-sync');

const MODES = {
  classic: { name: '经典模式', desc: '从1开始按顺序点击数字' },
  interference: { name: '干扰模式', desc: '彩色背景下的抗干扰训练' },
  shuffle: { name: '换位模式', desc: '正确后数字重新排列' },
  reverse: { name: '倒序模式', desc: '从大到小倒序点击' },
  parity: { name: '奇偶模式', desc: '从小到大点击奇数或偶数' },
  challenge: { name: '限时模式', desc: '每步限时2秒' },
  memory: { name: '记忆模式', desc: '先记忆，然后按顺序点击' },
  alphabet: { name: '字母模式', desc: '按顺序点击A-Z字母' }
};

const MEMORY_TIMES = {
  3: 5, 4: 10, 5: 20, 6: 30,
  7: 50, 8: 70, 9: 100, 10: 150
};

const LEVELS = {
  base: '基础', primary: '初阶', high: '标准', super: '中阶',
  unique: '高阶', matchless: '极限', sky: '疯狂', crazy: '宗师'
};

const COLORS = [
  '#F87171', '#34D399', '#60A5FA', '#FBBF24', '#C084FC',
  '#2DD4BF', '#F472B6', '#FB923C', '#A78BFA', '#67E8F9'
];

Page({
  data: {
    mode: 'classic',
    modeName: '经典模式',
    level: 'base',
    levelName: '基础',
    size: 3,
    board: [],
    currentTarget: 1,
    total: 9,
    hintNumber: 1,
    showHint: true,
    toolHide: false,
    toolMark: false,
    formattedTime: '00:00.00',
    showStartOverlay: true,
    showCountdownOverlay: false,
    countdown: 3,
    isMemoryPhase: false,
    memoryTimeLeft: 0,
    memoryTimeTotal: 0,
    showMemorySkipBtn: false,
    isPassMode: false,
    passLevelNumber: 1,
    parityType: 'odd',
    sizeList: [3, 4, 5, 6, 7, 8, 9, 10],
    ruleHint: '',
    cellFontSize: '44rpx',
    showSettings: false,
    soundEnabled: true,
    vibrateEnabled: true
  },

  timer: null,
  startTime: null,
  fixedElapsed: null,
  lastTimerElapsed: null,
  challengeTimer: null,
  wrongValues: new Set(),
  doneValues: new Set(),
  firstTryCorrect: new Set(),
  _audioCtx: null,

  getCellFontSize(size) {
    if (size >= 9) return '30rpx';
    if (size >= 7) return '34rpx';
    return '44rpx';
  },

  onLoad(options) {


    const mode = options.mode || 'classic';
    const level = options.level || 'base';
    const size = parseInt(options.size) || 3;
    const isPass = options.pass === '1';
    const passLevel = parseInt(options.passLevel) || 1;

    const total = size * size;
    const initialTarget = mode === 'alphabet' ? 'A' : 1;
    this.setData({
      mode,
      modeName: MODES[mode]?.name || '经典模式',
      level,
      levelName: LEVELS[level] || '基础',
      size,
      total,
      currentTarget: 1,
      hintNumber: initialTarget,
      isPassMode: isPass,
      passLevelNumber: passLevel,
      cellFontSize: this.getCellFontSize(size)
    });

    wx.setNavigationBarTitle({
      title: `${MODES[mode]?.name || '经典模式'}(${size}x${size})`
    });
    wx.setNavigationBarColor({
      backgroundColor: '#EEF0F4',
      frontColor: '#000000'
    });

    // 加载音效/震动设置
    const shultSettings = wx.getStorageSync('shult_settings') || {};
    this.setData({
      soundEnabled: shultSettings.sound !== false,
      vibrateEnabled: shultSettings.vibration !== false
    });

    this.generateBoard();
  },

  onUnload() {
    this.stopTimer();
    this.clearChallengeTimer();
    this.clearMemoryTimer();
  },

  generateBoard(callback) {
    const { mode, size, total } = this.data;
    let numbers = [];

    let newParityType = this.data.parityType;
    if (mode === 'alphabet') {
      // 字母模式：生成A开始的连续字母
      for (let i = 0; i < total; i++) {
        numbers.push(String.fromCharCode(65 + i)); // A=65, B=66, ...
      }
    } else if (mode === 'parity') {
      const isOdd = Math.random() < 0.5;
      newParityType = isOdd ? 'odd' : 'even';
      let start = isOdd ? 1 : 2;
      for (let i = 0; i < total; i++) {
        numbers.push(start + i * 2);
      }
    } else if (mode === 'reverse') {
      for (let i = total; i >= 1; i--) {
        numbers.push(i);
      }
    } else {
      for (let i = 1; i <= total; i++) {
        numbers.push(i);
      }
    }

    // 打乱
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const board = numbers.map((value, index) => ({
      value,
      index,
      done: false,
      hidden: false,
      marked: false,
      showValue: true,
      bgColor: mode === 'interference' ? COLORS[Math.floor(Math.random() * COLORS.length)] : ''
    }));

    const ruleHint = this.getRuleHint(mode, total, newParityType);
    this.setData({ board, parityType: newParityType, ruleHint });
    this.wrongValues.clear();
    this.doneValues.clear();
    this.firstTryCorrect.clear();
    if (callback) callback();
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
    const { mode, size } = this.data;
    this.startTime = Date.now();
    this.startTimer();

    if (mode === 'challenge') {
      this.startChallengeTimer();
    }

    if (mode === 'memory') {
      const memoryTime = MEMORY_TIMES[size] || 5;
      this.setData({
        isMemoryPhase: true,
        memoryTimeLeft: memoryTime,
        memoryTimeTotal: memoryTime,
        formattedTime: `${String(memoryTime).padStart(2, '0')}秒记忆时间`
      });
      this.startMemoryCountdown(memoryTime);
    }
  },

  startMemoryCountdown(seconds) {
    let left = seconds;
    const showAt = seconds > 20 ? seconds - 20 : 0;
    this.memoryTimer = setInterval(() => {
      left--;
      if (left > 0) {
        const updateData = {
          memoryTimeLeft: left,
          formattedTime: `${String(left).padStart(2, '0')}秒记忆时间`
        };
        if (showAt > 0 && left === showAt) {
          updateData.showMemorySkipBtn = true;
        }
        this.setData(updateData);
      } else {
        clearInterval(this.memoryTimer);
        this.setData({
          isMemoryPhase: false,
          memoryTimeLeft: 0,
          showMemorySkipBtn: false,
          board: this.data.board.map(cell => ({ ...cell, showValue: false })),
          formattedTime: '00:00.00'
        });
        this.startTime = Date.now();
      }
    }, 1000);
  },

  onSkipMemory() {
    clearInterval(this.memoryTimer);
    this.setData({
      isMemoryPhase: false,
      memoryTimeLeft: 0,
      showMemorySkipBtn: false,
      board: this.data.board.map(cell => ({ ...cell, showValue: false })),
      formattedTime: '00:00.00'
    });
    this.startTime = Date.now();
  },

  startTimer() {
    this.timer = setInterval(() => {
      if (this.data.isMemoryPhase) return;
      const elapsed = Date.now() - this.startTime;
      this.lastTimerElapsed = elapsed;
      this.setData({ formattedTime: this.formatTime(elapsed) });
    }, 50);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  startChallengeTimer() {
    this.clearChallengeTimer();
    this.challengeTimer = setTimeout(() => {
      this.gameOver(false);
    }, 2000);
  },

  clearChallengeTimer() {
    if (this.challengeTimer) {
      clearTimeout(this.challengeTimer);
      this.challengeTimer = null;
    }
  },

  clearMemoryTimer() {
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }
  },

  formatTime(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  },

  getRuleHint(mode, total, parityType) {
    const endLetter = String.fromCharCode(64 + total); // A=65, so 64+total
    const hints = {
      classic: `按顺序点击 1-${total} 的数字`,
      interference: `按顺序点击 1-${total} 的数字`,
      shuffle: `按顺序点击 1-${total} 的数字(每次点击正确后数字会重新排列)`,
      reverse: `按倒序点击 ${total}-1 的数字`,
      parity: `从小到大点击所有${parityType === 'odd' ? '奇' : '偶'}数`,
      challenge: `每步限时2秒，按顺序点击 1-${total}`,
      memory: `先记忆位置，再按顺序点击 1-${total}`,
      alphabet: `按顺序点击 A-${endLetter} 的字母`
    };
    return hints[mode] || '';
  },

  getExpectedValue() {
    const { mode, currentTarget, parityType, total } = this.data;
    if (mode === 'alphabet') {
      // 字母模式：A=1, B=2, C=3...
      return String.fromCharCode(64 + currentTarget);
    } else if (mode === 'parity') {
      return parityType === 'odd' ? 1 + (currentTarget - 1) * 2 : 2 + (currentTarget - 1) * 2;
    } else if (mode === 'reverse') {
      return total - currentTarget + 1;
    }
    return currentTarget;
  },

  updateHint() {
    if (this.data.showHint) {
      this.setData({ hintNumber: this.getExpectedValue() });
    }
  },

  onSizeTap(e) {
    const newSize = parseInt(e.currentTarget.dataset.size);
    if (newSize === this.data.size) return;

    this.stopTimer();
    this.clearChallengeTimer();
    this.clearMemoryTimer();

    const levelMap = { 3: 'base', 4: 'primary', 5: 'high', 6: 'super', 7: 'unique', 8: 'matchless', 9: 'sky', 10: 'crazy' };
    const levelNameMap = { 3: '基础', 4: '初阶', 5: '标准', 6: '中阶', 7: '高阶', 8: '极限', 9: '疯狂', 10: '宗师' };
    const total = newSize * newSize;

    this.wrongValues.clear();
    this.doneValues.clear();

    const isAlphabet = this.data.mode === 'alphabet';
    this.setData({
      size: newSize,
      level: levelMap[newSize],
      levelName: levelNameMap[newSize],
      total,
      currentTarget: 1,
      formattedTime: '00:00.00',
      showHint: true,
      toolHide: false,
      toolMark: false,
      hintNumber: isAlphabet ? 'A' : 1,
      cellFontSize: this.getCellFontSize(newSize)
    });

    wx.setNavigationBarTitle({
      title: `${MODES[this.data.mode]?.name || '经典模式'}(${newSize}x${newSize})`
    });
    this.generateBoard(() => {
      this.startAfterDelay();
    });
  },

  startAfterDelay() {
    if (this.data.mode === 'memory') {
      this.startGame();
      return;
    }
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
    const settings = wx.getStorageSync('shult_settings') || {};
    if (settings.vibration === false) return;
    try {
      wx.vibrateShort({ type: 'medium' });
    } catch (e) {
      try { wx.vibrateShort({ type: 'light' }); } catch (e2) {}
    }
  },

  playSound(type) {
    const settings = wx.getStorageSync('shult_settings') || {};
    if (settings.sound === false) return;
    try {
      if (!this._audioCtx) {
        this._audioCtx = wx.createWebAudioContext();
      }
      const audioCtx = this._audioCtx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
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

  onCellTap(e) {
    if (this.data.isMemoryPhase) return;
    const index = e.currentTarget.dataset.index;
    const cell = this.data.board[index];
    const mode = this.data.mode;
    const expected = this.getExpectedValue();

    if (cell.done === true && !(mode === 'shuffle' && cell.value === expected)) {
      if (mode !== 'challenge') this.wrongValues.add(expected);
      else this.wrongValues.add(cell.value);
      this.onWrongTap(index);
      return;
    }

    if (cell.value !== expected) {
      if (mode !== 'challenge') this.wrongValues.add(expected);
      else this.wrongValues.add(cell.value);
      this.onWrongTap(index);
      return;
    }

    this.playSound('correct');
    this.playVibration();
    this.doneValues.add(cell.value);
    // 首次按对才计入正确统计
    if (!this.wrongValues.has(expected)) {
      this.firstTryCorrect.add(expected);
    }
    this.doneCell(index, cell);
  },

  onWrongTap(index) {
    this.playSound('wrong');
    this.playVibration();
    this.setData({ [`board[${index}].flash`]: 'wrong' });
    setTimeout(() => this.setData({ [`board[${index}].flash`]: '' }), 300);
  },

  doneCell(index, cell) {
    const { mode, toolHide, toolMark, total } = this.data;
    const newTarget = this.data.currentTarget + 1;
    const updates = {
      [`board[${index}].done`]: true,
      currentTarget: newTarget
    };

    if (toolMark) {
      updates[`board[${index}].marked`] = true;
    } else if (toolHide) {
      updates[`board[${index}].hidden`] = true;
    } else {
      updates[`board[${index}].flash`] = 'correct';
      setTimeout(() => this.setData({ [`board[${index}].flash`]: '' }), 300);
    }

    if (mode === 'shuffle') {
      // 先把本次点击的数字加入 doneValues
      this.doneValues.add(cell.value);
      const vals = this.data.board.map(c => c.value);
      for (let i = vals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vals[i], vals[j]] = [vals[j], vals[i]];
      }
      // 换位后，done/marked/hidden 按数字值分配，而不是按位置
      updates.board = vals.map((v, i) => {
        const isDone = this.doneValues.has(v);
        return {
          ...this.data.board[i],
          value: v,
          done: isDone,
          marked: isDone && toolMark,
          hidden: isDone && toolHide,
          flash: ''
        };
      });
    }

    this.setData(updates);
    this.updateHint();
    if (mode === 'challenge') this.startChallengeTimer();

    if (newTarget > total) {
      this.fixedElapsed = this.lastTimerElapsed;
      this.stopTimer();
      this.clearChallengeTimer();
      this.setData({ hintNumber: '成功' });
      setTimeout(() => this.gameOver(true), 500);
    }
  },

  toggleHide() {
    const toolHide = !this.data.toolHide;
    const toolMark = toolHide ? false : this.data.toolMark;
    this.setData({ toolHide, toolMark });
    this.applyToolStates(toolHide, toolMark);
  },

  toggleMark() {
    const toolMark = !this.data.toolMark;
    const toolHide = toolMark ? false : this.data.toolHide;
    this.setData({ toolHide, toolMark });
    this.applyToolStates(toolHide, toolMark);
  },

  toggleHint() {
    const showHint = !this.data.showHint;
    this.setData({ showHint });
    if (showHint) {
      this.updateHint();
    }
  },

  applyToolStates(hide, mark) {
    const board = this.data.board.map(cell => {
      if (cell.done) {
        return { ...cell, hidden: hide, marked: mark };
      }
      return cell;
    });
    this.setData({ board });
  },

  /* ===== 设置弹窗 ===== */
  preventMove() {},
  onShowSettings() {
    const shultSettings = wx.getStorageSync('shult_settings') || {};
    this.setData({
      showSettings: true,
      soundEnabled: shultSettings.sound !== false,
      vibrateEnabled: shultSettings.vibration !== false
    });
  },
  onCloseSettings() {
    this.setData({ showSettings: false });
  },
  onSoundToggle(e) {
    const enabled = e.detail.value;
    const settings = wx.getStorageSync('shult_settings') || {};
    settings.sound = enabled;
    wx.setStorageSync('shult_settings', settings);
    this.setData({ soundEnabled: enabled });
    settingsSync.syncGlobalAfterToggle('sound', enabled);
  },
  onVibrateToggle(e) {
    const enabled = e.detail.value;
    const settings = wx.getStorageSync('shult_settings') || {};
    settings.vibration = enabled;
    wx.setStorageSync('shult_settings', settings);
    this.setData({ vibrateEnabled: enabled });
    settingsSync.syncGlobalAfterToggle('vibration', enabled);
  },

  /* ===== 参考等级弹窗 ===== */
  onShowReference() {
    const ref = this.selectComponent('#refSheet');
    if (ref) ref.show();
  },

  onRestart() {
    this.stopTimer();
    this.clearChallengeTimer();
    this.clearMemoryTimer();
    const { size, mode } = this.data;
    this.wrongValues.clear();
    this.doneValues.clear();
    this.setData({
      currentTarget: 1,
      formattedTime: '00:00.00',
      showHint: true,
      toolHide: false,
      toolMark: false,
      hintNumber: mode === 'alphabet' ? 'A' : 1,
      showStartOverlay: true,
      isMemoryPhase: false,
      memoryTimeLeft: 0,
      showMemorySkipBtn: false
    });
    this.generateBoard();
  },

  gameOver(success) {
    const elapsed = this.fixedElapsed !== null ? this.fixedElapsed : (Date.now() - this.startTime);
    this.fixedElapsed = null;
    const accuracy = Math.round(this.firstTryCorrect.size / this.data.total * 100);

    const record = {
      mode: this.data.mode,
      level: this.data.level,
      size: this.data.size,
      timeCost: elapsed,
      status: success ? 'success' : 'fail',
      accuracy
    };

    const now = new Date().toISOString();
    const createTime = now;

    // 未登录：保存到本地缓存
    if (!app.globalData.isLoggedIn) {
      const records = wx.getStorageSync('shult_records') || [];
      records.unshift({ ...record, createTime });
      wx.setStorageSync('shult_records', records.slice(0, 100));
    }

    // 已登录：保存到云端
    if (app.globalData.isLoggedIn) {
      wx.cloud.callFunction({
        name: 'saveTrainRecord',
        data: { ...record, createTime },
        complete() {
          // 不管云函数成功还是失败，都删除本地缓存
          wx.removeStorageSync('shult_records');
        }
      });
      if (success && !this.data.isPassMode) {
        wx.cloud.callFunction({
          name: 'unlockNewLevel',
          data: { level: this.data.level, size: this.data.size }
        });
      }
    }

    // 记录最大解锁规格
    const isNewMax = success && !this.data.isPassMode &&
      this.data.size > (wx.getStorageSync('shult_max_size') || 3);
    if (isNewMax) {
      wx.setStorageSync('shult_max_size', this.data.size);
    }

    const qs = `mode=${this.data.mode}&level=${this.data.level}&size=${this.data.size}&time=${elapsed}&accuracy=${accuracy}&status=${success ? 'success' : 'fail'}&pass=${this.data.isPassMode ? '1' : '0'}&passLevel=${this.data.passLevelNumber}`;
    wx.redirectTo({
      url: `/pages/result/result?${qs}`
    });
  }
});
