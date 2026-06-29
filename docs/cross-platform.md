# 「今天吃什么」专家跨平台部署方案

> 当前为 CodeBuddy Agent 插件形态，分析如何移植到微信小程序及其他平台。

---

## 一、核心障碍：cliguard 签名 SDK

当前插件有**两条独立的认证/签名通道**，可移植性截然不同：

| 通道 | 覆盖接口 | 签名方式 | 可移植性 |
|------|----------|----------|----------|
| **通道 A** | 到店搜索/下单/领券/位置（`click.meituan.com/cps/ai/*`） | cliguard mtgsig（混淆 JS + 设备指纹 + daemon） | ❌ 绑定 Node.js + 文件系统 |
| **通道 B** | 外卖搜索（`media.meituan.com/cps_open/*`） | 标准 MD5 + HmacSHA256 + Base64 | ✅ 纯密码学，Web Crypto API 即可 |

**结论**：外卖链路易移植（且不需要用户 token，仅靠 AppKey/AppSecret）；到店链路必须由后端代理签名。

---

## 二、推荐架构：前端 + 轻量后端

无论哪种前端，都需要一个 Node.js 后端来代理 cliguard 签名和 pt-passport 登录：

```
┌─────────────────────────────────────────────┐
│  前端 (任意平台)                               │
│  偏好收集 UI → Top3 展示 → 下单/查看          │
└──────────────────┬──────────────────────────┘
                   │ HTTP API
┌──────────────────▼──────────────────────────┐
│  后端服务 (Node.js，复用现有 run.js/cliguard)   │
│  /api/recommend/dinein   → recommend.js       │
│  /api/recommend/waimai   → recommend.js       │
│  /api/order              → run.js order       │
│  /api/login/qrcode       → run.js auth-*      │
│  /api/location           → run.js location    │
└──────────────────────────────────────────────┘
```

---

## 三、各平台方案对比

### 微信小程序

| 项目 | 说明 |
|------|------|
| **可行性** | 需配后端，纯前端不可行（cliguard 无法跑在小程序 JS 引擎） |
| **UI 工作量** | 大（偏好表单、卡片列表、登录二维码、支付引导） |
| **后端工作量** | 中（3-5 人日，封装现有脚本为 HTTP API） |
| **技术难点** | 登录态跨端、设备指纹共享可能触发风控、deeplink 无法拉起美团 App |
| **推荐切入点** | **外卖推荐**（无需用户 token，链路最短） |
| **总工期** | 15-25 人日 |

### Electron 桌面应用

| 项目 | 说明 |
|------|------|
| **可行性** | **最高**，主进程是完整 Node.js，几乎零改造复用 |
| **UI 工作量** | 中（React/Vue 前端，8-15 人日） |
| **后端工作量** | 无需独立后端（内嵌主进程） |
| **技术难点** | cliguard daemon 打包路径配置、首次扫码登录引导 |
| **总工期** | 8-15 人日（改造成本最低的方案） |

### Web H5 / 公众号

| 项目 | 说明 |
|------|------|
| **可行性** | 需后端代理签名，前端 UI 自由度高 |
| **优势** | 公众号 JSSDK 可扫码登录、获取位置，体验优于纯 H5 |
| **总工期** | 8-12 人日 + P0 后端 |

---

## 四、共享内核：提取平台无关的核心引擎

推荐引擎中以下模块**完全不依赖 Node API**，可直接提取为纯 TS/JS 库，所有平台共享：

```
core/
├── keywords.ts       # 关键词词库 + 生成逻辑
├── scorer.ts         # 到店/外卖评分算法
├── reasons.ts        # 推荐理由生成
├── normalizer.ts     # 数据规范化（normalizeWaimaiItem）
├── deeplink.ts       # deeplink/H5 链接构建
├── dedup.ts          # 去重 + TopN 排序
├── sign-cps-open.ts  # CPS HMAC 签名（纯密码学，Web Crypto 可用）
└── types.ts          # HttpClient / TokenStore / Signer 接口
```

各平台只需实现 3 个接口：
- `HttpClient` — 发 HTTP 请求（Node https / fetch / wx.request）
- `TokenStore` — 读 token（fs / localStorage / wx.storage）
- `Signer.signMtgsig` — cliguard 签名（Node 直接 require / 前端调后端 API）

---

## 五、实施路线图

| 优先级 | 任务 | 工期 | 说明 |
|--------|------|------|------|
| **P0** | API 后端服务 | 2-4 人日 | 所有前端方案的公共底座，把 run.js/recommend.js 包成 HTTP API |
| **P1** | 共享内核提取 | 3-5 人日 | 提取为 TS 包，让 P2/P3/P4 共用一套评分/关键词逻辑 |
| **P2** | Electron 桌面应用 | 8-15 人日 | 改造成本最低，零签名迁移 |
| **P3** | Web H5 / 公众号 | 8-12 人日 | 用户触达广，依赖 P0 |
| **P4** | 微信小程序 | 15-25 人日 | 用户量大但限制多，建议先做外卖子场景 |

---

## 六、关键决策

1. **先做后端 API（P0）**：这是所有前端方案的公共基础设施，投入最小收益最大
2. **外卖优先**：外卖链路不需要用户 token、签名可纯前端实现，是微信小程序的最佳切入点
3. **不做 cliguard 逆向**：混淆强度高且有合规风险，所有平台通过后端代理调用
4. **单用户先行**：多用户 SaaS 化需解决 cliguard 指纹共享和 pt-passport 多账号管理，属独立大工程
