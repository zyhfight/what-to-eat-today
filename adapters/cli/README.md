# CLI 命令行使用

## 环境要求

- Node.js 18+
- Python 3（用于设备 token 管理）

## 快速开始

```bash
# 设置项目根目录
export WTET_ROOT=/path/to/what-to-eat-today

# 初始化环境
node $WTET_ROOT/scripts/run.js init

# 获取登录链接
node $WTET_ROOT/scripts/run.js auth-get-code
# → 用美团 App 扫码授权

# 获取授权结果
node $WTET_ROOT/scripts/run.js auth-poll-token

# 获取位置
node $WTET_ROOT/scripts/run.js location

# 搜索商品
node $WTET_ROOT/scripts/run.js search --keyword 火锅 --lat 30.19 --lng 120.19 --city-id 50

# 推荐引擎（Top3）
node $WTET_ROOT/scripts/recommend.js --time-slot dinner --lat 30.19 --lng 120.19 --city-id 50 --token <TOKEN>

# 下单
node $WTET_ROOT/scripts/run.js order --product-id <PID> --poi-id <POIID> --city-id 50 --uuid <UUID>

# 领券
node $WTET_ROOT/scripts/run.js issue
```

## 所有命令

| 命令 | 说明 |
|------|------|
| `init` | 环境初始化 |
| `get-device-token` | 获取设备标识 |
| `get-token` | 获取缓存的用户 Token |
| `auth-get-code` | 获取登录链接 |
| `auth-poll-token` | 获取授权结果 |
| `location` | 获取用户近期位置 |
| `search` | 商品搜索 |
| `order` | 下单 |
| `issue` | 领取优惠券 |
| `hotword` | 热搜词查询 |
| `logout` | 退出登录 |
