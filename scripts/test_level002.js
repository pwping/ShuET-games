/**
 * 测试关卡002是否有解，最少步数是否为3
 * 坐标格式: [行, 列]，1-indexed
 */

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
  for (const b of blocks) {
    for (let i = 0; i < b.size; i++) {
      const r = b.orient === 'v' ? b.row + i : b.row;
      const c = b.orient === 'h' ? b.col + i : b.col;
      grid[r][c] = b.id;
    }
  }
  console.log('\n棋盘 (0-indexed, ★=出口):');
  const exitRow = ['col:', '0', '1', '2', '3', '4', '5'];
  console.log('  ' + exitRow.join(' '));
  for (let r = 0; r < BOARD_SIZE; r++) {
    const marker = r === 4 ? '★' : '.';
    const row = [r + ':', ...grid[r]];
    if (r >= 4) row[4] = '★';
    console.log('  ' + row.join(' '));
  }
}

// ===== 测试 =====
const target = [[1, 4], [2, 4]];
const A = [[2, 1], [2, 2]];
const B = [[1, 3], [2, 3]];
const D = [[3, 3], [3, 4]];
const E = [[3, 5], [3, 6]];

const cOptions = [
  { label: 'C在(4,2)(5,2)', coords: [[4, 2], [5, 2]] },
  { label: 'C在(3,2)(4,2)', coords: [[3, 2], [4, 2]] },
  { label: 'C在(2,5)(3,5)', coords: [[2, 5], [3, 5]] },
  { label: 'C在(3,1)(4,1)', coords: [[3, 1], [4, 1]] },
  { label: 'C在(2,1)(3,1)', coords: [[2, 1], [3, 1]] },
  { label: 'C在(4,1)(5,1)', coords: [[4, 1], [5, 1]] },
  { label: 'C在(3,4)(4,4)', coords: [[3, 4], [4, 4]] },
  { label: 'C在(4,3)(5,3)', coords: [[4, 3], [5, 3]] },
];

console.log('=== 关卡002 求解测试 ===');
console.log('目标(T/G): [1,4][2,4]  出口: (5,4)(6,4) 1-indexed');
console.log('A(横2): [2,1][2,2]  B(竖2): [1,3][2,3]');
console.log('D(横2): [3,3][3,4]  E(横2): [3,5][3,6]\n');

for (const opt of cOptions) {
  console.log(`--- ${opt.label} ---`);
  const blocks = toBlocks(target, [A, B, opt.coords, D, E]);
  printGrid(blocks);

  const solution = bfsSolve(blocks);
  if (solution) {
    console.log(` ✅ 有解！最少步数: ${solution.length}`);
    solution.forEach((move, i) => {
      const dirMap = { up: '上', down: '下', left: '左', right: '右' };
      console.log(`    第${i+1}步: ${move.blockId} 向${dirMap[move.dir]||move.dir} ${move.steps}格`);
    });
  } else {
    console.log(' ❌ 无解');
  }
  console.log('');
}
