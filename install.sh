#!/bin/bash
# ============================================================
# 「今天吃什么」专家 - 一键部署脚本
# 用法: bash install.sh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   🍜 「今天吃什么」专家 - 一键部署       ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# ── 1. 检测环境 ──
echo -e "${YELLOW}[1/5] 检测环境...${NC}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# install.sh 在插件目录内，源文件就是 SCRIPT_DIR 自身
PLUGIN_SRC="$SCRIPT_DIR"
PLUGIN_DIR="/root/.codebuddy/plugins/marketplaces/experts/plugins/what-to-eat-today"
MARKET_DIR="/root/.codebuddy/plugins/marketplaces/experts/plugins"
MARKET_FILE="/root/.codebuddy/plugins/marketplaces/experts/.codebuddy-plugin/marketplace.json"
SETTINGS_FILE="/root/.codebuddy/settings.json"

if [ ! -d "$PLUGIN_SRC" ]; then
    echo -e "${RED}❌ 未找到插件源文件: $PLUGIN_SRC${NC}"
    echo "   请确保 install.sh 与 what-to-eat-today/ 在同一目录"
    exit 1
fi

if [ ! -f "$PLUGIN_SRC/.codebuddy-plugin/plugin.json" ]; then
    echo -e "${RED}❌ 插件包不完整，缺少 plugin.json${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ 插件源文件完整${NC}"

# ── 2. 复制插件文件 ──
echo -e "${YELLOW}[2/4] 安装插件文件...${NC}"

mkdir -p "$MARKET_DIR"

if [ -d "$PLUGIN_DIR" ]; then
    echo "   覆盖已有安装..."
    rm -rf "$PLUGIN_DIR"
fi

cp -r "$PLUGIN_SRC" "$PLUGIN_DIR"
echo -e "${GREEN}   ✓ 插件已安装到 $PLUGIN_DIR${NC}"

# ── 3. 注册到市场 ──
echo -e "${YELLOW}[3/4] 注册到专家市场...${NC}"

if [ ! -f "$MARKET_FILE" ]; then
    echo '{"name":"experts","description":"Expert marketplace","plugins":[]}' > "$MARKET_FILE"
fi

# 检查是否已注册
if grep -q '"what-to-eat-today"' "$MARKET_FILE" 2>/dev/null; then
    echo -e "${GREEN}   ✓ 市场已注册${NC}"
else
    # 在 plugins 数组中追加
    python3 -c "
import json
with open('$MARKET_FILE', 'r') as f:
    data = json.load(f)
data['plugins'].append({'name': 'what-to-eat-today', 'source': './plugins/what-to-eat-today'})
with open('$MARKET_FILE', 'w') as f:
    json.dump(data, f, ensure_ascii=False)
" 2>/dev/null || {
    # Python 不可用时用 sed
    sed -i 's/\]$/{"name":"what-to-eat-today","source":".\/plugins\/what-to-eat-today"}]/' "$MARKET_FILE"
}
    echo -e "${GREEN}   ✓ 已注册到市场${NC}"
fi

# ── 4. 启用插件 ──
echo -e "${YELLOW}[4/4] 启用插件...${NC}"

if [ ! -f "$SETTINGS_FILE" ]; then
    echo '{"enabledPlugins":{}}' > "$SETTINGS_FILE"
fi

if grep -q '"what-to-eat-today@experts"' "$SETTINGS_FILE" 2>/dev/null; then
    echo -e "${GREEN}   ✓ 插件已启用${NC}"
else
    python3 -c "
import json
with open('$SETTINGS_FILE', 'r') as f:
    data = json.load(f)
if 'enabledPlugins' not in data:
    data['enabledPlugins'] = {}
data['enabledPlugins']['what-to-eat-today@experts'] = True
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
" 2>/dev/null || {
    # 手动追加
    sed -i 's/"enabledPlugins": {/"enabledPlugins": {\n    "what-to-eat-today@experts": true,/' "$SETTINGS_FILE"
}
    echo -e "${GREEN}   ✓ 插件已启用${NC}"
fi

# ── 完成 ──
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   ✅ 部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "   使用方式："
echo "   在 CodeBuddy 中说「今天吃什么」即可"
echo ""
echo "   试试这些："
echo "   · 今天吃什么"
echo "   · 帮我推荐附近好吃的"
echo "   · 推荐附近的晚餐"
echo ""
