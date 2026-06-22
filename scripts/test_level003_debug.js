const BOARD_SIZE = 6;

function createBoardGrid(blocks) {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (const b of blocks) {
    for (let i = 0; i < b.size; i++) {
      const r = b.orient === 'v' ? b.row + i : b.row;
      const c = b.orient === 'h' ? b.col + i : b.col;
      board[r][c] = b.id;
    }
  }
  return board;
}

function printState(blocks, label) {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('.'));
  for (const b of blocks) {
    for (let i = 0; i < b.size; i++) {
      const r = b.orient === 'v' ? b.row + i : b.row;
      const c = b.orient === 'h' ? b.col + i : b.col;
      grid[r][c] = b.id;
    }
  }
  console.log(`\n${label}:`);
  for (let r = 0; r < BOARD_SIZE; r++) {
    console.log('  ' + r + ': ' + grid[r].join(' '));
  }
}

function generateAllMoves(blocks) {
  const board = createBoardGrid(blocks);
  const moves = [];
  for (const b of blocks) {
    if (b.orient === 'v') {
      let up = 0; while (b.row - up - 1 >= 0 && board[b.row - up - 1][b.col] === null) up++;
      if (up > 0) moves.push({ blockId: b.id, dir: 'up', steps: up });
      let down = 0; while (b.row + b.size + down < BOARD_SIZE && board[b.row + b.size + down][b.col] === null) down++;
      if (down > 0) moves.push({ blockId: b.id, dir: 'down', steps: down });
    } else {
      let left = 0; while (b.col - left - 1 >= 0 && board[b.row][b.col - left - 1] === null) left++;
      if (left > 0) moves.push({ blockId: b.id, dir: 'left', steps: left });
      let right = 0; while (b.col + b.size + right < BOARD_SIZE && board[b.row][b.col + b.size + right] === null) right++;
      if (right > 0) moves.push({ blockId: b.id, dir: 'right', steps: right });
    }
  }
  return moves;
}

function applyMove(blocks, move) {
  return blocks.map(b => {
    if (b.id !== move.blockId) return { ...b };
    const nb = { ...b };
    const s = move.steps;
    if (b.orient === 'v') nb.row += move.dir === 'up' ? -s : s;
    else nb.col += move.dir === 'left' ? -s : s;
    return nb;
  });
}

function serializeState(blocks) {
  return [...blocks].sort((a, b) => a.id.localeCompare(b.id)).map(b => `${b.id}:${b.row},${b.col}`).join('|');
}

function isWon(blocks) {
  const g = blocks.find(b => b.id === 'G');
  return g && g.row === 4 && g.col === 3;
}

function bfsSolve(blocks) {
  const startKey = serializeState(blocks);
  const visited = new Set([startKey]);
  const queue = [{ blocks: blocks.map(b => ({ ...b })), path: [] }];
  let head = 0;
  while (head < queue.length) {
    const { blocks: cur, path } = queue[head++];
    if (isWon(cur)) return path;
    for (const move of generateAllMoves(cur)) {
      const nb = applyMove(cur, move);
      const key = serializeState(nb);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ blocks: nb, path: [...path, move] });
      }
    }
  }
  return null;
}

function toBlocks(targetCoords, obstacleCoordsList) {
  const blocks = [];
  const tc = targetCoords.map(([r, c]) => [r - 1, c - 1]);
  blocks.push({
    id: 'G', type: 'target',
    orient: tc[1][0] > tc[0][0] ? 'v' : 'h',
    size: tc.length, row: tc[0][0], col: tc[0][1]
  });
  obstacleCoordsList.forEach((coords, i) => {
    const cells = coords.map(([r, c]) => [r - 1, c - 1]);
    const dr = cells[cells.length - 1][0] - cells[0][0];
    blocks.push({
      id: String.fromCharCode(65 + i),
      type: 'obstacle',
      orient: dr > 0 ? 'v' : 'h',
      size: cells.length, row: cells[0][0], col: cells[0][1]
    });
  });
  return blocks;
}

// ===== 用户坐标 =====
const target = [[1,4], [2,4]];
const blocks = toBlocks(target, [
  [[2,5], [2,6]],        // A: 横2
  [[3,2], [3,3], [3,4]], // B: 横3
  [[3,5], [4,5]],        // C: 竖2
  [[3,6], [4,6]],        // D: 竖2
  [[4,2], [4,3], [4,4]], // E: 横3
  [[5,3], [6,3]],        // F: 竖2
  [[5,4], [5,5], [5,6]], // H: 横3
  [[6,4], [6,5]],        // I: 横2
]);

console.log('=== 详细解路径验证 ===');
printState(blocks, '初始');

// 检查所有块的orient
console.log('\n各块方向:');
for (const b of blocks) {
  console.log(`  ${b.id}: orient=${b.orient}, row=${b.row}, col=${b.col}, size=${b.size}`);
}

// 检查可从初始状态生成的所有移动
console.log('\n初始状态所有移动:');
const initialMoves = generateAllMoves(blocks);
for (const m of initialMoves) {
  const b = blocks.find(x => x.id === m.blockId);
  console.log(`  ${m.blockId} (${b.orient}) ${m.dir} ${m.steps}格`);
}

// 打印初始棋盘
const grid = createBoardGrid(blocks);
console.log('\n棋盘 (检查H是否在(4,3)):');
for (let r = 0; r < BOARD_SIZE; r++) {
  console.log(`  ${r}: [${grid[r].join('][')}]`);
}

// 直接检查H是否可以移动
const hBlock = blocks.find(b => b.id === 'H');
console.log(`\nH块: orient=${hBlock.orient}, row=${hBlock.row}, col=${hBlock.col}, size=${hBlock.size}`);
const hMoves = generateAllMoves(blocks).filter(m => m.blockId === 'H');
console.log(`H可移动: ${hMoves.length > 0 ? JSON.stringify(hMoves) : '无 - 被卡死'}`);

// 检查G是否可以获胜
console.log(`\nG初始位置: (${blocks.find(b=>b.id==='G').row}, ${blocks.find(b=>b.id==='G').col})`);
console.log(`获胜条件: G.row === 4 && G.col === 3`);
console.log(`H阻挡检查: H at (${hBlock.row},${hBlock.col}), H占据col ${hBlock.col}到${hBlock.col + hBlock.size - 1}`);
console.log(`G需要(4,3) → ${hBlock.row === 4 && hBlock.col === 3 ? '❌ H直接阻挡!' : '可能可行'}`);

// 执行BFS并显示完整解验证
console.log('\n\nBFS求解...');
const solution = bfsSolve(blocks);
if (solution) {
  console.log(`找到解: ${solution.length}步`);
  let curBlocks = blocks.map(b => ({...b}));
  printState(curBlocks, '初始状态');

  solution.forEach((move, i) => {
    const dirMap = { up: '↑', down: '↓', left: '←', right: '→' };
    const b = curBlocks.find(x => x.id === move.blockId);
    console.log(`\n第${i+1}步: ${move.blockId} (orient=${b.orient}) ${dirMap[move.dir]}${move.steps}格`);
    curBlocks = applyMove(curBlocks, move);
    printState(curBlocks, `状态 ${i+1}`);
    const won = isWon(curBlocks);
    console.log(`  获胜? ${won} (G at (${curBlocks.find(x=>x.id==='G').row},${curBlocks.find(x=>x.id==='G').col}))`);
  });
} else {
  console.log('❌ 无解！');
  console.log('\n分析: H(横3)在(5,4)(5,5)(5,6)阻挡出口(5,4)');
  console.log('H无法左移(F在(5,3)阻挡)也无法右移(边界)');
  console.log('F无法上移(E在(4,2-4)阻挡)');
  console.log('结论: 此关卡无解，需修改坐标');
}
