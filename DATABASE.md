# 数据库配置（9 个集合）

> 给部署者和 AI 助手看的执行清单。照着建集合 + 建索引，不用写任何建表 SQL——CloudBase 是文档型数据库，**集合建空的就行，字段由代码首次写入时自动生成**。

## 一、集合清单（必须全部存在）

| # | 集合名 | 用途 | 写入方 |
|---|---|---|---|
| 1 | `users` | 用户账号 | `login` / `updateUserInfo` |
| 2 | `train_records` | 舒尔特训练记录 | `saveTrainRecord` |
| 3 | `level_progress` | 难度解锁进度 | `login` / `unlockNewLevel` |
| 4 | `pass_progress` | 闯关模式进度 | `getPassProgress` |
| 5 | `challenge_records` | 闯关记录 | `saveChallengeRecord` |
| 6 | `huarong_records` | 数字华容道记录 | `saveHuarongRecord` |
| 7 | `sudoku_records` | 数独记录 | `saveSudokuRecord` |
| 8 | `movingBlock_records` | 积木迷阵记录 | `saveMovingBlockRecord` |
| 9 | `memoryGame_records` | 数字记忆记录 | `saveMemoryGameRecord` |

> 少建任何一个，对应功能会静默失败（云函数返回 `code:500`，页面显示「暂无记录」）。**9 个一个都不能少。**

## 二、字段定义

### 1. `users`

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 自动生成 |
| `openid` | string | 微信用户唯一标识，云函数从 `getWXContext()` 取 |
| `nickName` | string | 默认 `微信用户` |
| `avatarUrl` | string | 默认空串 |
| `createTime` | **Date** | `db.serverDate()` |
| `updateTime` | **Date** | `db.serverDate()` |

### 2. `train_records`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `mode` | string | `classic` / `interference` / `shuffle` / `reverse` / `parity` / `challenge` / `alphabet` / `memory` |
| `level` | string | `base` … `crazy` |
| `size` | number | 方格规格 3~10 |
| `timeCost` | number | 耗时（毫秒） |
| `status` | string | `success` / `fail` |
| `accuracy` | number | 正确率 |
| `createTime` | **string** | ISO 字符串，如 `2026-10-30T03:12:00.000Z` |

### 3. `level_progress`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `currentLevel` | string | 当前解锁最高难度，默认 `base` |
| `maxSize` | number | 当前解锁最大规格，默认 `3` |
| `updateTime` | **Date** | `db.serverDate()` |

### 4. `pass_progress`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `currentSize` | number | 当前阶段规格，默认 `5` |
| `stageCurrent` | number | 当前阶段进度，默认 `0` |
| `totalCurrent` | number | 总进度，默认 `0` |
| `updateTime` | **Date** | `db.serverDate()` |

### 5. `challenge_records`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `passLevel` | number | 关卡号 |
| `timeMs` | number | 用时（毫秒） |
| `success` | boolean | 是否通关 |
| `accuracy` | number | 正确率 |
| `createTime` | **string** | ISO 字符串，同时用于**查重**（同 openid + 同 createTime 视为重复，跳过写入） |

### 6. `huarong_records`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `size` | number | 拼图规格 |
| `moves` | number | 移动步数 |
| `time` | number | 用时 |
| `createTime` | **string** | ISO 字符串 |

### 7. `sudoku_records`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `difficulty` | string | 难度标识 |
| `time` | number | 用时 |
| `hints` | number | 提示次数 |
| `errors` | number | 错误次数 |
| `correct` | number | 正确填入数 |
| `undo` | number | 撤销次数 |
| `status` | string | 固定 `success` |
| `createTime` | **string** | ISO 字符串 |

### 8. `movingBlock_records`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `levelId` | string | 关卡 ID（**存字符串**，查询时也要转成字符串） |
| `moves` | number | 移动步数 |
| `steps` | number | 步数 |
| `time` | number | 用时 |
| `difficulty` | string | 默认 `easy` |
| `createTime` | **string** | ISO 字符串 |

### 9. `memoryGame_records`

| 字段 | 类型 | 说明 |
|---|---|---|
| `openid` | string | |
| `level` | string | 难度 |
| `time` | number | 用时 |
| `errors` | number | 错误次数 |
| `status` | string | 固定 `success` |
| `createTime` | **string** | ISO 字符串 |

> ⚠️ **`createTime` 有两种类型**：`users` / `level_progress` / `pass_progress` 用 `db.serverDate()`（Date 对象），所有 `*_records` 记录表用 ISO **字符串**。记录表按 `createTime` 排序，字符串格式才能正确比较；改成 Date 会导致历史记录排序错乱。

## 三、索引清单

在 CloudBase 控制台 → 数据库 → 选中集合 → 「索引」标签页 → 新建索引。

| 集合 | 索引名 | 字段（顺序不能变） | 唯一 |
|---|---|---|---|
| `users` | `openid_unique` | `openid` 升序 | ✅ 是 |
| `train_records` | `openid_time` | `openid` 升序 + `createTime` **降序** | ❌ 否 |
| `level_progress` | `openid_unique` | `openid` 升序 | ✅ 是 |
| `pass_progress` | `openid_unique` | `openid` 升序 | ✅ 是 |
| `challenge_records` | `openid_time` | `openid` 升序 + `createTime` 降序 | ❌ 否 |
| `huarong_records` | `openid_time` | `openid` 升序 + `createTime` 降序 | ❌ 否 |
| `huarong_records` | `openid_size` | `openid` 升序 + `size` 升序 | ❌ 否 |
| `sudoku_records` | `openid_diff_time` | `openid` + `difficulty` + `createTime` 降序 | ❌ 否 |
| `sudoku_records` | `openid_diff_best` | `openid` + `difficulty` + `time` 升序 | ❌ 否 |
| `movingBlock_records` | `openid_diff_level` | `openid` + `difficulty` + `levelId` + `createTime` 降序 | ❌ 否 |
| `movingBlock_records` | `openid_diff_best` | `openid` + `difficulty` + `levelId` + `moves` 升序 | ❌ 否 |
| `memoryGame_records` | `openid_diff_time` | `openid` + `level` + `createTime` 降序 | ❌ 否 |

**为什么必须建**：云函数里所有查询都是 `where({ openid, ... }).orderBy('createTime', 'desc')`。没有复合索引时，单用户记录超过 1000 条后查询会变慢甚至报错。开发阶段不建也能跑，上线前务必补齐。

**唯一索引的意义**：`users` / `level_progress` / `pass_progress` 一条 openid 只应有一行。加了唯一索引后，即使并发调用也不会产生重复用户。

## 四、权限（安全规则）

本项目**前端不直接读写数据库**，所有读写都经云函数（云函数使用管理端权限，不受安全规则限制）。因此全部集合都可以设成最严格：

```json
{
  "read": false,
  "write": false
}
```

设置位置：数据库 → 选中集合 → 「权限设置」→ 自定义安全规则。

> 早期文档里写的 `doc._openid == auth.openid` **不要用**：本项目显式写入的字段名是 `openid`，不是微信自动加的 `_openid`，这条规则永远不成立。如果以后确实要开放前端直读，规则应写成 `doc.openid == auth.openid`。

## 五、给 AI 助手的执行方式

按顺序做，做完每步都验证：

1. 逐个创建上表 9 个集合（空集合即可，**不要**手写字段，代码首次写入会自动建字段）
2. 逐个创建上表 12 条索引（唯一索引 3 条必须建，其余 9 条建议建）
3. 全部集合权限设为 `{"read": false, "write": false}`
4. 验证：在微信开发者工具里编译小程序 → 点「我的」→ 触发登录 → 回控制台看 `users`、`level_progress`、`pass_progress` 三张表各多了一行，`openid` 有值

如果当前工具链里有腾讯云开发（CloudBase）相关的 MCP 或 CLI，可直接调用其建集合 / 建索引能力批量完成；没有就按上面的控制台路径，一步步告诉用户点哪里。
