/**
 * 股票数据采集器
 * 
 * 功能：
 * 1. 按订阅股票采集数据
 * 2. 研报/财报/公告100%采集
 * 3. 新闻按关键词过滤
 * 4. 汇总股票相关资讯
 */

const { getSubscriptionManager } = require('./subscriptionManager');
const { DataFilter } = require('../utils/dataFilter');

// 数据类型配置
const DATA_TYPES = {
    // 必须采集，不过滤
    MUST_COLLECT: ['report', 'financial', 'announcement'],

    // 优先采集
    HIGH_PRIORITY: ['news', 'flow'],

    // 普通采集
    NORMAL: ['sentiment']
};

/**
 * 股票数据采集器类
 */
class StockCollector {
    constructor() {
        this.subscriptionManager = getSubscriptionManager();
        this.dataFilter = new DataFilter();
        this.collectedData = new Map(); // stockCode -> data[]
    }

    /**
     * 判断是否需要采集该数据
     */
    shouldCollect(item) {
        const { type, title, source } = item;

        // 1. 必须采集类型不过滤
        if (DATA_TYPES.MUST_COLLECT.includes(type)) {
            const match = this.subscriptionManager.matchText(title);
            if (match.matched) {
                return {
                    collect: true,
                    reason: 'must_collect',
                    stocks: match.stocks,
                    score: 100
                };
            }
        }

        // 2. 检查是否与订阅股票相关
        const match = this.subscriptionManager.matchText(title);
        if (match.matched) {
            // 高优先级数据宽松处理
            if (DATA_TYPES.HIGH_PRIORITY.includes(type)) {
                return {
                    collect: true,
                    reason: 'subscription_match',
                    stocks: match.stocks,
                    score: 80
                };
            }

            // 普通数据需要通过过滤器
            const filterResult = this.dataFilter.filter(item);
            if (filterResult.keep) {
                return {
                    collect: true,
                    reason: 'filter_passed',
                    stocks: match.stocks,
                    score: filterResult.score
                };
            }
        }

        // 3. 检查是否是通用高价值内容
        const filterResult = this.dataFilter.filter(item);
        if (filterResult.keep && filterResult.score >= 70) {
            return {
                collect: true,
                reason: 'high_value',
                stocks: [],
                score: filterResult.score
            };
        }

        return { collect: false, reason: 'filtered_out' };
    }

    /**
     * 处理采集结果
     */
    processItems(items, type) {
        const results = {
            collected: [],
            dropped: [],
            byStock: {}
        };

        for (const item of items) {
            const enrichedItem = { ...item, type };
            const decision = this.shouldCollect(enrichedItem);

            if (decision.collect) {
                enrichedItem.collectedAt = new Date().toISOString();
                enrichedItem.score = decision.score;
                enrichedItem.reason = decision.reason;
                enrichedItem.relatedStocks = decision.stocks;

                results.collected.push(enrichedItem);

                // 按股票分组
                for (const stock of decision.stocks) {
                    if (!results.byStock[stock]) {
                        results.byStock[stock] = [];
                    }
                    results.byStock[stock].push(enrichedItem);
                }
            } else {
                results.dropped.push({ ...item, dropReason: decision.reason });
            }
        }

        return results;
    }

    /**
     * 采集新闻
     */
    async collectNews(scraper, options = {}) {
        console.log('[股票采集] 采集新闻...');

        try {
            const items = await scraper(options);
            const results = this.processItems(items, 'news');

            console.log(`[股票采集] 新闻: 采集${results.collected.length}条, 过滤${results.dropped.length}条`);
            return results;
        } catch (error) {
            console.error('[股票采集] 新闻采集失败:', error.message);
            return { collected: [], dropped: [], byStock: {} };
        }
    }

    /**
     * 采集研报（不过滤）
     */
    async collectReports(scraper, options = {}) {
        console.log('[股票采集] 采集研报...');

        try {
            const items = await scraper(options);
            const results = this.processItems(items, 'report');

            console.log(`[股票采集] 研报: 采集${results.collected.length}条`);
            return results;
        } catch (error) {
            console.error('[股票采集] 研报采集失败:', error.message);
            return { collected: [], dropped: [], byStock: {} };
        }
    }

    /**
     * 采集公告（不过滤）
     */
    async collectAnnouncements(scraper, options = {}) {
        console.log('[股票采集] 采集公告...');

        try {
            const items = await scraper(options);
            const results = this.processItems(items, 'announcement');

            console.log(`[股票采集] 公告: 采集${results.collected.length}条`);
            return results;
        } catch (error) {
            console.error('[股票采集] 公告采集失败:', error.message);
            return { collected: [], dropped: [], byStock: {} };
        }
    }

    /**
     * 采集资金流向
     */
    async collectFlow(scraper, options = {}) {
        console.log('[股票采集] 采集资金流向...');

        try {
            const items = await scraper(options);
            const results = this.processItems(items, 'flow');

            console.log(`[股票采集] 资金: 采集${results.collected.length}条`);
            return results;
        } catch (error) {
            console.error('[股票采集] 资金采集失败:', error.message);
            return { collected: [], dropped: [], byStock: {} };
        }
    }

    /**
     * 采集舆情
     */
    async collectSentiment(scraper, options = {}) {
        console.log('[股票采集] 采集舆情...');

        try {
            const items = await scraper(options);
            const results = this.processItems(items, 'sentiment');

            console.log(`[股票采集] 舆情: 采集${results.collected.length}条, 过滤${results.dropped.length}条`);
            return results;
        } catch (error) {
            console.error('[股票采集] 舆情采集失败:', error.message);
            return { collected: [], dropped: [], byStock: {} };
        }
    }

    /**
     * 获取股票今日数据
     */
    getStockData(stockCode) {
        return this.collectedData.get(stockCode) || [];
    }

    /**
     * 获取所有采集数据
     */
    getAllData() {
        const all = [];
        for (const [code, items] of this.collectedData) {
            all.push(...items);
        }
        return all;
    }

    /**
     * 获取采集统计
     */
    getStats() {
        const subscriptions = this.subscriptionManager.getAll();
        const stats = {
            subscriptionCount: subscriptions.length,
            collectedByType: {},
            collectedByStock: {}
        };

        for (const [code, items] of this.collectedData) {
            stats.collectedByStock[code] = items.length;
            for (const item of items) {
                stats.collectedByType[item.type] = (stats.collectedByType[item.type] || 0) + 1;
            }
        }

        return stats;
    }

    /**
     * 清除今日数据
     */
    clearData() {
        this.collectedData.clear();
    }
}

// 单例
let instance = null;

function getStockCollector() {
    if (!instance) {
        instance = new StockCollector();
    }
    return instance;
}

module.exports = {
    StockCollector,
    getStockCollector,
    DATA_TYPES
};
