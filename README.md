# 「今天吃什么」智能美食推荐师

专治"不知道吃什么"。收集口味偏好 → 搜索附近美食 → 综合评分 Top 3 → 一键下单。

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

说「今天吃什么」或「帮我推荐附近好吃的」即可触发推荐流程。

## 文件说明

```
what-to-eat-today/
├── .codebuddy-plugin/plugin.json   # 插件清单
├── agents/what-to-eat-today.md     # Agent 提示词
├── scripts/recommend.js            # 推荐引擎（搜索+评分排序）
├── install.sh                      # 一键部署脚本
└── settings.json                   # 部署配置
```

## 依赖

- 「领券下单找我」专家（meituan-living-assistant）
- 美团账号
