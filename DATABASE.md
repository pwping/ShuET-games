# 数据库集合配置

## 需要创建的数据库集合

### 1. users - 用户表
```json
{
  "_id": "自动生成",
  "openid": "string - 微信用户唯一标识",
  "nickName": "string - 微信昵称",
  "avatarUrl": "string - 头像地址",
  "createTime": "date - 注册时间",
  "updateTime": "date - 更新时间"
}
```
索引：openid (唯一)

### 2. train_records - 训练记录表
```json
{
  "_id": "自动生成",
  "openid": "string - 关联用户",
  "mode": "string - 训练模式",
  "level": "string - 难度等级",
  "size": "number - 方格规格",
  "timeCost": "number - 耗时毫秒",
  "status": "string - success/fail",
  "accuracy": "number - 正确率",
  "createTime": "date - 完成时间"
}
```
索引：openid + createTime

### 3. level_progress - 难度解锁进度表
```json
{
  "_id": "自动生成",
  "openid": "string - 关联用户",
  "currentLevel": "string - 当前解锁最高难度",
  "maxSize": "number - 当前解锁最大方格"
}
```
索引：openid (唯一)

### 4. pass_progress - 闯关模式进度表
```json
{
  "_id": "自动生成",
  "openid": "string - 关联用户",
  "currentSize": "number - 当前阶段方格大小",
  "stageCurrent": "number - 当前阶段进度",
  "totalCurrent": "number - 总进度"
}
```
索引：openid (唯一)

## 在 CloudBase 控制台创建步骤

1. 登录 [CloudBase 控制台](https://tcb.cloud.tencent.com/dev)
2. 选择环境：`<你的环境 ID>`（在 `miniprogram/config.js` 的 `envId` 里填的是同一个）
3. 进入「数据库」页面
4. 点击「创建集合」，依次创建以上4个集合
5. 为每个集合添加对应的索引

## 安全规则配置

每个集合的安全规则建议配置为：
```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```
