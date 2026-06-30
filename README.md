# 「今天吃什么」智能美食推荐师

专治"不知道吃什么"。收集口味偏好 → 搜索附近美食 → 综合评分 Top 3 → 一键下单。还能领取美团优惠券。

## 快速开始

```bash
git clone https://github.com/zyhfight/what-to-eat-today.git /tmp/wtet && bash /tmp/wtet/install.sh
```

然后对 CodeBuddy 说：**「帮我推荐今天吃什么」**

## 功能

- 🍜 到店堂食推荐（按评分/距离/预算排序 Top3）
- 🛒 一键下单（美团团购券，返回支付二维码）
- 🎫 领取美团优惠券（一键领取全网优惠券）

无需任何第三方 API Key，扫码登录美团即可使用。

## 使用方式

说「今天吃什么」或「帮我推荐附近好吃的」触发推荐流程。
说「领券」或「领优惠券」触发领券流程。

## 文件说明

```
what-to-eat-today/
├── .codebuddy-plugin/plugin.json   # 插件清单
├── agents/what-to-eat-today.md     # Agent 提示词
├── scripts/
│   ├── run.js                      # 美团 API 统一入口（搜索、下单、领券）
│   ├── recommend.js                # 推荐引擎（关键词生成+搜索+评分排序）
│   ├── auth.py                     # 设备 token 管理
│   ├── config.json                 # 配置
│   └── vendor/cliguard/            # API 签名库
├── references/                     # 诊断工具
├── install.sh                      # 一键部署脚本
└── settings.json                   # 部署配置
```

## 依赖

- 美团账号（首次使用需扫码登录授权）
- 无需依赖其他专家，完全自包含
