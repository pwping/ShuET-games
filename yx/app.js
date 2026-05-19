/**
 * 舒尔特专注力训练小程序 - 可交互原型
 * 模拟微信小程序 + CloudBase 云开发
 */

// ===== 配置数据 =====
const MODES = [
    { key: 'classic', name: '经典模式', desc: '数字正序依次点击', icon: '🔢' },
    { key: 'interfere', name: '干扰模式', desc: '彩色背景抗干扰', icon: '🎨' },
    { key: 'swap', name: '换位模式', desc: '正确后全局重排', icon: '🔄' },
    { key: 'reverse', name: '倒序模式', desc: '从大到小倒序点击', icon: '🔁' },
    { key: 'parity', name: '奇偶模式', desc: '先奇数后偶数', icon: '⚡' },
    { key: 'challenge', name: '挑战模式', desc: '每步限时2秒', icon: '⏱️' },
    { key: 'memory', name: '记忆模式', desc: '记忆后隐藏数字', icon: '🧠' }
];

const LEVELS = [
    { key: 'base', name: '基础', size: 3, desc: '入门练习' },
    { key: 'primary', name: '初阶', size: 4, desc: '简单挑战' },
    { key: 'high', name: '高阶', size: 5, desc: '标准训练' },
    { key: 'super', name: '超凡', size: 6, desc: '进阶提升' },
    { key: 'unique', name: '绝世', size: 7, desc: '高手进阶' },
    { key: 'matchless', name: '无双', size: 8, desc: '极限挑战' },
    { key: 'sky', name: '九天', size: 9, desc: '超凡入圣' },
    { key: 'crazy', name: '疯狂', size: 10, desc: '终极试炼' }
];

// ===== 状态管理 =====
const state = {
    currentPage: 'home',
    selectedMode: null,
    selectedLevel: null,
    game: {
        board: [],
        currentTarget: 1,
        timer: null,
        startTime: null,
        elapsed: 0,
        isRunning: false,
        isMemoryPhase: false,
        challengeTimer: null,
        parityPhase: 'odd', // 'odd' | 'even'
        wrongValues: new Set() // 记录点错过的不重复数字
    },
    user: {
        openid: 'mock_openid_001',
        nickName: '训练者',
        avatarUrl: ''
    },
    progress: {
        maxSize: 5, // 默认解锁到5x5
        currentLevel: 'high'
    },
    records: [
        { mode: 'classic', level: 'base', size: 3, timeCost: 5234, status: 'success', createTime: '2026-04-28 14:30' },
        { mode: 'classic', level: 'primary', size: 4, timeCost: 8932, status: 'success', createTime: '2026-04-28 14:35' },
        { mode: 'challenge', level: 'base', size: 3, timeCost: 2100, status: 'fail', createTime: '2026-04-28 15:00' }
    ],
    settings: {
        sound: true,
        vibrate: false
    },
    // 闯关模式状态
    pass: {
        isActive: false,
        stages: [5, 6, 7, 8, 9, 10], // 每阶方格尺寸
        currentStageIndex: 0,         // 当前阶段索引
        currentRound: 1,              // 当前阶段内第几局（1-10）
        totalRoundsPerStage: 10,      // 每阶段局数
        completedRounds: 0,           // 总已完成局数
        currentLevelNumber: 1         // 当前显示的第几关（累加）
    }
};

// ===== DOM 元素缓存 =====
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== 页面路由 =====
function navigateTo(pageId, options = {}) {
    // 隐藏所有页面
    $$('.page').forEach(p => p.classList.remove('active'));
    
    // 显示目标页面
    const target = $(`page-${pageId}`);
    if (target) {
        target.classList.add('active');
    }
    
    // 更新底部导航
    $$('.tab-item').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.page === pageId);
    });
    
    state.currentPage = pageId;
    
    // 页面特定初始化
    if (pageId === 'level' && options.mode) {
        initLevelPage(options.mode);
    } else if (pageId === 'pass') {
        initPassPage();
    } else if (pageId === 'profile') {
        initProfilePage();
    } else if (pageId === 'history') {
        initHistoryPage();
    } else if (pageId === 'game' && options.mode && options.level) {
        initGamePage(options.mode, options.level, options);
    } else if (pageId === 'result' && options.result) {
        initResultPage(options.result);
    }
    
    // 滚动到顶部
    $('page-container').scrollTop = 0;
}

// ===== 首页初始化 =====
function initHomePage() {
    // 模式卡片点击
    $$('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            navigateTo('level', { mode });
        });
    });
}

// ===== 难度选择页 =====
function initLevelPage(modeKey) {
    const mode = MODES.find(m => m.key === modeKey);
    state.selectedMode = mode;
    
    $('level-mode-name').textContent = mode.name;
    
    const listEl = $('level-list');
    listEl.innerHTML = '';
    
    LEVELS.forEach((level, index) => {
        const isSelected = state.selectedLevel?.key === level.key;
        
        const item = document.createElement('div');
        item.className = `level-item ${isSelected ? 'selected' : ''}`;
        item.innerHTML = `
            <div class="level-size">${level.size}×${level.size}</div>
            <div class="level-info">
                <div class="level-name">${level.name}</div>
                <div class="level-desc">${level.desc}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            // 移除其他选中
            $$('.level-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            state.selectedLevel = level;
            
            // 直接跳转到游戏页
            navigateTo('game', { 
                mode: state.selectedMode.key, 
                level: level.key 
            });
        });
        
        listEl.appendChild(item);
    });
    
    // 返回按钮
    $('level-back').onclick = () => navigateTo('home');
}

// ===== 游戏训练页 =====
function initGamePage(modeKey, levelKey, options = {}) {
    const mode = MODES.find(m => m.key === modeKey);
    const level = LEVELS.find(l => l.key === levelKey);

    // 闯关模式显示特殊标题
    if (state.game.isPassMode) {
        const pass = state.pass;
        const stageSize = pass.stages[pass.currentStageIndex];
        $('game-mode-name').textContent = `闯关模式 · ${stageSize}×${stageSize}`;
        $('game-level-name').textContent = `第 ${pass.currentRound} / ${pass.totalRoundsPerStage} 局`;
    } else {
        $('game-mode-name').textContent = mode.name;
        $('game-level-name').textContent = `${level.name} ${level.size}×${level.size}`;
    }

    // 重置游戏状态
    resetGameState();
    state.game.mode = mode;
    state.game.level = level;

    // 重置工具开关
    $('tool-hide').checked = false;
    $('tool-mark').checked = false;
    if ($('tool-hint')) $('tool-hint').checked = true;
    unlockToolSwitches();

    // 生成棋盘
    generateBoard(level.size, modeKey);

    // 记忆模式隐藏工具开关
    const toolsEl = $('.game-tools');
    if (toolsEl) {
        toolsEl.style.display = modeKey === 'memory' ? 'none' : 'flex';
    }

    // 记忆模式特殊处理
    if (modeKey === 'memory') {
        showStartOverlay(modeKey, level.size, true);
    } else if (options.skipOverlay) {
        // 跳过遮罩直接开始
        startGameTimer();
    } else {
        // 显示开始遮罩（含工具开关和开始按钮）
        showStartOverlay(modeKey, level.size);
    }

    // 按钮事件
    $('game-back').onclick = () => {
        stopGameTimer();
        if (state.game.isPassMode) {
            // 闯关模式中途退出
            state.pass.isActive = false;
            state.game.isPassMode = false;
            navigateTo('pass');
        } else {
            navigateTo('level', { mode: modeKey });
        }
    };

    $('btn-restart').onclick = () => {
        stopGameTimer();
        resetGameState();
        generateBoard(level.size, modeKey);
        if (modeKey === 'memory') {
            // 记忆模式：直接隐藏数字并开始
            $$('.game-cell').forEach(cell => {
                cell.textContent = '';
            });
            startGameTimer();
        } else {
            showCountdownOverlay(() => {
                startGameTimer();
            });
        }
    };

    // 工具开关互斥逻辑
    $('tool-hide').onchange = (e) => {
        if (e.target.checked) {
            $('tool-mark').checked = false;
        }
        // 对已完成的方格应用/取消隐藏
        $$('.game-cell.done').forEach(cell => {
            cell.classList.toggle('hidden', e.target.checked);
        });
    };
    $('tool-mark').onchange = (e) => {
        if (e.target.checked) {
            $('tool-hide').checked = false;
        }
        // 对已完成的方格应用/取消标记
        $$('.game-cell.done').forEach(cell => {
            cell.classList.toggle('marked', e.target.checked);
        });
    };

    // 提示开关
    const hintEl = $('game-hint');
    const hintInput = $('tool-hint');
    if (hintEl && hintInput) {
        hintEl.classList.toggle('hidden', !hintInput.checked);
        hintInput.onchange = (e) => {
            hintEl.classList.toggle('hidden', !e.target.checked);
        };
    }
}

function showStartOverlay(modeKey, size, isMemory = false) {
    const overlay = $('start-overlay');
    const stageEl = $('start-stage');

    // 闯关模式显示关卡
    if (state.game.isPassMode) {
        const pass = state.pass;
        stageEl.textContent = `第 ${pass.currentLevelNumber} 关`;
    } else {
        stageEl.textContent = '';
    }

    overlay.style.display = 'flex';

    // 开始按钮
    $('btn-start-game').onclick = () => {
        overlay.style.display = 'none';
        if (isMemory) {
            // 记忆模式：直接隐藏数字，开始游戏
            $$('.game-cell').forEach(cell => {
                cell.textContent = '';
            });
            startGameTimer();
        } else {
            showCountdownOverlay(() => {
                startGameTimer();
            });
        }
    };
}

function showCountdownOverlay(onComplete) {
    const overlay = $('countdown-overlay');
    const numberEl = $('countdown-number');
    const stageEl = $('countdown-stage');
    overlay.style.display = 'flex';
    
    // 闯关模式显示关卡信息
    if (state.game.isPassMode) {
        const pass = state.pass;
        stageEl.textContent = `第 ${pass.currentLevelNumber} 关`;
        stageEl.style.display = 'block';
    } else {
        stageEl.style.display = 'none';
    }
    
    let count = 3;
    numberEl.textContent = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numberEl.textContent = count;
            // 重新触发动画
            numberEl.style.animation = 'none';
            numberEl.offsetHeight; // 强制重排
            numberEl.style.animation = 'countdownPulse 0.8s ease';
        } else {
            clearInterval(interval);
            overlay.style.display = 'none';
            if (onComplete) onComplete();
        }
    }, 1000);
}

function resetGameState() {
    clearInterval(state.game.timer);
    clearTimeout(state.game.challengeTimer);
    state.game.currentTarget = 1;
    state.game.startTime = null;
    state.game.elapsed = 0;
    state.game.isRunning = false;
    state.game.isMemoryPhase = false;
    state.game.parityPhase = 'odd';
    state.game.wrongValues = new Set();
    $('game-timer').textContent = '00:00.000';
    $('memory-overlay').style.display = 'none';
    $('hint-number').textContent = '1';
    unlockToolSwitches();
}

function lockToolSwitches() {
    $$('.tool-switch').forEach(sw => sw.classList.add('disabled'));
}

function unlockToolSwitches() {
    $$('.tool-switch').forEach(sw => sw.classList.remove('disabled'));
}

function generateBoard(size, modeKey) {
    const board = $('game-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    let numbers;
    const total = size * size;
    if (modeKey === 'parity') {
        // 奇偶模式：随机决定奇数或偶数，生成 total 个连续数字
        const isOdd = Math.random() < 0.5;
        state.game.parityPhase = isOdd ? 'odd' : 'even';
        numbers = [];
        let start = isOdd ? 1 : 2;
        for (let i = 0; i < total; i++) {
            numbers.push(start + i * 2);
        }
    } else {
        // 生成数字 1 到 size*size
        numbers = Array.from({ length: total }, (_, i) => i + 1);
    }
    shuffleArray(numbers);

    state.game.board = numbers;
    state.game.size = size;

    numbers.forEach((num, index) => {
        const cell = document.createElement('div');
        cell.className = 'game-cell';
        cell.textContent = num;
        cell.dataset.value = num;
        cell.dataset.index = index;

        // 干扰模式：随机背景色
        if (modeKey === 'interfere') {
            const colors = ['#ffebee', '#e3f2fd', '#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa'];
            cell.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        }

        cell.addEventListener('click', () => {
            const currentValue = parseInt(cell.dataset.value);
            handleCellClick(cell, currentValue, modeKey);
        });
        board.appendChild(cell);
    });
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function startMemoryPhase(size) {
    // 记忆模式已改为使用统一的开始遮盖层逻辑
    // 保留此函数仅作兼容，不再使用
}

function startGameTimer() {
    state.game.isRunning = true;
    state.game.startTime = Date.now();
    updateHint(state.game.mode.key);

    state.game.timer = setInterval(() => {
        if (!state.game.isRunning) return;
        state.game.elapsed = Date.now() - state.game.startTime;
        $('game-timer').textContent = formatTime(state.game.elapsed);
    }, 50);
}

function stopGameTimer() {
    state.game.isRunning = false;
    clearInterval(state.game.timer);
    clearTimeout(state.game.challengeTimer);
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = ms % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function getExpectedValue(modeKey, target) {
    const { size } = state.game;
    const total = size * size;
    let expected = target;
    switch (modeKey) {
        case 'reverse':
            expected = total - target + 1;
            break;
        case 'parity':
            if (state.game.parityPhase === 'odd') {
                expected = 1 + (target - 1) * 2;
            } else {
                expected = 2 + (target - 1) * 2;
            }
            break;
        default:
            expected = target;
    }
    return expected;
}

function updateHint(modeKey) {
    const { size, currentTarget } = state.game;
    const total = size * size;

    const completed = currentTarget > total;

    if (completed) return;

    const nextExpected = getExpectedValue(modeKey, currentTarget);
    $('hint-number').textContent = nextExpected;
}

function handleCellClick(cell, value, modeKey) {
    if (!state.game.isRunning || state.game.isMemoryPhase) return;
    
    const { size, currentTarget } = state.game;
    const total = size * size;
    
    const expected = getExpectedValue(modeKey, currentTarget);
    
    if (value !== expected) {
        // 错误点击：记录不重复的错误值
        state.game.wrongValues.add(value);
        return;
    }
    
    // 正确点击
    const isHideEnabled = $('tool-hide')?.checked;
    const isMarkEnabled = $('tool-mark')?.checked;

    // 首次正确点击后，如果开关已打开则锁定工具开关
    if (state.game.currentTarget === 1 && (isHideEnabled || isMarkEnabled)) {
        lockToolSwitches();
    }

    if (isHideEnabled) {
        cell.classList.add('hidden', 'done');
    } else if (isMarkEnabled) {
        cell.classList.add('marked');
        // 记忆模式下标记时显示数字
        if (modeKey === 'memory') {
            cell.textContent = value;
        }
    } else {
        cell.classList.add('done');
    }

    // 换位模式：重新洗牌（独立逻辑）
    if (modeKey === 'swap') {
        setTimeout(() => {
            const allCells = Array.from($$('.game-cell'));
            // 记录当前已隐藏和已标记的数值
            const hiddenValues = new Set();
            const markedValues = new Set();
            allCells.forEach(c => {
                const val = parseInt(c.dataset.value);
                if (c.classList.contains('hidden')) {
                    hiddenValues.add(val);
                }
                if (c.classList.contains('marked')) {
                    markedValues.add(val);
                }
            });

            const allValues = allCells.map(c => parseInt(c.dataset.value));
            shuffleArray(allValues);

            allCells.forEach((c, i) => {
                c.textContent = allValues[i];
                c.dataset.value = allValues[i];
                // 清除样式
                c.classList.remove('done', 'marked', 'hidden');
                // 根据数值恢复对应样式
                if (hiddenValues.has(allValues[i])) {
                    c.classList.add('hidden');
                } else if (markedValues.has(allValues[i])) {
                    c.classList.add('marked');
                }
            });
        }, 150);
    }

    // 奇偶模式：无需切换，所有数字都是同一类型
    state.game.currentTarget++;

    // 更新提示
    updateHint(modeKey);

    // 检查完成（用更新后的 currentTarget）
    const completed = state.game.currentTarget > total;

    if (completed) {
        stopGameTimer();
        
        // 保存记录
        const wrongCount = state.game.wrongValues.size;
        const accuracy = Math.round((total - wrongCount) / total * 100);
        const result = {
            mode: modeKey,
            level: state.game.level.key,
            size: size,
            timeCost: state.game.elapsed,
            status: 'success',
            accuracy,
            createTime: new Date().toLocaleString('zh-CN')
        };
        state.records.unshift(result);
        
        // 闯关模式特殊处理
        if (state.game.isPassMode) {
            setTimeout(() => {
                onPassGameComplete(result);
            }, 300);
            return;
        }
        
        setTimeout(() => {
            navigateTo('result', { result });
        }, 300);
        return;
    }
    
    // 挑战模式：2秒限时
    if (modeKey === 'challenge') {
        clearTimeout(state.game.challengeTimer);
        state.game.challengeTimer = setTimeout(() => {
            stopGameTimer();
            const wrongCount = state.game.wrongValues.size;
            const accuracy = Math.round((total - wrongCount) / total * 100);
            const result = {
                mode: modeKey,
                level: state.game.level.key,
                size: size,
                timeCost: state.game.elapsed,
                status: 'fail',
                accuracy,
                createTime: new Date().toLocaleString('zh-CN')
            };
            state.records.unshift(result);
            navigateTo('result', { result });
        }, 2000);
    }
}

// ===== 闯关页 =====
function initPassPage() {
    const pass = state.pass;
    const isRunning = pass.isActive;
    
    // 显示/隐藏元素
    $('pass-intro').style.display = isRunning ? 'none' : 'block';
    $('pass-progress').style.display = isRunning ? 'block' : 'none';
    $('pass-levels').style.display = 'none';
    
    if (!isRunning) {
        // 未开始：显示开始按钮
        $('btn-pass-start').onclick = () => {
            startPassMode();
        };
    } else {
        // 进行中：更新进度
        updatePassProgress();
    }
}

function startPassMode() {
    const pass = state.pass;
    pass.isActive = true;
    pass.currentStageIndex = 0;
    pass.currentRound = 1;
    pass.completedRounds = 0;
    pass.currentLevelNumber = 1;
    
    // 直接进入第一局
    startPassGame();
}

function startPassGame() {
    const pass = state.pass;
    const size = pass.stages[pass.currentStageIndex];
    const level = LEVELS.find(l => l.size === size);
    
    if (!level) return;
    
    // 标记为闯关模式
    state.game.isPassMode = true;
    
    navigateTo('game', { mode: 'classic', level: level.key });
}

function updatePassProgress() {
    const pass = state.pass;
    const size = pass.stages[pass.currentStageIndex];
    const totalStages = pass.stages.length;
    const totalRounds = totalStages * pass.totalRoundsPerStage;
    
    // 阶段进度
    $('pass-stage-info').textContent = `当前阶段：${size}×${size}（第 ${pass.currentRound} / ${pass.totalRoundsPerStage} 局）`;
    const stagePercent = (pass.currentRound - 1) / pass.totalRoundsPerStage * 100;
    $('pass-stage-fill').style.width = `${stagePercent}%`;
    
    // 总进度
    $('pass-overall-info').textContent = `总进度：${pass.completedRounds} / ${totalRounds} 局`;
    const overallPercent = pass.completedRounds / totalRounds * 100;
    $('pass-overall-fill').style.width = `${overallPercent}%`;
}

function onPassGameComplete(result) {
    const pass = state.pass;
    
    if (result.status !== 'success') {
        // 失败：闯关结束，显示失败结果
        state.pass.isActive = false;
        state.game.isPassMode = false;
        result.isPassFail = true;
        navigateTo('result', { result });
        return;
    }
    
    // 成功：记录进度
    pass.completedRounds++;
    pass.currentLevelNumber++;
    
    // 检查是否完成当前阶段
    if (pass.currentRound >= pass.totalRoundsPerStage) {
        // 阶段完成，进入下一阶段
        pass.currentStageIndex++;
        pass.currentRound = 1;
        
        // 检查是否全部完成
        if (pass.currentStageIndex >= pass.stages.length) {
            // 闯关全部成功
            state.pass.isActive = false;
            state.game.isPassMode = false;
            result.isPassComplete = true;
            navigateTo('result', { result });
            return;
        }
    } else {
        // 继续当前阶段下一局
        pass.currentRound++;
    }
    
    // 继续下一局
    setTimeout(() => {
        startPassGame();
    }, 500);
}

// ===== 结果页 =====
function initResultPage(result) {
    const mode = MODES.find(m => m.key === result.mode);
    const level = LEVELS.find(l => l.key === result.level);
    const isSuccess = result.status === 'success';
    
    // 重置样式
    $('result-face').classList.remove('fail');
    $('result-title').classList.remove('fail');
    $('result-badge').classList.remove('fail');
    
    // 闯关模式特殊显示
    if (result.isPassComplete) {
        $('result-face').textContent = '🎉';
        $('result-title').textContent = '恭喜通关！';
        $('result-subtitle').textContent = '全部闯关挑战完成！';
        $('result-badge').textContent = '闯关模式 · 全部完成';
        $('result-time').textContent = formatTime(result.timeCost);
        $('result-time').classList.remove('fail');
        $('result-accuracy').textContent = '100%';
        $('result-accuracy').classList.remove('fail');
    } else if (result.isPassFail) {
        $('result-face').textContent = '😵';
        $('result-face').classList.add('fail');
        $('result-title').textContent = '闯关失败';
        $('result-title').classList.add('fail');
        $('result-subtitle').textContent = '不要气馁，再试一次！';
        $('result-badge').textContent = `闯关模式 · ${level.name}`;
        $('result-badge').classList.add('fail');
        $('result-time').textContent = formatTime(result.timeCost);
        $('result-time').classList.add('fail');
        $('result-accuracy').textContent = '--';
        $('result-accuracy').classList.add('fail');
    } else {
        // 普通训练模式
        if (isSuccess) {
            $('result-face').textContent = '😊';
            $('result-title').textContent = '顺利通关';
            $('result-subtitle').textContent = getEncourageText(result.timeCost);
            $('result-badge').textContent = `${mode.name} · ${level.name}`;
            $('result-time').textContent = formatTime(result.timeCost);
            $('result-time').classList.remove('fail');
            $('result-accuracy').textContent = `${result.accuracy ?? 100}%`;
            $('result-accuracy').classList.remove('fail');
        } else {
            $('result-face').textContent = '😵';
            $('result-face').classList.add('fail');
            $('result-title').textContent = '挑战失败';
            $('result-title').classList.add('fail');
            $('result-subtitle').textContent = '不要气馁，再试一次！';
            $('result-badge').textContent = `${mode.name} · ${level.name}`;
            $('result-badge').classList.add('fail');
            $('result-time').textContent = formatTime(result.timeCost);
            $('result-time').classList.add('fail');
            $('result-accuracy').textContent = `${result.accuracy ?? 0}%`;
            $('result-accuracy').classList.add('fail');
        }
    }
    
    // 历史记录预览
    $('result-history-time').textContent = '刚刚';
    $('result-history-duration').textContent = formatTime(result.timeCost);
    
    // 闯关成功解锁下一关（普通模式）
    if (!result.isPassComplete && !result.isPassFail && isSuccess && result.mode === 'classic' && level.size >= state.progress.maxSize) {
        const nextLevel = LEVELS.find(l => l.size === level.size + 1);
        if (nextLevel) {
            state.progress.maxSize = nextLevel.size;
            state.progress.currentLevel = nextLevel.key;
        }
    }
    
    $('btn-again').onclick = () => {
        if (result.isPassComplete || result.isPassFail) {
            startPassMode();
        } else {
            navigateTo('game', { mode: result.mode, level: result.level, skipOverlay: true });
        }
    };
    
    $('btn-select-level').onclick = () => {
        if (result.isPassComplete || result.isPassFail) {
            navigateTo('pass');
        } else {
            navigateTo('level', { mode: result.mode });
        }
    };
}

function getEncourageText(timeMs) {
    if (timeMs < 5000) return '令人惊叹的速度！';
    if (timeMs < 10000) return '表现不错，继续保持！';
    if (timeMs < 20000) return '稳扎稳打，下次更快！';
    return '坚持就是胜利，继续加油！';
}

// ===== 个人中心 =====
function initProfilePage() {
    $('user-nickname').textContent = state.user.nickName;
    
    // 统计
    const total = state.records.length;
    const successRecords = state.records.filter(r => r.status === 'success');
    const best = successRecords.length > 0 
        ? Math.min(...successRecords.map(r => r.timeCost))
        : null;
    
    $('stat-total').textContent = total;
    $('stat-best').textContent = best ? formatTime(best) : '--';
    
    const currentLevel = LEVELS.find(l => l.key === state.progress.currentLevel);
    $('stat-level').textContent = currentLevel ? currentLevel.name : '基础';
    
    // 菜单
    $('menu-history').onclick = () => navigateTo('history');
    $('menu-settings').onclick = () => navigateTo('settings');
}

// ===== 历史记录 =====
function initHistoryPage() {
    const list = $('history-list');
    list.innerHTML = '';
    
    if (state.records.length === 0) {
        list.innerHTML = '<div class="empty-state">暂无训练记录</div>';
        return;
    }
    
    state.records.forEach(record => {
        const mode = MODES.find(m => m.key === record.mode);
        const level = LEVELS.find(l => l.key === record.level);
        
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="history-mode">${mode?.name || record.mode} · ${level?.name || record.level}</div>
                <div class="history-detail">${record.createTime}</div>
            </div>
            <div class="history-time">${formatTime(record.timeCost)}</div>
            <div class="history-status ${record.status}">${record.status === 'success' ? '成功' : '失败'}</div>
        `;
        list.appendChild(item);
    });
    
    $('history-back').onclick = () => navigateTo('profile');
}

// ===== 设置页 =====
function initSettingsPage() {
    $('setting-sound').checked = state.settings.sound;
    $('setting-vibrate').checked = state.settings.vibrate;
    
    $('setting-sound').onchange = (e) => {
        state.settings.sound = e.target.checked;
    };
    
    $('setting-vibrate').onchange = (e) => {
        state.settings.vibrate = e.target.checked;
    };
    
    $('btn-clear').onclick = () => {
        if (confirm('确定要清除所有本地数据吗？')) {
            state.records = [];
            state.progress = { maxSize: 3, currentLevel: 'base' };
            alert('数据已清除');
            navigateTo('profile');
        }
    };
    
    $('settings-back').onclick = () => navigateTo('profile');
}

// ===== 底部导航 =====
function initTabBar() {
    $$('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            if (page === 'home') navigateTo('home');
            else if (page === 'pass') navigateTo('pass');
            else if (page === 'profile') navigateTo('profile');
        });
    });
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
    initTabBar();
    initSettingsPage();
    
    // 默认显示首页
    navigateTo('home');
});
