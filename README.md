# 「今天吃什么」智能美食推荐师

专治"不知道吃什么"。收集口味偏好 → 搜索附近美食 → 综合评分 Top 3 → 一键下单。

支持**到店堂食**和**外卖配送**双模式推荐。

## 新会话快速开始

```bash
git clone https://github.com/zyhfight/what-to-eat-today.git /tmp/wtet && bash /tmp/wtet/install.sh
```

然后对 CodeBuddy 说：**「帮我推荐今天吃什么」**（使用 `scripts/recommend.js`）

## 手动安装

```bash
git clone https://github.com/zyhfight/what-to-eat-today.git
cd what-to-eat-today
bash install.sh
```

`install.sh` 自动完成：环境检测 → 复制插件 → 注册市场 → 启用插件。

## 使用方式

### 到店推荐

说「今天吃什么」或「帮我推荐附近好吃的」即可触发推荐流程。

### 外卖推荐

说「帮我推荐外卖」或「不想出门，推荐外卖」即可触发外卖推荐流程。

> 外卖推荐需要配置美团联盟 AppKey（见下方配置说明）。未配置时自动回落到堂食推荐。

## 外卖推荐配置

外卖推荐通过美团联盟开放 API（`query_coupon`）搜索外卖商品券，需要 AppKey + AppSecret 认证。

### 配置步骤

1. 在[美团联盟](https://media.meituan.com/)注册并申请 AppKey + AppSecret
2. 复制配置模板：
   ```bash
   cp scripts/config.example.json scripts/config.json
   ```
3. 编辑 `scripts/config.json`，填入你的 AppKey 和 AppSecret：
   ```json
   {
     "aiScene": "a0d4da77f918ab204d86c911fcdd0ce1",
     "cpsOpen": {
       "appKey": "你的AppKey",
       "appSecret": "你的AppSecret",
       "endpoint": "https://media.meituan.com/cps_open/common/api/v1/query_coupon"
     }
   }
   ```
4. 重启对话即可使用外卖推荐

### 评分算法

| 模式 | 评分公式 |
|------|----------|
| 到店 | `0.4*评分 + 0.3*距离 + 0.2*预算 + 0.1*偏好` |
| 外卖 | `0.25*评分 + 0.25*配送时长 + 0.20*预算 + 0.20*配送费 + 0.10*销量` |

## 文件说明

```
what-to-eat-today/
├── .codebuddy-plugin/plugin.json   # 插件清单
├── agents/what-to-eat-today.md     # Agent 提示词
├── scripts/
│   ├── run.js                      # 美团 API 统一入口（环境初始化、登录、搜索、外卖搜索、下单、领券）
│   ├── recommend.js                # 推荐引擎（关键词生成+搜索+评分排序，支持到店/外卖双模式）
│   ├── auth.py                     # 设备 token 管理
│   ├── config.json                 # 配置（含联盟 AppKey，不入 git）
│   ├── config.example.json         # 配置模板
│   └── vendor/cliguard/            # API 签名库
├── references/                     # 诊断工具
├── install.sh                      # 一键部署脚本
└── settings.json                   # 部署配置
```

## 依赖

- 美团账号（首次使用需扫码登录授权，用于到店搜索和下单）
- 美团联盟 AppKey + AppSecret（用于外卖推荐，可选）
- 无需依赖其他专家，完全自包含
