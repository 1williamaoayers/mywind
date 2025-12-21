/**
 * Cross Validator - 多源校验引擎
 * 
 * 功能：
 * 1. 财联社 + 腾讯财经交叉验证
 * 2. 多源相同关键词 = 高优先级
 * 3. 时间差分析（谁更快）
 */

// 新闻缓存（用于交叉验证）
const newsCache = {
    cls: [],      // 财联社
    tencent: [],  // 腾讯财经
    gelonghui: [] // 格隆汇
};

// 缓存过期时间（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

// 校验状态
const validatorStatus = {
    totalValidations: 0,
    criticalAlerts: 0,
    lastValidationTime: null,
    recentCriticals: []
};

/**
 * 添加新闻到缓存
 */
function addToCache(source, news) {
    if (!newsCache[source]) {
        newsCache[source] = [];
    }

    const now = Date.now();

    // 清理过期缓存
    newsCache[source] = newsCache[source].filter(item =>
        now - item.cachedAt < CACHE_TTL
    );

    // 添加新新闻
    for (const item of news) {
        newsCache[source].push({
            ...item,
            cachedAt: now
        });
    }

    console.log(`[多源校验] ${source} 缓存更新: ${news.length} 条`);
}

/**
 * 提取关键词（简单实现）
 */
function extractKeywords(text) {
    if (!text) return [];

    // 金融领域关键词模式
    const patterns = [
        // 公司名
        /([A-Z]{2,})/g,  // 股票代码
        /([\u4e00-\u9fa5]{2,6}(?:股份|集团|科技|银行|证券|保险))/g,  // 公司名
        // 利好/利空词
        /(涨停|跌停|暴涨|暴跌|大涨|大跌|突破|新高|新低)/g,
        // 政策词
        /(降息|加息|降准|MLF|LPR|逆回购)/g,
        // 热门概念
        /(AI|人工智能|芯片|半导体|新能源|光伏|锂电|医药)/g
    ];

    const keywords = new Set();

    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(m => keywords.add(m));
        }
    }

    return Array.from(keywords);
}

/**
 * 交叉验证新闻
 * 返回需要提升优先级的新闻
 */
function crossValidate(newNews, source) {
    validatorStatus.totalValidations++;
    validatorStatus.lastValidationTime = new Date();

    const criticalNews = [];
    const now = Date.now();

    // 获取其他源的缓存
    const otherSources = Object.keys(newsCache).filter(s => s !== source);

    for (const news of newNews) {
        const newsKeywords = extractKeywords(news.title + ' ' + (news.content || ''));

        if (newsKeywords.length === 0) continue;

        // 检查其他源是否有相同关键词
        for (const otherSource of otherSources) {
            const otherNews = newsCache[otherSource] || [];

            for (const other of otherNews) {
                // 跳过过期的
                if (now - other.cachedAt > CACHE_TTL) continue;

                const otherKeywords = extractKeywords(other.title + ' ' + (other.content || ''));

                // 计算关键词重叠
                const overlap = newsKeywords.filter(k => otherKeywords.includes(k));

                // 如果有 2 个以上相同关键词，认为是同一事件
                if (overlap.length >= 2) {
                    const timeDiff = Math.abs(
                        new Date(news.publishTime) - new Date(other.publishTime)
                    );

                    // 5 分钟内的才算
                    if (timeDiff < CACHE_TTL) {
                        const critical = {
                            news,
                            matchedSource: otherSource,
                            matchedNews: other,
                            matchedKeywords: overlap,
                            timeDiffSeconds: Math.round(timeDiff / 1000),
                            priority: 'CRITICAL',
                            reason: `${source} 和 ${otherSource} 同时报道: ${overlap.join(', ')}`
                        };

                        criticalNews.push(critical);
                        validatorStatus.criticalAlerts++;

                        // 记录最近的 Critical
                        validatorStatus.recentCriticals.unshift({
                            ...critical,
                            timestamp: new Date().toLocaleString('zh-CN')
                        });
                        if (validatorStatus.recentCriticals.length > 10) {
                            validatorStatus.recentCriticals.pop();
                        }

                        console.log(`[多源校验] 🚨 CRITICAL: ${overlap.join(', ')} (${source} + ${otherSource})`);
                    }
                }
            }
        }
    }

    // 将新新闻加入缓存
    addToCache(source, newNews);

    return criticalNews;
}

/**
 * 获取校验状态
 */
function getValidatorStatus() {
    return {
        ...validatorStatus,
        cacheStats: {
            cls: newsCache.cls.length,
            tencent: newsCache.tencent.length,
            gelonghui: newsCache.gelonghui.length
        },
        lastValidationTimeStr: validatorStatus.lastValidationTime
            ? validatorStatus.lastValidationTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

/**
 * 清理缓存
 */
function clearCache() {
    newsCache.cls = [];
    newsCache.tencent = [];
    newsCache.gelonghui = [];
    console.log('[多源校验] 缓存已清理');
}

module.exports = {
    addToCache,
    crossValidate,
    getValidatorStatus,
    clearCache,
    extractKeywords
};
