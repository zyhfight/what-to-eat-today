# 🍜 今天吃什么

智能美食推荐 — 到店堂食 Top3 推荐 + 一键下单 + 领取优惠券

## 功能

- 🔍 **智能推荐**：根据时段/口味/预算搜索附近美食，综合评分排序 Top3
- 🛒 **一键下单**：美团团购券直接下单，返回支付二维码
- 🎫 **领取优惠券**：一键领取美团全网优惠券
- 📍 **基于位置**：自动获取用户位置，搜索附近商家

## 多平台使用

### 1. CodeBuddy 专家

```bash
git clone https://github.com/zyhfight/what-to-eat-today.git /tmp/wtet
bash /tmp/wtet/adapters/codebuddy/install.sh
```

在 CodeBuddy 中说「今天吃什么」即可触发。

### 2. 其他智能体平台（Coze/Dify/FastGPT 等）

1. 将 `agents/what-to-eat-today.md` 导入为系统提示词
2. 配置工具调用（shell 命令执行权限）
3. 设置环境变量 `WTET_ROOT` 指向项目根目录
4. 首次使用执行 `node $WTET_ROOT/scripts/run.js init`

### 3. Web H5 应用

```bash
cd adapters/web && npm install && node server.js
```

浏览器访问 http://localhost:3000

### 4. CLI 命令行

```bash
export WTET_ROOT=/path/to/what-to-eat-today
node $WTET_ROOT/scripts/run.js init
node $WTET_ROOT/scripts/run.js search --keyword 火锅 --lat 30.19 --lng 120.19 --city-id 50
```

详见 [adapters/cli/README.md](adapters/cli/README.md)

## 项目结构

```
what-to-eat-today/
├── scripts/                    # 核心引擎（平台无关）
│   ├── run.js                  # 美团 API 统一入口
│   ├── recommend.js            # 推荐引擎
│   ├── auth.py                 # 设备 token 管理
│   ├── config.json             # 配置
│   └── vendor/cliguard/        # API 签名库
├── agents/                     # Agent 提示词
│   └── what-to-eat-today.md
├── adapters/                   # 平台适配层
│   ├── codebuddy/              # CodeBuddy 插件
│   ├── cli/                    # 命令行
│   └── web/                    # Web H5
├── references/                 # 诊断工具
└── README.md
```

## 依赖

- Node.js 18+
- Python 3（设备 token 管理）
- 美团账号（首次扫码登录）
- **无需任何第三方 API Key**

## 技术架构

```
用户输入 → Agent 提示词（意图识别+话术）
               → shell 调用 scripts/run.js（cliguard 签名+美团 API）
               → scripts/recommend.js（评分排序+Top3）
               → 返回推荐/下单/领券结果
```

评分算法：`0.4×评分 + 0.3×距离 + 0.2×预算匹配 + 0.1×偏好`

## License

MIT
