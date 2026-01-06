/**
 * 数据过滤模块
 * 
 * 功能：
 * 1. 关键词白名单/黑名单过滤
 * 2. 来源优先级过滤
 * 3. 去重检测
 * 4. 数据评分
 */

const crypto = require('crypto');

// ==================== 关键词配置 ====================

const WHITELIST = {
    // A股相关
    aStock: ['A股', '沪深', '上证', '深证', '创业板', '科创板', '北交所', '沪指', '深成指'],
    // 港股相关
    hkStock: ['港股', '恒生', '恒指', '港交所', '港股通', '北水', '南水', '中概股'],
    // 美股相关
    usStock: ['美股', '纳斯达克', '纳指', '标普', '道琼斯', '美联储', 'Fed'],
    // 宏观经济
    macro: ['央行', 'GDP', 'CPI', 'PPI', 'PMI', '利率', '降息', '加息', '货币政策',
        'MLF', 'LPR', '逆回购', '存款准备金'],
    // 行业热点
    sector: ['新能源', '芯片', '半导体', 'AI', '人工智能', '机器人', '医药', '光伏',
        '锂电池', '汽车', '消费', '白酒', '银行', '保险', '券商'],
    // 公司公告
    company: ['业绩', '财报', '分红', '增持', '减持', '回购', '并购', '重组',
        '定增', 'IPO', '股权激励', '解禁']
};

const BLACKLIST = [
    // 无关内容
    '娱乐', '明星', '八卦', '综艺', '游戏', '电竞', '网红', '直播带货',
    // 广告内容
    '限时优惠', '立即购买', '点击领取', 'APP下载', '免费领', '扫码',
    // 低质量内容
    '震惊', '速看', '必看', '转发', '点赞', '在看', '求转发',
    // 其他无关
    '天气', '美食', '旅游', '健身', '减肥'
];

// ==================== 来源优先级 ====================

const SOURCE_PRIORITY = {
    // P0 核心 - 全量采集
    jin10: 'P0',
    ths: 'P0',
    northbound: 'P0',

    // P1 重要 - 关键词过滤
    yicai: 'P1',
    stcn: 'P1',
    futu: 'P1',
    aastocks: 'P1',
    eastmoney_report: 'P1',

    // P2 补充 - 严格过滤
    gelonghui: 'P2',
    jiemian: 'P2',
    kr36: 'P2',
    hkej: 'P2',
    hket: 'P2',

    // P3 辅助 - 仅热搜/精选
    weibo_hot: 'P3',
    wechat: 'P3',
    zhihu: 'P3'
};

// ==================== 数据类型配置 ====================

const DATA_TYPE_CONFIG = {
    flash: {      // 快讯
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7天
        maxItems: 20
    },
    news: {       // 新闻
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
        maxItems: 10
    },
    report: {     // 研报
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90天
        maxItems: 5
    },
    announcement: { // 公告
        maxAge: 365 * 24 * 60 * 60 * 1000, // 365天
        maxItems: 10
    },
    flow: {       // 资金流向
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
        maxItems: 10
    }
};

// ==================== 过滤类 ====================

class DataFilter {
    constructor(options = {}) {
        this.whitelist = options.whitelist || WHITELIST;
        this.blacklist = options.blacklist || BLACKLIST;
        this.sourcePriority = options.sourcePriority || SOURCE_PRIORITY;
        this.dedupeCache = new Map();
        this.dedupeCacheMaxSize = options.dedupeCacheMaxSize || 10000;
        this.dedupeWindow = options.dedupeWindow || 24 * 60 * 60 * 1000; // 24小时
    }

    /**
     * 检查是否匹配白名单
     */
    matchWhitelist(text) {
        if (!text) return false;

        for (const category of Object.values(this.whitelist)) {
            for (const keyword of category) {
                if (text.includes(keyword)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 检查是否匹配黑名单
     */
    matchBlacklist(text) {
        if (!text) return false;

        for (const keyword of this.blacklist) {
            if (text.includes(keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 生成内容哈希（用于去重）
     */
    generateHash(item) {
        const text = item.title || item.content || '';
        // 移除空格和标点，取前50个字符
        const normalized = text.replace(/[\s\p{P}]/gu, '').substring(0, 50);
        return crypto.createHash('md5').update(normalized).digest('hex');
    }

    /**
     * 检查是否重复
     */
    isDuplicate(item) {
        const hash = this.generateHash(item);
        const now = Date.now();

        // 清理过期缓存
        if (this.dedupeCache.size > this.dedupeCacheMaxSize) {
            this.cleanDedupeCache();
        }

        // 检查是否存在
        const existing = this.dedupeCache.get(hash);
        if (existing && (now - existing.time) < this.dedupeWindow) {
            return true;
        }

        // 记录新项
        this.dedupeCache.set(hash, { time: now, source: item.source });
        return false;
    }

    /**
     * 清理过期缓存
     */
    cleanDedupeCache() {
        const now = Date.now();
        for (const [hash, data] of this.dedupeCache.entries()) {
            if (now - data.time > this.dedupeWindow) {
                this.dedupeCache.delete(hash);
            }
        }
    }

    /**
     * 计算内容评分
     */
    calculateScore(item) {
        let score = 50; // 基础分
        const text = item.title || '';

        // 白名单关键词加分
        for (const [category, keywords] of Object.entries(this.whitelist)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    score += 5;
                }
            }
        }

        // 来源优先级加分
        const priority = this.sourcePriority[item.source];
        if (priority === 'P0') score += 20;
        else if (priority === 'P1') score += 10;
        else if (priority === 'P2') score += 5;

        // 标题长度合适加分
        if (text.length >= 15 && text.length <= 50) {
            score += 5;
        }

        return Math.min(100, score);
    }

    /**
     * 主过滤方法
     * 修复版本：P0来源也需要检查订阅匹配
     */
    filter(item, subscriptionManager = null) {
        const result = {
            keep: true,
            reason: '',
            score: 0,
            relatedStocks: []
        };

        const text = item.title || item.content || '';
        const source = item.source || 'unknown';
        const priority = this.sourcePriority[source] || 'P2';

        // 1. 黑名单检查（所有来源都要检查）
        if (this.matchBlacklist(text)) {
            result.keep = false;
            result.reason = 'blacklist';
            return result;
        }

        // 2. 订阅股票匹配检查（核心逻辑）
        let stockMatch = { matched: false, stocks: [] };
        if (subscriptionManager) {
            stockMatch = subscriptionManager.matchText(text);
            result.relatedStocks = stockMatch.stocks;
        }

        // 3. 根据来源优先级和订阅匹配结果决定是否入库
        if (stockMatch.matched) {
            // 匹配订阅股票 → 高分入库
            result.score = 100;
            result.reason = 'subscription_match';
            return result;
        }

        if (priority === 'P0') {
            // P0来源未匹配订阅，检查白名单
            if (this.matchWhitelist(text)) {
                // 匹配白名单 → 降分入库
                result.score = this.calculateScore(item) - 20;
                result.reason = 'p0_whitelist';
            } else {
                // P0来源也不匹配白名单 → 不入库
                result.keep = false;
                result.reason = 'p0_not_relevant';
                return result;
            }
        } else if (priority === 'P1') {
            // P1来源未匹配订阅，检查白名单
            if (this.matchWhitelist(text)) {
                result.score = this.calculateScore(item) - 30;
                result.reason = 'p1_whitelist';
            } else {
                result.keep = false;
                result.reason = 'not_relevant';
                return result;
            }
        } else {
            // P2/P3来源必须匹配白名单
            if (!this.matchWhitelist(text)) {
                result.keep = false;
                result.reason = 'not_relevant';
                return result;
            }
            result.score = this.calculateScore(item);
        }

        // 4. 去重检查
        if (this.isDuplicate(item)) {
            result.keep = false;
            result.reason = 'duplicate';
            return result;
        }

        // 5. 计算最终评分（如果还没设置）
        if (result.score === 0) {
            result.score = this.calculateScore(item);
        }

        return result;
    }

    /**
     * 批量过滤
     */
    filterBatch(items) {
        const results = items.map(item => ({
            item,
            ...this.filter(item)
        }));

        // 按评分排序
        results.sort((a, b) => b.score - a.score);

        return {
            kept: results.filter(r => r.keep),
            dropped: results.filter(r => !r.keep),
            stats: {
                total: items.length,
                kept: results.filter(r => r.keep).length,
                dropped: results.filter(r => !r.keep).length,
                dropReasons: this.countDropReasons(results.filter(r => !r.keep))
            }
        };
    }

    /**
     * 统计丢弃原因
     */
    countDropReasons(dropped) {
        const counts = {};
        for (const item of dropped) {
            counts[item.reason] = (counts[item.reason] || 0) + 1;
        }
        return counts;
    }
}

// ==================== 导出 ====================

module.exports = {
    DataFilter,
    WHITELIST,
    BLACKLIST,
    SOURCE_PRIORITY,
    DATA_TYPE_CONFIG
};
