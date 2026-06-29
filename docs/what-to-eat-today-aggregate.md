# 第三方聚合平台接入方案

> 个人开发者无需企业资质即可启用外卖推荐的兜底方案

---

## 一、现状与局限

当前「今天吃什么」专家有三种推荐路径：

| 路径 | 平台 | 状态 | 个人开发者 | 商品搜索 |
|------|------|------|-----------|---------|
| 到店 | 美团 CPS | ✅ 可用 | ✅ pt-passport 扫码 | ✅ 关键词+经纬度 |
| 外卖 | 美团联盟 | ⚠️ 待 AppKey | ❌ 需企业资质 | ✅ 关键词+经纬度 |
| 外卖 | 饿了么联盟 | ⚠️ 待 AppKey | ⚠️ 需淘宝客审核 | ⚠️ 仅城市筛选 |

两个外卖路径都可能卡在审核上。第三方聚合平台是**最可靠的兜底方案**。

---

## 二、可选平台对比

### 喵有券（ecapi.cn）— 推荐首选

| 维度 | 说明 |
|------|------|
| 注册 | https://console.ecapi.cn 个人免费注册 |
| 美团外卖 | 红包转链接口（h5/deeplink/微信小程序路径） |
| 饿了么外卖 | 红包转链接口 + 订单查询 |
| 费用 | 新用户注册送 7 天 VIP，免费会员有调用频率限制 |
| 接口认证 | apikey + IP 白名单（简单） |
| 佣金 | 美团 3% 起，饿了么 6% |
| 商品搜索 | ❌ 无（只提供红包/活动链接） |

### 好单库（haodanku.com）

| 维度 | 说明 |
|------|------|
| 注册 | 个人免费注册 |
| 美团/饿了么 | 活动链接、优惠券分发 |
| 费用 | 免费，佣金被抽成 10-30% |
| 商品搜索 | ❌ 无（偏优惠券/活动） |

### 大淘客（dataoke.com）

| 维度 | 说明 |
|------|------|
| 注册 | 个人免费注册 |
| 美团/饿了么 | 支持较弱，主做电商 |
| 商品搜索 | ❌ 外卖支持弱 |

---

## 三、推荐架构：喵有券红包转链 + 本地推荐

第三方聚合平台的共同局限是**没有外卖商品搜索接口**（只有红包/活动链接）。因此需要调整推荐模式：

### 新推荐模式：品类引导 + 红包转链

```
用户说"外卖推荐" 
  → 不搜索具体商品
  → 根据时段+偏好推荐品类（火锅/快餐/奶茶...）
  → 为每个品类附带对应平台的红包链接
  → 用户点击红包 → 跳转美团/饿了么 App 领券 → 自行选品下单
```

### 推荐展示（红包模式）

```
🥇 推荐品类：火锅

🍲 天冷就要吃火锅！附近多家火锅店可用

🎫 [领美团外卖红包]({meituan_h5_link}) | [领饿了么红包]({eleme_h5_link})

---

🥈 推荐品类：快餐便当

🍱 工作日午餐首选，快速送达

🎫 [领美团外卖红包]({meituan_h5_link}) | [领饿了么红包]({eleme_h5_link})

---

🥉 推荐品类：奶茶咖啡

🧋 下午茶提神，多家品牌可选

🎫 [领美团外卖红包]({meituan_h5_link}) | [领饿了么红包]({eleme_h5_link})
```

---

## 四、实现方案

### 4.1 新增命令：`run.js aggregate-redpacket`

```bash
node run.js aggregate-redpacket --platform meituan
node run.js aggregate-redpacket --platform eleme
```

调用喵有券 API 获取红包链接：

```
GET http://api.web.ecapi.cn/platform/meituan_v2?apkey=xxx&eid=common
GET http://api.web.ecapi.cn/platform/getElemeNew?apkey=xxx&eid=common
```

返回：
```json
{
  "ok": true,
  "platform": "meituan",
  "h5Url": "https://runion.meituan.com/...",
  "deepLink": "imeituan://...",
  "wxAppid": "wxde8ac0a21135c07d",
  "wxPageUrl": "/index/pages/h5/h5?weburl=..."
}
```

### 4.2 recommend.js 新增 `--mode redpacket`

```
recommend.js --mode redpacket --time-slot dinner
```

不调用搜索 API，直接根据时段生成品类推荐 + 附带红包链接。

### 4.3 config.json 新增配置

```json
{
  "aggregate": {
    "ecapiKey": "",
    "meituanRedpacketEid": "common",
    "elemeRedpacketEid": "common"
  }
}
```

### 4.4 降级链

```
推荐请求
  ├── 美团外卖搜索（需企业 AppKey）
  │     └── 不可用 ↓
  ├── 饿了么商品池推荐（需淘宝客 AppKey）
  │     └── 不可用 ↓
  └── 喵有券红包推荐（个人即可，兜底）
        └── 美团红包 + 饿了么红包 + 品类引导
```

---

## 五、改造清单

| 文件 | 改动 |
|------|------|
| `scripts/run.js` | 新增 `aggregate-redpacket` 命令 |
| `scripts/recommend.js` | 新增 `--mode redpacket` 分支 |
| `scripts/config.json` | 新增 `aggregate.ecapiKey` 配置 |
| `agents/what-to-eat-today.md` | 新增红包推荐展示模板 |

---

## 六、注册步骤

1. 访问 https://console.ecapi.cn 注册账号
2. 在「系统设置 → 平台设置」获取 apikey
3. 在「系统设置 → IP 白名单」添加服务器 IP
4. 将 apikey 填入 config.json 的 `aggregate.ecapiKey`
5. 调用接口测试：`node run.js aggregate-redpacket --platform meituan`

新用户注册送 7 天 VIP，可调用全部接口。
