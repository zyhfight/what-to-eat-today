# 饿了么联盟 AppKey 申请指南

> 为「今天吃什么」专家接入饿了么外卖推荐

---

## 一、AppKey 归属体系

饿了么联盟 API（`alibaba.alsc.union.eleme.*`）隶属于**淘宝联盟开放平台**，不是淘宝开放平台（TOP）。两个平台都使用 TOP 网关（`eco.taobao.com/router/rest`），但申请入口不同：

| 平台 | 入口 | 用途 |
|------|------|------|
| **淘宝联盟开放平台** | https://aff-open.taobao.com | 淘宝客/饿了么联盟 API（我们需要的） |
| 淘宝开放平台 (TOP) | https://open.taobao.com | 商家 ERP/OMS 系统对接 |

---

## 二、申请步骤

### 第一步：注册淘宝联盟账号（个人可注册）

1. 访问 **https://pub.alimama.com**（阿里妈妈/淘宝联盟）
2. 用淘宝账号登录（个人淘宝账号即可）
3. 注册成为**淘宝客**（推广者身份，个人可以注册）
4. 完成实名认证

### 第二步：媒体备案

1. 在淘宝联盟后台进行**媒体备案**
2. 选择媒体类型（网站/APP/其他），填写你的推广渠道信息
3. 等待审核通过（通常 1-3 个工作日）

> 如果没有网站/APP，可以选择"其他"类型，填写你的推广场景描述。

### 第三步：创建应用获取 AppKey

1. 进入**淘宝联盟开放平台**：https://aff-open.taobao.com
2. 点击右上角「新建应用」
3. 选择对应的媒体备案
4. 应用创建成功后，自动生成 **AppKey** 和 **AppSecret**

### 第四步：申请饿了么联盟权限包

1. 在淘宝联盟开放平台浏览「能力地图」
2. 找到**本地生活 / 淘宝闪购联盟**相关权限包
3. 权限包名称可能叫：
   - 「淘宝闪购联盟」或「本地生活联盟」
   - 「饿了么推广」或「本地联盟」
4. 点击申请权限，填写使用场景说明
5. 等待审核

### 第五步：获取推广位 PID

1. 登录**淘宝闪购联盟平台**：https://union.ele.me/index
2. 创建推广位，获取 PID（格式如 `alsc_123_131_1313`）
3. 推广位用于 API 调用时指定推广渠道，佣金归因到此 PID

---

## 三、填入配置

获取到 AppKey / AppSecret / PID 后，编辑 `scripts/config.json`：

```json
{
  "eleme": {
    "appKey": "你的AppKey",
    "appSecret": "你的AppSecret",
    "pid": "alsc_你的PID",
    "cityCode": "330100",
    "endpoint": "https://eco.taobao.com/router/rest"
  }
}
```

然后运行缓存命令拉取商品池：

```bash
node run.js eleme-cache --city-code 330100
```

---

## 四、关键链接汇总

| 步骤 | 地址 |
|------|------|
| 注册淘宝客 | https://pub.alimama.com |
| 联盟开放平台（创建应用） | https://aff-open.taobao.com |
| 闪购联盟平台（创建推广位） | https://union.ele.me/index |
| API 文档 | https://developer.alibaba.com/docs/api.htm?apiId=67502 |
| 注册教程 | https://help.alimama.com |

---

## 五、注意事项

1. **个人可以注册**：淘宝联盟支持个人淘宝客，无需企业资质
2. **权限包审核**：饿了么联盟的 API 权限包可能需要单独申请，审核周期 1-3 个工作日
3. **PID 必须**：API 调用时需要传入 PID 参数，没有推广位无法调用
4. **API 免费**：`alibaba.alsc.union.eleme.promotion.itempromotion.query` 标注为"免费"，无调用费用
5. **无需 OAuth 授权**：推广商品列表查询不需要用户授权，仅需 AppKey + 签名
