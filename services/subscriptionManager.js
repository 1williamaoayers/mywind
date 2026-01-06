/**
 * 股票订阅管理器
 * 
 * 功能：
 * 1. 股票订阅的增删改查
 * 2. 订阅数据持久化
 * 3. 关键词自动生成
 * 4. 订阅统计
 */

const fs = require('fs');
const path = require('path');
const { generateKeywords } = require('../utils/stockKeywords');

// 存储路径
const DATA_DIR = path.join(__dirname, '../data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 股票订阅管理器类
 */
class SubscriptionManager {
    constructor() {
        this.subscriptions = new Map();
        this.keywordIndex = new Map();
        this.load();
    }

    /**
     * 加载订阅数据
     */
    load() {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
                for (const sub of data) {
                    this.subscriptions.set(sub.stockCode, sub);
                }
                this.rebuildKeywordIndex();
                console.log(`[订阅管理] 已加载 ${this.subscriptions.size} 个订阅`);
            } catch (e) {
                console.error('[订阅管理] 加载订阅失败:', e.message);
            }
        }
    }

    /**
     * 保存订阅数据
     */
    save() {
        const data = Array.from(this.subscriptions.values());
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
    }

    /**
     * 重建关键词索引
     */
    rebuildKeywordIndex() {
        this.keywordIndex.clear();

        for (const [code, sub] of this.subscriptions) {
            for (const keyword of sub.keywords) {
                if (!this.keywordIndex.has(keyword)) {
                    this.keywordIndex.set(keyword, new Set());
                }
                this.keywordIndex.get(keyword).add(code);
            }
        }
    }

    /**
     * 添加订阅
     */
    add(stockInfo) {
        const {
            stockCode,
            stockName,
            market = 'SH',
            priority = 'normal',
            options = {}
        } = stockInfo;

        if (!stockCode || !stockName) {
            throw new Error('股票代码和名称不能为空');
        }

        // 生成关键词
        const keywords = generateKeywords(stockInfo);

        const subscription = {
            stockCode,
            stockName,
            market,
            priority,
            keywords,
            options: {
                news: options.news !== false,
                reports: true,      // 研报必须采集
                financials: true,   // 财报必须采集
                announcements: true, // 公告必须采集
                sentiment: options.sentiment !== false,
                flow: options.flow !== false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.subscriptions.set(stockCode, subscription);
        this.rebuildKeywordIndex();
        this.save();

        console.log(`[订阅管理] 添加订阅: ${stockCode} ${stockName}`);
        return subscription;
    }

    /**
     * 删除订阅
     */
    remove(stockCode) {
        if (this.subscriptions.has(stockCode)) {
            this.subscriptions.delete(stockCode);
            this.rebuildKeywordIndex();
            this.save();
            console.log(`[订阅管理] 删除订阅: ${stockCode}`);
            return true;
        }
        return false;
    }

    /**
     * 更新订阅
     */
    update(stockCode, updates) {
        const existing = this.subscriptions.get(stockCode);
        if (!existing) {
            throw new Error(`订阅不存在: ${stockCode}`);
        }

        const updated = {
            ...existing,
            ...updates,
            stockCode: existing.stockCode, // 不允许修改代码
            updatedAt: new Date().toISOString()
        };

        // 如果名称变了，重新生成关键词
        if (updates.stockName && updates.stockName !== existing.stockName) {
            updated.keywords = generateKeywords(updated);
        }

        this.subscriptions.set(stockCode, updated);
        this.rebuildKeywordIndex();
        this.save();

        return updated;
    }

    /**
     * 获取单个订阅
     */
    get(stockCode) {
        return this.subscriptions.get(stockCode);
    }

    /**
     * 获取所有订阅
     */
    getAll() {
        return Array.from(this.subscriptions.values());
    }

    /**
     * 按优先级获取订阅
     */
    getByPriority(priority) {
        return this.getAll().filter(sub => sub.priority === priority);
    }

    /**
     * 检查文本是否与订阅相关
     */
    matchText(text) {
        if (!text) return { matched: false, stocks: [] };

        const matchedStocks = new Set();

        for (const [keyword, stocks] of this.keywordIndex) {
            if (text.includes(keyword)) {
                for (const stock of stocks) {
                    matchedStocks.add(stock);
                }
            }
        }

        return {
            matched: matchedStocks.size > 0,
            stocks: Array.from(matchedStocks)
        };
    }

    /**
     * 获取所有关键词
     */
    getAllKeywords() {
        return Array.from(this.keywordIndex.keys());
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const all = this.getAll();
        return {
            total: all.length,
            byMarket: {
                SH: all.filter(s => s.market === 'SH').length,
                SZ: all.filter(s => s.market === 'SZ').length,
                HK: all.filter(s => s.market === 'HK').length,
                US: all.filter(s => s.market === 'US').length
            },
            byPriority: {
                high: all.filter(s => s.priority === 'high').length,
                normal: all.filter(s => s.priority === 'normal').length,
                low: all.filter(s => s.priority === 'low').length
            },
            keywordCount: this.keywordIndex.size
        };
    }

    /**
     * 批量添加订阅
     */
    addBatch(stockList) {
        const results = [];
        for (const stock of stockList) {
            try {
                const sub = this.add(stock);
                results.push({ success: true, stockCode: stock.stockCode });
            } catch (e) {
                results.push({ success: false, stockCode: stock.stockCode, error: e.message });
            }
        }
        return results;
    }

    /**
     * 导出订阅
     */
    export() {
        return {
            exportTime: new Date().toISOString(),
            count: this.subscriptions.size,
            subscriptions: this.getAll()
        };
    }

    /**
     * 导入订阅
     */
    import(data, merge = true) {
        if (!merge) {
            this.subscriptions.clear();
        }

        let imported = 0;
        for (const sub of data.subscriptions || data) {
            try {
                this.add(sub);
                imported++;
            } catch (e) {
                console.error(`[订阅管理] 导入失败: ${sub.stockCode}`, e.message);
            }
        }

        return { imported };
    }
}

// 单例模式
let instance = null;

function getSubscriptionManager() {
    if (!instance) {
        instance = new SubscriptionManager();
    }
    return instance;
}

module.exports = {
    SubscriptionManager,
    getSubscriptionManager
};
