/**
 * 过滤配置 - 白名单关键词管理
 * 综合方案：自动词(订阅股票) + 手动词(通用财经)
 * 
 * 更新: 2026-01-05 采用综合方案
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'keywords.json');
const SUBSCRIPTIONS_FILE = path.join(__dirname, '../data/subscriptions.json');

// 默认手动关键词（通用财经词，首次启动使用）
const DEFAULT_MANUAL_KEYWORDS = [
    // 大市指数
    '港股', '恒指', '恒生指数', 'A股', '美股', '纳指', '标普', '道指',
    // 宏观政策
    '美联储', '降息', '加息', '央行', '利率', '货币政策',
    // 重大事件（风险）
    '立案', '调查', '退市', '暴雷', '爆仓', '违规', '处罚',
    // 重大事件（利好）
    '重组', '并购', '涨停', '注资', '回购', '增持',
    // 热门概念
    '人工智能', 'AI', '英伟达', 'NVIDIA'
];

// 内存中的关键词列表
let keywords = [];         // 最终合并后的白名单
let manualKeywords = [];   // 手动配置的词
let autoKeywords = [];     // 从订阅自动提取的词

/**
 * 从订阅股票中提取关键词
 */
function extractSubscriptionKeywords() {
    try {
        if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
            console.log('[过滤] 订阅文件不存在，跳过自动词提取');
            return [];
        }

        const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
        const subscriptions = JSON.parse(data);
        const extracted = [];

        for (const sub of subscriptions) {
            // 添加股票代码
            if (sub.stockCode) {
                extracted.push(sub.stockCode);
            }
            // 添加股票名称
            if (sub.stockName) {
                extracted.push(sub.stockName);
            }
            // 添加自定义关键词
            if (sub.keywords && Array.isArray(sub.keywords)) {
                extracted.push(...sub.keywords);
            }
        }

        // 去重并过滤空值
        const unique = [...new Set(extracted.filter(kw => kw && kw.trim()))];
        console.log(`[过滤] 从 ${subscriptions.length} 个订阅股票提取 ${unique.length} 个自动关键词`);
        return unique;
    } catch (error) {
        console.error('[过滤] 提取订阅关键词失败:', error.message);
        return [];
    }
}

/**
 * 加载关键词配置（综合方案）
 */
function loadKeywords() {
    // 1. 读取手动配置的词
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            manualKeywords = JSON.parse(data);
        } else {
            manualKeywords = [...DEFAULT_MANUAL_KEYWORDS];
            saveKeywords();
            console.log(`[过滤] 初始化默认手动白名单: ${manualKeywords.length} 个关键词`);
        }
    } catch (error) {
        console.error('[过滤] 加载手动配置失败:', error.message);
        manualKeywords = [...DEFAULT_MANUAL_KEYWORDS];
    }

    // 2. 读取订阅股票的自动词
    autoKeywords = extractSubscriptionKeywords();

    // 3. 合并去重
    keywords = [...new Set([...manualKeywords, ...autoKeywords])];

    console.log(`[过滤] 白名单加载完成: 手动词 ${manualKeywords.length} + 自动词 ${autoKeywords.length} = 总计 ${keywords.length} 个`);

    return keywords;
}

/**
 * 保存手动关键词配置
 */
function saveKeywords() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(manualKeywords, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('[过滤] 保存配置失败:', error.message);
        return false;
    }
}

/**
 * 获取所有关键词（合并后）
 */
function getKeywords() {
    return [...keywords];
}

/**
 * 获取手动关键词
 */
function getManualKeywords() {
    return [...manualKeywords];
}

/**
 * 获取自动关键词
 */
function getAutoKeywords() {
    return [...autoKeywords];
}

/**
 * 添加手动关键词
 */
function addKeyword(keyword) {
    const kw = keyword.trim();
    if (!kw) return { success: false, error: '关键词不能为空' };
    if (manualKeywords.includes(kw)) return { success: false, error: '关键词已存在' };

    manualKeywords.push(kw);
    saveKeywords();

    // 重新合并
    keywords = [...new Set([...manualKeywords, ...autoKeywords])];

    return { success: true, keyword: kw };
}

/**
 * 删除手动关键词
 */
function removeKeyword(keyword) {
    const index = manualKeywords.indexOf(keyword);
    if (index === -1) return { success: false, error: '关键词不存在或为自动词' };

    manualKeywords.splice(index, 1);
    saveKeywords();

    // 重新合并
    keywords = [...new Set([...manualKeywords, ...autoKeywords])];

    return { success: true, keyword };
}

/**
 * 刷新自动关键词（订阅变化时调用）
 */
function refreshAutoKeywords() {
    autoKeywords = extractSubscriptionKeywords();
    keywords = [...new Set([...manualKeywords, ...autoKeywords])];
    console.log(`[过滤] 自动词已刷新: ${autoKeywords.length} 个`);
    return autoKeywords;
}

/**
 * 核心过滤函数：判断新闻是否应该入库
 * @param {string} title - 新闻标题
 * @param {string} content - 新闻内容
 * @returns {object} { shouldIngest: boolean, matchedKeywords: string[] }
 */
function shouldIngest(title, content) {
    const text = `${title || ''} ${content || ''}`.toLowerCase();
    const matched = [];

    for (const kw of keywords) {
        if (text.includes(kw.toLowerCase())) {
            matched.push(kw);
        }
    }

    return {
        shouldIngest: matched.length > 0,
        matchedKeywords: matched
    };
}

/**
 * 批量检查多条新闻
 */
function filterNews(newsList) {
    return newsList.filter(news => {
        const result = shouldIngest(news.title, news.content);
        news._matchedKeywords = result.matchedKeywords;
        return result.shouldIngest;
    });
}

// 启动时加载
loadKeywords();

module.exports = {
    loadKeywords,
    getKeywords,
    getManualKeywords,
    getAutoKeywords,
    addKeyword,
    removeKeyword,
    refreshAutoKeywords,
    shouldIngest,
    filterNews
};
