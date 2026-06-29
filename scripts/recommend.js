#!/usr/bin/env node
/**
 * "今天吃什么" 推荐引擎
 * 用法（到店）: node recommend.js --time-slot night --lat 30.34 --lng 120.12 --city-id 50 --token xxx
 *              [--cuisine 火锅,烧烤] [--taste 辣] [--budget 80] [--avoid 不吃辣]
 * 用法（外卖）: node recommend.js --mode waimai --time-slot lunch --lat 30.34 --lng 120.12
 *              [--cuisine 火锅] [--taste 辣] [--budget 50] [--avoid 不吃辣]
 *              [--max-delivery-minutes 30]
 *
 * 外卖模式通过 spawnSync 调用 run.js search-waimai（走美团联盟 query_coupon 接口），
 * 到店模式通过 spawnSync 调用 run.js search（走 cliguard 签名通道）。
 */

const { spawnSync } = require('child_process');
const path = require('path');

function out(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].replace(/^--/, '');
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { args[key] = next; i++; }
      else args[key] = 'true';
    }
  }
  return args;
}

// ── 到店关键词词库 ──
const SLOT_KEYWORDS = {
  breakfast: ['包子', '粥', '肠粉', '煎饼', '豆浆油条'],
  lunch: ['快餐', '盖饭', '面条', '麻辣烫', '汉堡'],
  tea: ['奶茶', '咖啡', '甜品', '蛋糕', '面包'],
  dinner: ['火锅', '烧烤', '川菜', '日料', '粤菜'],
  night: ['烧烤', '炸鸡', '小龙虾', '串串', '麻辣烫']
};

// ── 外卖关键词词库（偏可配送的家常/快餐/饮品）──
const SLOT_KEYWORDS_WAIMAI = {
  breakfast: ['包子', '粥铺', '豆浆油条', '煎饼果子', '肠粉'],
  lunch: ['快餐', '盖饭', '便当', '麻辣烫', '汉堡炸鸡'],
  tea: ['奶茶', '咖啡', '甜品', '蛋糕', '果汁'],
  dinner: ['家常菜', '烧烤', '小龙虾', '串串', '披萨'],
  night: ['烧烤', '炸鸡', '小龙虾', '串串', '烤鱼']
};

const TASTE_MODIFIERS = {
  '辣': ['麻辣', '香辣', '火锅'],
  '清淡': ['粥', '粤菜', '日料', '轻食'],
  '酸甜': ['糖醋', '韩式', '泰式']
};

const AVOID_BLOCK = {
  '不吃辣': ['辣', '麻辣', '香辣', '火锅'],
  '不吃海鲜': ['海鲜', '虾', '蟹', '鱼', '刺身'],
  '素食': ['肉', '鸡', '鸭', '鱼', '虾', '蟹', '猪', '牛', '羊']
};

function generateKeywords(args, isWaimai) {
  let keywords = [];
  const slot = args['time-slot'] || 'dinner';
  const cuisine = args.cuisine || '';
  const taste = args.taste || '';
  const avoid = args.avoid || '';

  // 菜系优先
  if (cuisine) {
    keywords.push(...cuisine.split(/[,，、]/).map(s => s.trim()).filter(Boolean));
  }
  // 口味修饰
  if (taste && TASTE_MODIFIERS[taste]) {
    for (const m of TASTE_MODIFIERS[taste]) {
      if (!keywords.includes(m) && keywords.length < 5) keywords.push(m);
    }
  }
  // 时段默认填充
  const slotKws = isWaimai
    ? (SLOT_KEYWORDS_WAIMAI[slot] || SLOT_KEYWORDS_WAIMAI.dinner)
    : (SLOT_KEYWORDS[slot] || SLOT_KEYWORDS.dinner);
  for (const kw of slotKws) {
    if (!keywords.includes(kw) && keywords.length < 5) keywords.push(kw);
  }
  // 忌口过滤
  if (avoid) {
    const avoidList = avoid.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    keywords = keywords.filter(kw => {
      for (const a of avoidList) {
        const blocked = AVOID_BLOCK[a];
        if (blocked && blocked.some(b => kw.includes(b))) return false;
      }
      return true;
    });
  }
  return keywords.slice(0, 5);
}

// ── 到店搜索：通过 spawnSync 调用 run.js search（走 cliguard 签名）──
function searchProducts(keyword, lat, lng, cityId, token) {
  const runJs = path.join(__dirname, 'run.js');
  const result = spawnSync('node', [runJs, 'search',
    '--keyword', keyword,
    '--lat', lat,
    '--lng', lng,
    '--city-id', cityId,
    '--page', '1',
    '--page-size', '5'
  ], { encoding: 'utf-8', timeout: 20000 });

  if (result.status !== 0 || !result.stdout) return [];
  try {
    const data = JSON.parse(result.stdout.trim().split('\n').pop());
    if (data.ok && data.productList) {
      return data.productList.map(p => ({
        productId: String(p.productId || ''),
        poiId: String(p.poiId || ''),
        poiName: p.poiName || '',
        productName: p.productName || '',
        salePrice: p.salePrice || '0',
        distanceText: p.distanceText || '',
        poiDpFiveScore: p.poiDpFiveScore || 0,
        imageUrl: p.imageUrl || ''
      }));
    }
  } catch (_) {}
  return [];
}

// ── 外卖搜索：通过 spawnSync 调用 run.js search-waimai（走联盟 API）──
function searchWaimaiProducts(keyword, lat, lng) {
  const runJs = path.join(__dirname, 'run.js');
  const result = spawnSync('node', [runJs, 'search-waimai',
    '--keyword', keyword,
    '--lat', String(lat),
    '--lng', String(lng),
    '--page', '1',
    '--page-size', '5'
  ], { encoding: 'utf-8', timeout: 20000 });

  if (result.status !== 0 || !result.stdout) return [];
  try {
    const data = JSON.parse(result.stdout.trim().split('\n').pop());
    if (data.ok && data.productList) {
      return data.productList;
    }
    // 如果返回 CPS_NOT_CONFIGURED，向上传递错误
    if (data.error === 'CPS_NOT_CONFIGURED') {
      return { __error: 'CPS_NOT_CONFIGURED', __message: data.message };
    }
  } catch (_) {}
  return [];
}

// ── 到店评分 ──
function parseDistanceKm(text) {
  if (!text) return 999;
  const km = text.match(/([\d.]+)\s*km/i);
  if (km) return parseFloat(km[1]);
  const m = text.match(/([\d.]+)\s*m/i);
  if (m) return parseFloat(m[1]) / 1000;
  return 999;
}

function matchBudget(price, budget) {
  if (price === 0) return 0.7;
  if (budget > 0) {
    if (price <= budget) return 1.0;
    if (price <= budget * 1.2) return 0.7;
    return 0.3;
  } else {
    if (price <= 50) return 1.0;
    if (price <= 100) return 0.7;
    return 0.3;
  }
}

function calculateScore(p, budget) {
  const rating = (p.poiDpFiveScore || 3.5) / 5.0;
  const distKm = parseDistanceKm(p.distanceText);
  const distance = Math.max(0, 1 - distKm / 8);
  const price = parseFloat(p.salePrice) || 0;
  const bgt = matchBudget(price, budget);
  return rating * 0.4 + distance * 0.3 + bgt * 0.2 + 0.1;
}

// ── 外卖评分 ──
// score = 0.25*rating + 0.25*delivery + 0.20*price + 0.20*fee + 0.10*sales
function calculateWaimaiScore(p, budget, maxDeliveryMinutes) {
  const rating = (p.poiDpFiveScore || 3.5) / 5.0;
  // 配送时长（分钟），>60min 归零；用户限时不匹配则大幅降分
  let duration = p.deliveryDuration || 45;
  let delivery = Math.max(0, 1 - duration / 60);
  if (maxDeliveryMinutes > 0 && duration > maxDeliveryMinutes) {
    delivery *= 0.3;  // 超出用户期望时长，大幅降分
  }
  // 预算匹配
  const price = parseFloat(p.sellPrice) || 0;
  const bgt = matchBudget(price, budget);
  // 配送费，>15元归零；免配送费=1.0
  const fee = Math.max(0, 1 - (p.distributionCost || 0) / 15);
  // 销量对数归一化（10000 单约=1.0）
  const sales = Math.min(1, Math.log10((p.saleVolume || 0) + 1) / 4);
  return rating * 0.25 + delivery * 0.25 + bgt * 0.20 + fee * 0.20 + sales * 0.10;
}

// ── 到店推荐理由 ──
function generateReasons(p, budget) {
  const reasons = [];
  if ((p.poiDpFiveScore || 0) >= 4.5) reasons.push(`高评分门店（${p.poiDpFiveScore}分），口碑优秀`);
  if (parseDistanceKm(p.distanceText) < 0.5) reasons.push('距离很近，步行可达');
  const price = parseFloat(p.salePrice) || 0;
  if (price > 0) {
    if (budget > 0 && price <= budget) reasons.push(`¥${price}，在预算范围内`);
    else if (price <= 100) reasons.push(`¥${price}，价格实惠`);
  }
  if (reasons.length === 0) reasons.push('热门选择');
  return reasons.slice(0, 2);
}

// ── 外卖推荐理由 ──
function generateWaimaiReasons(p, budget) {
  const r = [];
  if ((p.saleVolume || 0) >= 1000) r.push(`月销 ${p.saleVolumeText || p.saleVolume + '+'}，热门之选`);
  if ((p.distributionCost || 0) === 0) r.push('免配送费');
  if ((p.deliveryDuration || 999) <= 30) r.push(`${p.deliveryDuration}分钟极速达`);
  if ((p.poiDpFiveScore || 0) >= 4.5) r.push(`高评分门店（${p.poiDpFiveScore}分）`);
  const price = parseFloat(p.sellPrice) || 0;
  if (budget > 0 && price <= budget) r.push(`¥${price}，在预算内`);
  else if (price > 0 && price <= 50) r.push(`¥${price}，价格实惠`);
  if (r.length === 0) r.push('外卖热销');
  return r.slice(0, 2);
}

// ── 到店 deeplink ──
function buildDeeplink(productId, poiId) {
  const h5Url = `https://cdb.meituan.com/pages/deal/detail?productId=${productId}`;
  const deeplink = `imeituan://www.meituan.com/web?url=${encodeURIComponent(h5Url)}`;
  return { h5Url, deeplink, displayUrl: h5Url };
}

// ── 外卖 deeplink ──
function buildWaimaiDeeplink(p, lat, lng) {
  const h5Url = p.deeplink || `https://h5.waimai.meituan.com/waimai/mindex/home?lat=${lat}&lng=${lng}`;
  const deeplink = `imeituan://www.meituan.com/web?url=${encodeURIComponent(h5Url)}`;
  return { h5Url, deeplink, displayUrl: h5Url };
}

// ── Main ──
const args = parseArgs(process.argv);
const mode = args.mode || 'dinein';   // dinein | waimai
const isWaimai = (mode === 'waimai');
const lat = args.lat, lng = args.lng, cityId = args['city-id'], token = args.token;
const budget = parseFloat(args.budget) || 0;
const maxDeliveryMinutes = parseInt(args['max-delivery-minutes'] || '0', 10);

// 参数校验：外卖模式不需要 token（联盟 API 用 AppKey 认证）
if (!lat || !lng) {
  out({ ok: false, error: 'MISSING_PARAMS', message: '缺少 lat/lng 参数' });
  process.exit(1);
}
if (!isWaimai && (!cityId || !token)) {
  out({ ok: false, error: 'MISSING_PARAMS', message: '到店模式需要 city-id 和 token' });
  process.exit(1);
}

const keywords = generateKeywords(args, isWaimai);
const allProducts = [];
const seen = new Set();
let waimaiConfigError = null;

for (const kw of keywords) {
  let products;
  if (isWaimai) {
    products = searchWaimaiProducts(kw, lat, lng);
    // 检查是否返回了配置错误
    if (products && products.__error) {
      waimaiConfigError = { error: products.__error, message: products.__message };
      break;
    }
  } else {
    products = searchProducts(kw, lat, lng, cityId, token);
  }
  if (Array.isArray(products)) {
    for (const p of products) {
      const key = p.productId;
      if (key && !seen.has(key)) {
        seen.add(key);
        allProducts.push(p);
      }
    }
  }
}

// 外卖配置错误，直接返回
if (waimaiConfigError) {
  out({ ok: false, mode, error: waimaiConfigError.error, message: waimaiConfigError.message, keywords });
  process.exit(0);
}

if (allProducts.length === 0) {
  out({ ok: true, mode, recommendations: [], keywords, totalSearched: 0 });
  process.exit(0);
}

const scored = allProducts.map(p => ({
  ...p,
  score: isWaimai
    ? calculateWaimaiScore(p, budget, maxDeliveryMinutes)
    : calculateScore(p, budget)
}));

// 同 poiId 去重 → 保留最高分
const poiMap = new Map();
for (const p of scored) {
  const key = p.poiId;
  if (!poiMap.has(key) || poiMap.get(key).score < p.score) poiMap.set(key, p);
}

const top3 = Array.from(poiMap.values())
  .sort((a, b) => b.score - a.score)
  .slice(0, 3)
  .map((p, i) => {
    const links = isWaimai
      ? buildWaimaiDeeplink(p, lat, lng)
      : buildDeeplink(p.productId, p.poiId);
    const result = {
      rank: i + 1,
      productId: p.productId,
      poiId: p.poiId,
      poiName: p.poiName,
      productName: p.productName,
      score: Math.round(p.score * 100) / 100,
      reasons: isWaimai ? generateWaimaiReasons(p, budget) : generateReasons(p, budget),
      h5Url: links.h5Url,
      deeplink: links.deeplink
    };
    // 根据模式附加不同字段
    if (isWaimai) {
      Object.assign(result, {
        brandName: p.brandName || '',
        sellPrice: p.sellPrice || '0',
        imageUrl: p.imageUrl || '',
        poiDpFiveScore: p.poiDpFiveScore || 0,
        deliveryDistance: p.deliveryDistance || 0,
        distributionCost: p.distributionCost || 0,
        deliveryDuration: p.deliveryDuration || 0,
        lastDeliveryFee: p.lastDeliveryFee || 0,
        saleVolume: p.saleVolume || 0,
        saleVolumeText: p.saleVolumeText || ''
      });
    } else {
      Object.assign(result, {
        salePrice: p.salePrice || '0',
        distanceText: p.distanceText || '',
        poiDpFiveScore: p.poiDpFiveScore || 0,
        imageUrl: p.imageUrl || ''
      });
    }
    return result;
  });

out({ ok: true, mode, recommendations: top3, keywords, totalSearched: allProducts.length });
