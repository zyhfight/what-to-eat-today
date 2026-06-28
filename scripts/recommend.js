#!/usr/bin/env node
/**
 * "今天吃什么" 推荐引擎
 * 用法: node recommend.js --time-slot night --lat 30.34 --lng 120.12 --city-id 50 --token xxx
 *       [--cuisine 火锅,烧烤] [--taste 辣] [--budget 80] [--avoid 不吃辣]
 */

const { execSync } = require('child_process');

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

const SLOT_KEYWORDS = {
  breakfast: ['包子', '粥', '肠粉', '煎饼', '豆浆油条'],
  lunch: ['快餐', '盖饭', '面条', '麻辣烫', '汉堡'],
  tea: ['奶茶', '咖啡', '甜品', '蛋糕', '面包'],
  dinner: ['火锅', '烧烤', '川菜', '日料', '粤菜'],
  night: ['烧烤', '炸鸡', '小龙虾', '串串', '麻辣烫']
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

function generateKeywords(args) {
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
  const slotKws = SLOT_KEYWORDS[slot] || SLOT_KEYWORDS.dinner;
  for (const kw of slotKws) {
    if (!keywords.includes(kw) && keywords.length < 5) keywords.push(kw);
  }
  // 忌口过滤
  if (avoid) {
    const avoidList = avoid.split(',').map(s => s.trim()).filter(Boolean);
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

function searchProducts(keyword, lat, lng, cityId, token) {
  const body = JSON.stringify({
    keyword, page: 1, pageSize: '5',
    clientSource: 'coupon-fusion-workbuddy',
    userParamDTO: { lat, lng, token, cityId, app: 216, platform: 1, partner: 1018 }
  });
  try {
    const stdout = execSync(
      `curl -s -X POST "https://click.meituan.com/cps/ai/product/searchProductByAgent" -H "Content-Type: application/json" -d '${body}' --connect-timeout 8 --max-time 15`,
      { encoding: 'utf-8' }
    );
    const result = JSON.parse(stdout);
    if (result.code === 200 && result.data && result.data.productList) {
      return result.data.productList.map(p => ({
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

function parseDistanceKm(text) {
  if (!text) return 999;
  const km = text.match(/([\d.]+)\s*km/i);
  if (km) return parseFloat(km[1]);
  const m = text.match(/([\d.]+)\s*m/i);
  if (m) return parseFloat(m[1]) / 1000;
  return 999;
}

function calculateScore(p, budget) {
  const rating = (p.poiDpFiveScore || 3.5) / 5.0;
  const distKm = parseDistanceKm(p.distanceText);
  const distance = Math.max(0, 1 - distKm / 8);
  const price = parseFloat(p.salePrice) || 0;
  let bgt = 0.5;
  if (price === 0) bgt = 0.7;
  else if (budget > 0) {
    if (price <= budget) bgt = 1.0;
    else if (price <= budget * 1.2) bgt = 0.7;
    else bgt = 0.3;
  } else {
    if (price <= 100) bgt = 1.0;
    else if (price <= 150) bgt = 0.7;
    else bgt = 0.3;
  }
  return rating * 0.4 + distance * 0.3 + bgt * 0.2 + 0.1;
}

function generateReasons(p, budget) {
  const reasons = [];
  if ((p.poiDpFiveScore || 0) >= 4.5) reasons.push(`高评分门店（${p.poiDpFiveScore}分），口碑优秀`);
  if (parseDistanceKm(p.distanceText) < 0.5) reasons.push('距离很近，步行可达');
  const price = parseFloat(p.salePrice) || 0;
  if (price > 0) {
    if (budget > 0 && price <= budget) reasons.push(`¥${price}，在预算范围内`);
    else if (price <= 100) reasons.push(`¥${price}，价格实惠`);
  }
  if (reasons.length === 0) reasons.push('夜宵热门选择');
  return reasons.slice(0, 2);
}

// ── Main ──
const args = parseArgs(process.argv);
const lat = args.lat, lng = args.lng, cityId = args['city-id'], token = args.token;
const budget = parseFloat(args.budget) || 0;

if (!lat || !lng || !cityId || !token) {
  out({ ok: false, error: 'MISSING_PARAMS' });
  process.exit(1);
}

const keywords = generateKeywords(args);
const allProducts = [];
const seen = new Set();

for (const kw of keywords) {
  const products = searchProducts(kw, lat, lng, cityId, token);
  for (const p of products) {
    if (p.productId && !seen.has(p.productId)) {
      seen.add(p.productId);
      allProducts.push(p);
    }
  }
}

if (allProducts.length === 0) {
  out({ ok: true, recommendations: [], keywords, totalSearched: 0 });
  process.exit(0);
}

const scored = allProducts.map(p => ({ ...p, score: calculateScore(p, budget) }));

const poiMap = new Map();
for (const p of scored) {
  const key = p.poiId;
  if (!poiMap.has(key) || poiMap.get(key).score < p.score) poiMap.set(key, p);
}

const top3 = Array.from(poiMap.values())
  .sort((a, b) => b.score - a.score)
  .slice(0, 3)
  .map((p, i) => ({
    rank: i + 1,
    productId: p.productId,
    poiId: p.poiId,
    poiName: p.poiName,
    productName: p.productName,
    salePrice: p.salePrice,
    distanceText: p.distanceText,
    poiDpFiveScore: p.poiDpFiveScore,
    imageUrl: p.imageUrl,
    score: Math.round(p.score * 100) / 100,
    reasons: generateReasons(p, budget)
  }));

out({ ok: true, recommendations: top3, keywords, totalSearched: allProducts.length });
