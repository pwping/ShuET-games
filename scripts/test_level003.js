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

function printGrid(blocks) {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('.'));
  const labels = {};
  for (const b of blocks) {
    for (let i = 0; i < b.size; i++) {
      const r = b.orient === 'v' ? b.row + i : b.row;
      const c = b.orient === 'h' ? b.col + i : b.col;
      grid[r][c] = b.id;
    }
  }
  console.log('\n  棋盘 (0-indexed):');
  console.log('  col: 0 1 2 3 4 5');
  for (let r = 0; r < BOARD_SIZE; r++) {
    let row = `  ${r}:  `;
    for (let c = 0; c < BOARD_SIZE; c++) {
      row += grid[r][c] ? grid[r][c] : '.';
      row += ' ';
    }
    if (r === 4) row += ' ← ★ 出口行';
    console.log(row);
  }
}

// ===== 用户坐标 =====
// 14 24        → 目标G (竖2)
// 25 26        → A (横2)
// 32 33 34     → B (横3)
// 35 45        → C (竖2)
// 36 46        → D (竖2)
// 42 43 44     → E (横3)
// 53 63        → F (竖2)
// 54 55 56     → H (横3)
// 64 65        → I (横2)

const target = [[1,4], [2,4]]; // G

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

console.log('=== 新关卡测试 (15步) ===\n');
console.log('坐标数据 (1-indexed):');
console.log('  目标G: (1,4)(2,4)');
console.log('  A(横2): (2,5)(2,6)');
console.log('  B(横3): (3,2)(3,3)(3,4)');
console.log('  C(竖2): (3,5)(4,5)');
console.log('  D(竖2): (3,6)(4,6)');
console.log('  E(横3): (4,2)(4,3)(4,4)');
console.log('  F(竖2): (5,3)(6,3)');
console.log('  H(横3): (5,4)(5,5)(5,6)');
console.log('  I(横2): (6,4)(6,5)');

printGrid(blocks);

// 检查冲突
const gridCheck = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
let conflicts = false;
for (const b of blocks) {
  for (let i = 0; i < b.size; i++) {
    const r = b.orient === 'v' ? b.row + i : b.row;
    const c = b.orient === 'h' ? b.col + i : b.col;
    if (gridCheck[r][c] !== null) {
      console.log(`\n❌ 冲突: ${gridCheck[r][c]} 和 ${b.id} 都在 (${r},${c})`);
      conflicts = true;
    }
    gridCheck[r][c] = b.id;
  }
}
if (!conflicts) console.log('\n✅ 无坐标冲突');

console.log('\n求解中...');
const solution = bfsSolve(blocks);
if (solution) {
  console.log(`✅ 有解！BFS最少步数: ${solution.length}`);
  solution.forEach((move, i) => {
    const dirMap = { up: '↑上', down: '↓下', left: '←左', right: '→右' };
    console.log(`  ${i+1}. ${move.blockId} ${dirMap[move.dir]}${move.steps}格`);
  });
} else {
  console.log('❌ 无解！');
}
