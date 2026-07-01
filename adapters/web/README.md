# Web H5 部署

## 快速启动

```bash
# 安装依赖
npm install express

# 启动服务
node adapters/web/server.js

# 访问
open http://localhost:3000
```

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `WTET_ROOT` | 上两级目录 | 项目根目录 |
| `PORT` | 3000 | 监听端口 |

## API 接口

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 检查登录状态 |
| `/api/login` | GET | 获取登录链接 |
| `/api/login/poll` | POST | 轮询登录结果 |
| `/api/location` | GET | 获取用户位置 |
| `/api/recommend` | POST | 推荐美食 |
| `/api/order` | POST | 下单 |
| `/api/issue` | POST | 领取优惠券 |

## 部署

```bash
# PM2 守护
pm2 start adapters/web/server.js --name what-to-eat-today

# Nginx 反向代理
location / {
  proxy_pass http://127.0.0.1:3000;
}
```
