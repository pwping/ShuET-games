var rating = require('../../../utils/sudoku-rating');

Page({
  data: {
    diff: '', diffLabel: '', time: 0,
    timerText: '00:00', correct: 0, errors: 0, hints: 0, undo: 0,
    stars: 0, starLevel: '', quote: '', totalScore: 0
  },

  onLoad: function(options) {
    var diff = options.diff || 'beginner';
    var time = parseInt(options.time) || 0;
    var correct = parseInt(options.correct) || 0;
    var errors = parseInt(options.errors) || 0;
    var hintsUsed = parseInt(options.hints) || 0;
    var undoCount = parseInt(options.undo) || 0;

    var m = Math.floor(time / 60);
    var s = time % 60;
    var timerText = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;

    var result = rating.calcRating(diff, time, errors, hintsUsed, undoCount);
    var quote = rating.randomQuote(result.starLevel);

    this.setData({
      diff: diff,
      diffLabel: rating.DIFF_LABELS[diff] || diff,
      time: time,
      timerText: timerText,
      correct: correct,
      errors: errors,
      hints: hintsUsed,
      undo: undoCount,
      stars: result.stars,
      starLevel: result.starLevel,
      quote: quote,
      totalScore: result.total
    });
  },

  onRetry: function() {
    wx.redirectTo({ url: '/pages/sudoku/game/game?diff=' + this.data.diff });
  },

  onChangeLevel: function() {
    wx.navigateTo({ url: '/pages/sudoku/level/level' });
  },

  onHistory: function() {
    wx.navigateTo({ url: '/pages/history/history?tab=sudoku' });
  },

  onShareAppMessage: function() {
    return {
      title: '数独 ' + this.data.diffLabel + ' ' + this.data.timerText + ' 通关！',
      path: '/pages/sudoku/level/level'
    };
  }
});
