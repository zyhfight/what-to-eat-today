#!/usr/bin/env node
/**
 * 「今天吃什么」Web H5 服务
 *
 * 启动: node adapters/web/server.js
 * 访问: http://localhost:3000
 *
 * 环境变量:
 *   WTET_ROOT  项目根目录（默认: 上两级）
 *   PORT       监听端口（默认: 3000）
 */

const express = require('express');
const { spawnSync } = require('child_process');
const path = require('path');

const WTET_ROOT = process.env.WTET_ROOT || path.resolve(__dirname, '../..');
const SCRIPTS_DIR = path.join(WTET_ROOT, 'scripts');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── 工具函数：调用 run.js ──
function runCommand(cmd, args) {
  const result = spawnSync('node', [path.join(SCRIPTS_DIR, 'run.js'), cmd, ...args],
    { encoding: 'utf-8', timeout: 30000, env: { ...process.env, WTET_ROOT } });
  if (result.status !== 0 || !result.stdout) return null;
  try { return JSON.parse(result.stdout.trim().split('\n').pop()); }
  catch (_) { return null; }
}

function runRecommend(args) {
  const result = spawnSync('node', [path.join(SCRIPTS_DIR, 'recommend.js'), ...args],
    { encoding: 'utf-8', timeout: 60000, env: { ...process.env, WTET_ROOT } });
  if (result.status !== 0 || !result.stdout) return null;
  try { return JSON.parse(result.stdout.trim().split('\n').pop()); }
  catch (_) { return null; }
}

// ── API 路由 ──

// 初始化 + 获取 Token 状态
app.get('/api/status', (req, res) => {
  const init = runCommand('init', []);
  const token = runCommand('get-token', []);
  const deviceToken = runCommand('get-device-token', []);
  res.json({
    ok: true,
    initialized: init && init.ok,
    loggedIn: token && token.ok,
    deviceToken: deviceToken && deviceToken.ok ? deviceToken.device_token : null
  });
});

// 获取登录链接
app.get('/api/login', (req, res) => {
  const data = runCommand('auth-get-code', []);
  if (data && data.ok) {
    res.json({ ok: true, url: data.url || null, token: data.token || null });
  } else {
    res.json({ ok: false, error: '获取登录链接失败' });
  }
});

// 轮询登录结果
app.post('/api/login/poll', (req, res) => {
  const data = runCommand('auth-poll-token', []);
  res.json(data || { ok: false, error: '轮询失败' });
});

// 获取位置
app.get('/api/location', (req, res) => {
  const data = runCommand('location', []);
  res.json(data || { ok: false, error: '获取位置失败' });
});

// 推荐
app.post('/api/recommend', (req, res) => {
  const { lat, lng, cityId, token, timeSlot, budget, cuisine, taste, avoid } = req.body;
  const args = ['--time-slot', timeSlot || 'dinner', '--lat', lat, '--lng', lng,
    '--city-id', cityId, '--token', token];
  if (budget) args.push('--budget', String(budget));
  if (cuisine) args.push('--cuisine', cuisine);
  if (taste) args.push('--taste', taste);
  if (avoid) args.push('--avoid', avoid);
  const data = runRecommend(args);
  res.json(data || { ok: false, error: '推荐失败' });
});

// 下单
app.post('/api/order', (req, res) => {
  const { productId, poiId, cityId, uuid, lat, lng } = req.body;
  const args = ['--product-id', productId, '--poi-id', poiId, '--city-id', cityId,
    '--uuid', uuid, '--lat', lat || '', '--lng', lng || ''];
  const data = runCommand('order', args);
  res.json(data || { ok: false, error: '下单失败' });
});

// 领券
app.post('/api/issue', (req, res) => {
  const data = runCommand('issue', []);
  res.json(data || { ok: false, error: '领券失败' });
});

// ── 启动 ──
app.listen(PORT, () => {
  console.log(`🍜 「今天吃什么」Web 服务已启动: http://localhost:${PORT}`);
  console.log(`   项目根目录: ${WTET_ROOT}`);
});
