# 部署指南（照着做，10 分钟跑起来）

> 全程只需要填 **2 个值**：小程序 AppID、云开发环境 ID。
> 其余（云存储桶、广告位）都是可选，不填也能完整跑通所有游戏。
>
> 如果你是让 AI 助手帮你部署，直接说「按 DEPLOY.md 部署，我的 AppID 是 wx…，环境 ID 是 …」，它应该自己做完剩下的步骤。

## 需要准备

| 项 | 要求 |
|---|---|
| 微信开发者工具 | 最新稳定版，[下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) |
| 小程序账号 | 已注册、拿到 AppID（[mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发管理 → 开发设置） |
| 云开发 | 微信开发者工具里点「云开发」按提示开通，选**按量计费**或免费额度都行 |
| Node.js | 18.x（云函数运行环境，云端安装，本地不用装依赖） |

---

## 第 1 步：填 AppID

打开根目录的 `project.config.json`，把最后一行改成你自己的：

```json
"appid": "wx你的AppID"
```

> ⚠️ 路径是**项目根目录**的 `project.config.json`。`miniprogram/` 下没有第二个配置文件，也不需要有。

## 第 2 步：填云环境 ID

1. 微信开发者工具打开**项目根目录**（`ShuET-games`，不是 `miniprogram/`）
2. 点顶部工具栏「云开发」，开通后进入控制台
3. 控制台 → 设置 → 环境 ID，复制那一串（形如 `xxx-1a2b3c4d`）
4. 打开 `miniprogram/config.js`，替换第一处：

```js
const envId = '你的环境ID';
```

**可选两处**（不填不影响运行）：

| 位置 | 不填的后果 |
|---|---|
| `storageBucket` | 分享卡片用微信默认截图（灰色卡片 + 页面截图），功能正常 |
| `adUnits.*` | 不展示广告，游戏功能完全正常 |

> 要填 `storageBucket`：云开发 → 存储 → 随便传个文件 → 点开详情 → 复制 `cloud://<envId>.<bucket>/...` 里点号后那一段。

## 第 3 步：建数据库（9 个集合 + 12 条索引）

打开 [DATABASE.md](DATABASE.md)，按里面的**集合清单**和**索引清单**逐个建。

简化版（先建这 9 个空集合，索引可以稍后补）：

```
users                  train_records          level_progress
pass_progress          challenge_records      huarong_records
sudoku_records         movingBlock_records    memoryGame_records
```

建法：云开发控制台 → 数据库 → 「+」创建集合 → 输入名字 → 确定。**字段不用建**，代码首次写入会自动生成。

集合权限统一改成最严格（本项目前端不直连数据库，全走云函数）：

```json
{ "read": false, "write": false }
```

> 少建一个集合，对应功能会静默失败（显示「暂无数据」），排查时先回来看这里。

## 第 4 步：部署云函数（21 个）

在开发者工具左侧文件树里，展开 `cloudfunctions/`，**对每一个函数目录右键** → 「上传并部署：云端安装依赖（不上传 node_modules）」。

21 个函数：

```
login                     getUserInfo              updateUserInfo           getOpenId
saveTrainRecord           getUserTrainRecords      getLevelProgress         unlockNewLevel
getPassProgress           saveChallengeRecord      getChallengeRecords
saveHuarongRecord         getHuarongRecords
saveSudokuRecord          getSudokuRecords
saveMovingBlockRecord     getMovingBlockRecords
saveMemoryGameRecord      getMemoryGameRecords
getAllModes               getAllLevels
```

每部署完一个，控制台「云函数」列表里应出现同名函数且状态正常。**21 个全要部，缺哪个对应功能就不可用。**

> 云函数全部使用 `cloud.DYNAMIC_CURRENT_ENV`，部署到哪个环境就用哪个环境，**不需要改任何代码**，也不需要配环境变量。

## 第 5 步：编译

点开发者工具「编译」。首页应显示游戏大厅（舒尔特方格 / 数字华容道 / 数独 / 积木迷阵 / 数字记忆）。

---

## 验收清单

按顺序点一遍，全部通过就说明部署完成：

- [ ] 首页 5 个游戏入口都能进
- [ ] 舒尔特：「我的」→ 登录（弹隐私授权 → 允许）→ 返回后昵称/头像出现
- [ ] 云开发控制台 → 数据库 → `users` 表多了 1 行，`openid` 有值
- [ ] `level_progress`、`pass_progress` 各多 1 行
- [ ] 玩一局舒尔特到结束 → `train_records` 多 1 行
- [ ] 玩一局数独 → `sudoku_records` 多 1 行
- [ ] 设置页能切音效/震动，返回后再进设置，开关状态保留
- [ ] 设置页 → 儿童模式 → 设密码 6 位 → 生效

---

## 常见故障

| 现象 | 原因 | 解决 |
|---|---|---|
| 编译报「未找到 appid」 | `project.config.json` 的 appid 还是占位值 | 第 1 步 |
| 页面所有数据为空，控制台报 `env not found` | `envId` 填错，或环境已销毁 | 第 2 步，重新复制环境 ID |
| 数据为空且云函数日志报 `collection not exists` | 集合没建全 | 第 3 步，补建缺失集合 |
| 点登录没反应，日志报 `FunctionName not found` | 云函数没部署或没部署完 | 第 4 步，右键重新上传 |
| 记录能写进去但列表不显示 | 缺复合索引，查询报错 | 建 `openid + createTime` 索引 |
| 分享卡片是灰图 | 没配 `storageBucket` 或云存储里没有 `images/share-card.png` | 可忽略，或按第 2 步补 |
| 广告不显示，日志有 `adUnitId` 报错 | 用的是别人的广告位 ID / 没有流量主权限 | 改 `config.js` 的 `adUnits`，或留空 |
| iPad 上棋盘右侧被裁 | 老版本布局计算问题 | 已修复；如再出现，检查 `computeBoard` 的可用宽度是否多算了 `24rpx` |

---

## 上线前还需要（可选）

| 项 | 说明 |
|---|---|
| 隐私保护指引 | 公众平台 → 设置 → 服务内容声明 → 用户隐私保护指引，勾选「头像、昵称」等，否则头像昵称获取失败 |
| 分享图 | 上传一张 5:4 的图片到云存储 `images/share-card.png` |
| 流量主 | 满足条件后开通，按 DATABASE 无关；在公众平台建 3 个广告位，填进 `config.js` |
| 数据库索引 | 开发阶段可跳过，上线前务必补齐见 [DATABASE.md](DATABASE.md) |
