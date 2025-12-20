/**
 * 过滤配置 - 白名单关键词管理
 * 只有命中白名单的新闻才会调用 AI 分析并入库
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径（持久化）
const CONFIG_FILE = path.join(__dirname, 'keywords.json');

// 默认白名单关键词（首次启动使用）
const DEFAULT_KEYWORDS = [
    // 热门概念
    '英伟达', 'NVIDIA', '低空经济', '人工智能', 'AI',
    // 宏观政策
    '美联储', '降息', '加息', '央行', '利率',
    // 风险事件
    '立案', '调查', '退市', '暴雷', '爆仓',
    // 利好事件
    '重组', '并购', '涨停', '注资', '回购'
];

// 内存中的关键词列表
let keywords = [];

/**
 * 加载关键词配置
 */
function loadKeywords() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            keywords = JSON.parse(data);
            console.log(`[过滤] 加载 ${keywords.length} 个白名单关键词`);
        } else {
            keywords = [...DEFAULT_KEYWORDS];
            saveKeywords();
            console.log(`[过滤] 初始化默认白名单: ${keywords.length} 个关键词`);
        }
    } catch (error) {
        console.error('[过滤] 加载配置失败:', error.message);
        keywords = [...DEFAULT_KEYWORDS];
    }
    return keywords;
}

/**
 * 保存关键词配置
 */
function saveKeywords() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(keywords, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('[过滤] 保存配置失败:', error.message);
        return false;
    }
}

/**
 * 获取所有关键词
 */
function getKeywords() {
    return [...keywords];
}

/**
 * 添加关键词
 */
function addKeyword(keyword) {
    const kw = keyword.trim();
    if (!kw) return { success: false, error: '关键词不能为空' };
    if (keywords.includes(kw)) return { success: false, error: '关键词已存在' };

    keywords.push(kw);
    saveKeywords();
    return { success: true, keyword: kw };
}

/**
 * 删除关键词
 */
function removeKeyword(keyword) {
    const index = keywords.indexOf(keyword);
    if (index === -1) return { success: false, error: '关键词不存在' };

    keywords.splice(index, 1);
    saveKeywords();
    return { success: true, keyword };
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
    addKeyword,
    removeKeyword,
    shouldIngest,
    filterNews
};
