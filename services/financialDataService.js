/**
 * 财务数据服务
 * 
 * 功能：
 * 1. 获取公司财务指标（真实采集）
 * 2. 财务报表数据
 * 3. 估值分析
 * 
 * 数据源: 新浪财经 (services/scrapers/sinaFinance.js)
 * 更新日期: 2026-01-02
 */

const sinaFinance = require('./scrapers/sinaFinance');

// 缓存过期时间（24小时）
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * 财务数据服务类
 */
class FinancialDataService {
    constructor() {
        this.cache = new Map();  // { stockCode: { data, timestamp } }
    }

    /**
     * 获取真实财务数据（核心方法）
     * 优先从缓存获取，过期则实时采集
     */
    async getRealFinanceData(stockCode) {
        // 检查缓存
        const cached = this.cache.get(stockCode);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            console.log(`[FinancialDataService] 命中缓存: ${stockCode}`);
            return cached.data;
        }

        // 实时采集
        console.log(`[FinancialDataService] 采集真实数据: ${stockCode}`);
        try {
            const data = await sinaFinance.scrapeStockFinance(stockCode);
            if (data.success) {
                // 更新缓存
                this.cache.set(stockCode, { data, timestamp: Date.now() });
                return data;
            }
        } catch (error) {
            console.error(`[FinancialDataService] 采集失败: ${error.message}`);
        }

        // 采集失败返回null
        return null;
    }

    /**
     * 清除缓存
     */
    clearCache(stockCode = null) {
        if (stockCode) {
            this.cache.delete(stockCode);
        } else {
            this.cache.clear();
        }
    }

    /**
     * 获取财务摘要
     * 优先使用真实采集数据，采集失败时fallback到模拟数据
     */
    async getFinancialSummary(stockCode) {
        // 尝试获取真实数据
        const realData = await this.getRealFinanceData(stockCode);

        if (realData && realData.success) {
            // 使用真实数据
            return {
                code: stockCode,
                source: 'sina_finance',
                dataType: 'real',
                url: realData.url,
                crawlTime: realData.crawlTime,
                // 完整财务报表数据
                financialIndicators: realData.financialIndicators,
                balanceSheet: realData.balanceSheet,
                cashFlow: realData.cashFlow,
                incomeStatement: realData.incomeStatement,
                updateTime: new Date().toISOString()
            };
        }

        // Fallback: 使用模拟数据
        console.log(`[FinancialDataService] 使用模拟数据: ${stockCode}`);
        const data = this.getFinancialDB(stockCode);

        return {
            code: stockCode,
            name: data.name,
            // 盈利能力
            profitability: {
                roe: data.roe,
                roa: data.roa,
                grossMargin: data.grossMargin,
                netMargin: data.netMargin
            },
            // 成长能力
            growth: {
                revenueGrowth: data.revenueGrowth,
                profitGrowth: data.profitGrowth,
                epsGrowth: data.epsGrowth
            },
            // 估值指标
            valuation: {
                pe: data.pe,
                pb: data.pb,
                ps: data.ps,
                pcf: data.pcf,
                dividendYield: data.dividendYield
            },
            // 偿债能力
            solvency: {
                debtRatio: data.debtRatio,
                currentRatio: data.currentRatio,
                quickRatio: data.quickRatio
            },
            // 营运能力
            efficiency: {
                inventoryTurnover: data.inventoryTurnover,
                receivablesTurnover: data.receivablesTurnover
            },
            updateTime: new Date().toISOString()
        };
    }

    /**
     * 获取财务报表
     */
    async getFinancialStatements(stockCode, years = 3) {
        const data = this.getFinancialDB(stockCode);

        // 生成多年数据
        const statements = [];
        const currentYear = new Date().getFullYear();

        for (let i = 0; i < years; i++) {
            const year = currentYear - i - 1;
            const growthFactor = Math.pow(1 + data.revenueGrowth / 100, -i);

            statements.push({
                year: year.toString(),
                // 利润表
                income: {
                    revenue: (data.revenue * growthFactor).toFixed(2),
                    grossProfit: (data.revenue * growthFactor * data.grossMargin / 100).toFixed(2),
                    netProfit: (data.revenue * growthFactor * data.netMargin / 100).toFixed(2),
                    eps: (data.eps * growthFactor).toFixed(2)
                },
                // 资产负债表
                balance: {
                    totalAssets: (data.totalAssets * growthFactor).toFixed(2),
                    totalLiabilities: (data.totalAssets * growthFactor * data.debtRatio / 100).toFixed(2),
                    equity: (data.totalAssets * growthFactor * (1 - data.debtRatio / 100)).toFixed(2)
                }
            });
        }

        return {
            code: stockCode,
            name: data.name,
            statements,
            currency: data.currency || 'CNY'
        };
    }

    /**
     * 获取估值分析
     */
    async getValuationAnalysis(stockCode) {
        const data = this.getFinancialDB(stockCode);

        // 估值分位（模拟）
        const pePercentile = Math.floor(Math.random() * 100);
        const pbPercentile = Math.floor(Math.random() * 100);

        return {
            code: stockCode,
            name: data.name,
            current: {
                pe: data.pe,
                pb: data.pb,
                ps: data.ps
            },
            history: {
                pePercentile: pePercentile,
                pbPercentile: pbPercentile,
                peHigh: (data.pe * 1.5).toFixed(1),
                peLow: (data.pe * 0.5).toFixed(1),
                peAvg: data.pe.toFixed(1)
            },
            industry: {
                avgPe: (data.pe * (0.8 + Math.random() * 0.4)).toFixed(1),
                avgPb: (data.pb * (0.8 + Math.random() * 0.4)).toFixed(2)
            },
            assessment: this.getValuationAssessment(pePercentile),
            updateTime: new Date().toISOString()
        };
    }

    /**
     * 估值评估
     */
    getValuationAssessment(percentile) {
        if (percentile < 20) return '估值偏低';
        if (percentile < 40) return '估值较低';
        if (percentile < 60) return '估值适中';
        if (percentile < 80) return '估值较高';
        return '估值偏高';
    }

    /**
     * 财务数据库（模拟）
     */
    getFinancialDB(stockCode) {
        const db = {
            '600519': {
                name: '贵州茅台',
                pe: 35.2, pb: 11.5, ps: 18.5, pcf: 28.5,
                roe: 32.5, roa: 25.2, grossMargin: 91.5, netMargin: 52.8,
                revenueGrowth: 15.2, profitGrowth: 18.5, epsGrowth: 17.8,
                debtRatio: 22.5, currentRatio: 4.2, quickRatio: 3.8,
                inventoryTurnover: 0.35, receivablesTurnover: 28.5,
                dividendYield: 1.2, revenue: 1500, eps: 52.8, totalAssets: 2800,
                currency: 'CNY'
            },
            '000001': {
                name: '平安银行',
                pe: 5.1, pb: 0.6, ps: 1.2, pcf: 2.5,
                roe: 12.5, roa: 0.85, grossMargin: 0, netMargin: 28.5,
                revenueGrowth: 8.5, profitGrowth: 12.2, epsGrowth: 10.5,
                debtRatio: 92.5, currentRatio: 0, quickRatio: 0,
                inventoryTurnover: 0, receivablesTurnover: 0,
                dividendYield: 5.2, revenue: 1800, eps: 2.15, totalAssets: 55000,
                currency: 'CNY'
            },
            '00700': {
                name: '腾讯控股',
                pe: 18.5, pb: 3.2, ps: 5.8, pcf: 12.5,
                roe: 18.2, roa: 8.5, grossMargin: 45.2, netMargin: 28.5,
                revenueGrowth: 12.5, profitGrowth: 25.8, epsGrowth: 22.5,
                debtRatio: 42.5, currentRatio: 1.8, quickRatio: 1.5,
                inventoryTurnover: 25.5, receivablesTurnover: 12.5,
                dividendYield: 0.8, revenue: 6000, eps: 18.5, totalAssets: 18000,
                currency: 'HKD'
            }
        };

        return db[stockCode] || {
            name: `股票${stockCode}`,
            pe: 15, pb: 1.5, ps: 2.0, pcf: 8,
            roe: 12, roa: 6, grossMargin: 30, netMargin: 10,
            revenueGrowth: 10, profitGrowth: 12, epsGrowth: 11,
            debtRatio: 45, currentRatio: 1.5, quickRatio: 1.2,
            inventoryTurnover: 5, receivablesTurnover: 8,
            dividendYield: 2, revenue: 100, eps: 1, totalAssets: 500,
            currency: 'CNY'
        };
    }
}

// 单例
let instance = null;

function getFinancialDataService() {
    if (!instance) {
        instance = new FinancialDataService();
    }
    return instance;
}

module.exports = {
    FinancialDataService,
    getFinancialDataService
};
