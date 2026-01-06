/**
 * 行情数据服务
 * 
 * 功能：
 * 1. 获取股票实时行情
 * 2. 获取指数行情
 * 3. 缓存管理
 */

/**
 * 行情数据服务类
 */
class MarketDataService {
    constructor() {
        // 缓存
        this.cache = new Map();
        this.cacheExpiry = 60 * 1000; // 1分钟过期

        // 模拟更新定时器
        this.lastUpdate = Date.now();
    }

    /**
     * 获取指数行情
     */
    async getIndexQuotes() {
        const cacheKey = 'indices';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        // 模拟实时数据（实际项目中接入真实行情API）
        const data = this.generateIndexData();
        this.setCache(cacheKey, data);

        return data;
    }

    /**
     * 获取股票行情
     */
    async getStockQuote(stockCode) {
        const cacheKey = `stock_${stockCode}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = this.generateStockData(stockCode);
        this.setCache(cacheKey, data);

        return data;
    }

    /**
     * 批量获取股票行情
     */
    async getStockQuotes(stockCodes) {
        const results = {};
        for (const code of stockCodes) {
            results[code] = await this.getStockQuote(code);
        }
        return results;
    }

    /**
     * 获取板块行情
     */
    async getSectorQuotes() {
        const cacheKey = 'sectors';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = this.generateSectorData();
        this.setCache(cacheKey, data);

        return data;
    }

    /**
     * 生成指数数据（模拟）
     */
    generateIndexData() {
        const baseData = {
            'sh000001': { name: '上证指数', price: 3265.48, prevClose: 3248.12 },
            'sz399001': { name: '深证成指', price: 10158.32, prevClose: 10120.56 },
            'sz399006': { name: '创业板指', price: 2048.56, prevClose: 2035.28 },
            'hk_hsi': { name: '恒生指数', price: 20123.45, prevClose: 20180.32 },
            'us_ixic': { name: '纳斯达克', price: 16825.93, prevClose: 16655.20 },
        };

        // 添加波动
        const result = {};
        for (const [code, data] of Object.entries(baseData)) {
            const fluctuation = (Math.random() - 0.5) * 0.01;
            const price = data.price * (1 + fluctuation);
            const change = price - data.prevClose;
            const changePercent = (change / data.prevClose) * 100;

            result[code] = {
                code,
                name: data.name,
                price: price.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent.toFixed(2),
                prevClose: data.prevClose.toFixed(2),
                updateTime: new Date().toLocaleTimeString('zh-CN')
            };
        }

        return result;
    }

    /**
     * 生成股票数据（模拟）
     */
    generateStockData(stockCode) {
        const stockDB = {
            '600519': { name: '贵州茅台', price: 1856.00, pe: 35.2, pb: 11.5, industry: '白酒' },
            '000001': { name: '平安银行', price: 12.35, pe: 5.1, pb: 0.6, industry: '银行' },
            '00700': { name: '腾讯控股', price: 378.60, pe: 18.5, pb: 3.2, industry: '互联网' },
            '300750': { name: '宁德时代', price: 185.50, pe: 28.5, pb: 6.8, industry: '新能源' },
            '002594': { name: '比亚迪', price: 268.00, pe: 22.3, pb: 5.2, industry: '新能源汽车' },
            '601398': { name: '工商银行', price: 5.28, pe: 4.8, pb: 0.5, industry: '银行' },
            '600036': { name: '招商银行', price: 35.60, pe: 6.2, pb: 0.9, industry: '银行' },
            '000858': { name: '五粮液', price: 142.50, pe: 22.8, pb: 5.2, industry: '白酒' },
        };

        const base = stockDB[stockCode] || {
            name: `股票${stockCode}`,
            price: 50 + Math.random() * 100,
            pe: 15 + Math.random() * 20,
            pb: 1 + Math.random() * 5,
            industry: '其他'
        };

        // 添加波动
        const fluctuation = (Math.random() - 0.5) * 0.02;
        const price = base.price * (1 + fluctuation);
        const prevClose = base.price * (1 - fluctuation * 0.5);
        const change = price - prevClose;
        const changePercent = (change / prevClose) * 100;

        return {
            code: stockCode,
            name: base.name,
            price: price.toFixed(2),
            change: change.toFixed(2),
            changePercent: changePercent.toFixed(2),
            prevClose: prevClose.toFixed(2),
            open: (prevClose * (1 + Math.random() * 0.01)).toFixed(2),
            high: (price * (1 + Math.random() * 0.01)).toFixed(2),
            low: (price * (1 - Math.random() * 0.01)).toFixed(2),
            volume: Math.floor(Math.random() * 10000000),
            amount: (Math.random() * 50).toFixed(2) + '亿',
            pe: base.pe.toFixed(1),
            pb: base.pb.toFixed(2),
            industry: base.industry,
            updateTime: new Date().toLocaleTimeString('zh-CN')
        };
    }

    /**
     * 生成板块数据（模拟）
     */
    generateSectorData() {
        const sectors = [
            { name: '白酒', change: 2.15 },
            { name: '新能源', change: 1.25 },
            { name: '银行', change: 0.45 },
            { name: '半导体', change: -0.32 },
            { name: '医药', change: 0.88 },
            { name: '房地产', change: -1.25 },
            { name: '消费', change: 1.05 },
            { name: '科技', change: 0.68 }
        ];

        return sectors.map(s => ({
            name: s.name,
            change: (s.change + (Math.random() - 0.5) * 0.5).toFixed(2),
            updateTime: new Date().toLocaleTimeString('zh-CN')
        })).sort((a, b) => b.change - a.change);
    }

    // ==================== 缓存管理 ====================

    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.time > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    setCache(key, data) {
        this.cache.set(key, { data, time: Date.now() });
    }

    clearCache() {
        this.cache.clear();
    }
}

// 单例
let instance = null;

function getMarketDataService() {
    if (!instance) {
        instance = new MarketDataService();
    }
    return instance;
}

module.exports = {
    MarketDataService,
    getMarketDataService
};
