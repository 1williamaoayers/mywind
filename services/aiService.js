/**
 * AI服务模块
 * 
 * 功能：
 * 1. 智能问答
 * 2. 股票分析
 * 3. 研报摘要
 * 4. 数据整合
 */

const { getSubscriptionManager } = require('./subscriptionManager');
const deepseek = require('./deepseekService');

// 是否使用真实AI（DeepSeek）
const USE_REAL_AI = true;

/**
 * AI服务类
 */
class AIService {
    constructor() {
        this.subscriptionManager = getSubscriptionManager();
        // 知识库缓存
        this.knowledgeCache = new Map();
    }

    /**
     * 处理用户消息
     */
    async chat(message, context = {}) {
        const lowerMsg = message.toLowerCase();

        // 意图识别
        const intent = this.detectIntent(message);

        let response;

        switch (intent.type) {
            case 'stock_analysis':
                response = await this.analyzeStock(intent.stock, message);
                break;
            case 'sector_analysis':
                response = await this.analyzeSector(intent.sector, message);
                break;
            case 'market_overview':
                response = await this.getMarketOverview();
                break;
            case 'northbound_flow':
                response = await this.getNorthboundFlow();
                break;
            case 'portfolio_diagnosis':
                response = await this.diagnosePortfolio(context.portfolio);
                break;
            default:
                response = await this.generalChat(message);
        }

        return {
            intent: intent.type,
            response,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 意图识别
     */
    detectIntent(message) {
        // 股票名称/代码匹配
        const stockPatterns = [
            { name: '茅台', code: '600519', keywords: ['茅台', '600519'] },
            { name: '平安银行', code: '000001', keywords: ['平安银行', '000001'] },
            { name: '腾讯', code: '00700', keywords: ['腾讯', '00700'] },
            { name: '宁德时代', code: '300750', keywords: ['宁德时代', '300750'] },
            { name: '比亚迪', code: '002594', keywords: ['比亚迪', '002594'] },
        ];

        for (const stock of stockPatterns) {
            for (const kw of stock.keywords) {
                if (message.includes(kw)) {
                    return { type: 'stock_analysis', stock };
                }
            }
        }

        // 板块分析
        const sectors = ['新能源', '白酒', '银行', '半导体', '医药', '光伏', '锂电池'];
        for (const sector of sectors) {
            if (message.includes(sector)) {
                return { type: 'sector_analysis', sector };
            }
        }

        // 市场概览
        if (message.includes('大盘') || message.includes('市场') || message.includes('今天')) {
            return { type: 'market_overview' };
        }

        // 北水
        if (message.includes('北水') || message.includes('港股通') || message.includes('资金')) {
            return { type: 'northbound_flow' };
        }

        // 持仓诊断
        if (message.includes('持仓') || message.includes('组合') || message.includes('诊断')) {
            return { type: 'portfolio_diagnosis' };
        }

        return { type: 'general' };
    }

    /**
     * 股票分析
     */
    async analyzeStock(stock, question) {
        const analysis = {
            basic: this.getStockBasicInfo(stock),
            news: await this.getStockNews(stock),
            technicals: this.getStockTechnicals(stock),
            sentiment: this.getStockSentiment(stock)
        };

        let response = `## ${stock.name}（${stock.code}）分析\n\n`;

        // 基本信息
        response += `### 📊 基本面\n`;
        response += `- **行业**: ${analysis.basic.industry}\n`;
        response += `- **市值**: ${analysis.basic.marketCap}\n`;
        response += `- **PE(TTM)**: ${analysis.basic.pe}\n`;
        response += `- **PB**: ${analysis.basic.pb}\n\n`;

        // 最新资讯
        response += `### 📰 近期资讯\n`;
        analysis.news.forEach((n, i) => {
            response += `${i + 1}. ${n.important ? '**[重要]** ' : ''}${n.title}\n`;
        });
        response += '\n';

        // 技术面
        response += `### 📈 技术面\n`;
        response += `- **趋势**: ${analysis.technicals.trend}\n`;
        response += `- **支撑位**: ${analysis.technicals.support}\n`;
        response += `- **压力位**: ${analysis.technicals.resistance}\n\n`;

        // 情绪
        response += `### 💡 综合评估\n`;
        response += `${analysis.sentiment.summary}\n`;

        return response;
    }

    /**
     * 板块分析
     */
    async analyzeSector(sector, question) {
        const sectorData = this.getSectorData(sector);

        let response = `## ${sector}板块分析\n\n`;

        response += `### 📊 板块概况\n`;
        response += `- **今日涨跌**: ${sectorData.change}\n`;
        response += `- **成交额**: ${sectorData.volume}\n`;
        response += `- **领涨个股**: ${sectorData.leaders.join('、')}\n\n`;

        response += `### 📰 近期动态\n`;
        sectorData.news.forEach((n, i) => {
            response += `${i + 1}. ${n}\n`;
        });
        response += '\n';

        response += `### 💡 观点\n`;
        response += `${sectorData.opinion}\n`;

        return response;
    }

    /**
     * 市场概览
     */
    async getMarketOverview() {
        let response = `## 今日市场概览\n\n`;

        response += `### 📊 主要指数\n`;
        response += `| 指数 | 收盘价 | 涨跌幅 |\n`;
        response += `|------|--------|--------|\n`;
        response += `| 上证指数 | 3,265.48 | +0.52% |\n`;
        response += `| 深证成指 | 10,158.32 | +0.38% |\n`;
        response += `| 创业板指 | 2,048.56 | +0.65% |\n`;
        response += `| 恒生指数 | 20,123.45 | -0.15% |\n\n`;

        response += `### 🔥 今日热点\n`;
        response += `1. 白酒板块领涨，茅台创新高\n`;
        response += `2. 新能源汽车销量数据超预期\n`;
        response += `3. 北水持续净流入\n\n`;

        response += `### 💰 资金流向\n`;
        response += `- 北水净流入: +9.0亿\n`;
        response += `- 主力净流入: +15.2亿\n`;

        return response;
    }

    /**
     * 北水动向
     */
    async getNorthboundFlow() {
        let response = `## 北向资金动向\n\n`;

        response += `### 📊 今日数据\n`;
        response += `| 通道 | 净买入 |\n`;
        response += `|------|--------|\n`;
        response += `| 沪股通 | +5.2亿 |\n`;
        response += `| 深股通 | +3.8亿 |\n`;
        response += `| **合计** | **+9.0亿** |\n\n`;

        response += `### 📈 本周累计\n`;
        response += `累计净买入: +42.5亿\n\n`;

        response += `### 🏆 增持前五\n`;
        response += `1. 贵州茅台 +2.3亿\n`;
        response += `2. 宁德时代 +1.8亿\n`;
        response += `3. 招商银行 +1.2亿\n`;
        response += `4. 比亚迪 +0.9亿\n`;
        response += `5. 中国平安 +0.7亿\n`;

        return response;
    }

    /**
     * 持仓诊断
     */
    async diagnosePortfolio(portfolio) {
        // 使用订阅作为持仓
        const holdings = this.subscriptionManager.getAll();

        if (holdings.length === 0) {
            return `您还没有添加任何订阅股票。请先在"我的订阅"页面添加您关注的股票，我才能帮您做持仓诊断。`;
        }

        let response = `## 持仓诊断报告\n\n`;

        response += `### 📊 持仓概况\n`;
        response += `共 ${holdings.length} 只股票\n\n`;

        holdings.forEach(h => {
            response += `- **${h.stockName}**（${h.stockCode}）\n`;
        });
        response += '\n';

        response += `### ✅ 优点\n`;
        response += `- 持仓分散度良好\n`;
        response += `- 包含多个市场配置\n\n`;

        response += `### ⚠️ 风险提示\n`;
        response += `- 建议关注个股集中度\n`;
        response += `- 定期检查持仓平衡\n\n`;

        response += `### 💡 建议\n`;
        response += `继续关注持仓股票的最新资讯和研报更新。`;

        return response;
    }

    /**
     * 通用对话 - 使用DeepSeek
     */
    async generalChat(message) {
        if (USE_REAL_AI) {
            try {
                const result = await deepseek.investmentChat(message, {
                    stockData: this.subscriptionManager.getAll()
                });

                if (result.success) {
                    return result.content;
                }
            } catch (e) {
                console.error('[AI服务] DeepSeek调用失败:', e.message);
            }
        }

        // 回退到本地回复
        return `收到您的问题。\n\n您可以试试问我：\n- "茅台最近有什么利好？"\n- "分析一下新能源板块"\n- "今天北水动向如何？"\n- "帮我诊断持仓"\n\n我会尽力为您提供投资参考信息。`;
    }

    // ==================== 辅助方法 ====================

    getStockBasicInfo(stock) {
        const data = {
            '600519': { industry: '白酒', marketCap: '2.3万亿', pe: 35.2, pb: 11.5 },
            '000001': { industry: '银行', marketCap: '2400亿', pe: 5.1, pb: 0.6 },
            '00700': { industry: '互联网', marketCap: '3.5万亿港元', pe: 18.5, pb: 3.2 },
        };
        return data[stock.code] || { industry: '--', marketCap: '--', pe: '--', pb: '--' };
    }

    async getStockNews(stock) {
        const newsData = {
            '600519': [
                { title: '茅台2024年业绩预告超预期，净利润增长15%', important: true },
                { title: '北水连续5日净买入茅台，累计增持2.3亿', important: true },
                { title: '中信证券上调茅台目标价至2200元', important: false },
            ],
            '000001': [
                { title: '平安银行三季报净利润同比增长8%', important: true },
                { title: '银行板块估值处于历史低位', important: false },
            ],
        };
        return newsData[stock.code] || [{ title: '暂无最新资讯', important: false }];
    }

    getStockTechnicals(stock) {
        const data = {
            '600519': { trend: '上涨趋势', support: '1800元', resistance: '1900元' },
            '000001': { trend: '震荡整理', support: '11.5元', resistance: '13元' },
        };
        return data[stock.code] || { trend: '--', support: '--', resistance: '--' };
    }

    getStockSentiment(stock) {
        const data = {
            '600519': { summary: '短期情绪偏正面，机构持续看好。建议关注业绩兑现情况。📈' },
            '000001': { summary: '估值处于历史低位，具备配置价值。中长期可逐步布局。' },
        };
        return data[stock.code] || { summary: '暂无评估数据。' };
    }

    getSectorData(sector) {
        const data = {
            '新能源': {
                change: '+1.25%', volume: '850亿',
                leaders: ['宁德时代', '比亚迪', '隆基绿能'],
                news: ['碳酸锂价格企稳', '新能源汽车12月销量创新高', '储能需求持续增长'],
                opinion: '短期震荡整理，中长期受益于碳中和政策，看好龙头公司。'
            },
            '白酒': {
                change: '+2.15%', volume: '320亿',
                leaders: ['贵州茅台', '五粮液', '泸州老窖'],
                news: ['茅台业绩预告超预期', '春节备货需求旺盛', '高端白酒价格坚挺'],
                opinion: '板块估值回归合理区间，龙头公司业绩确定性高。'
            },
            '银行': {
                change: '+0.45%', volume: '180亿',
                leaders: ['招商银行', '工商银行', '建设银行'],
                news: ['LPR保持不变', '银行资产质量持续改善', '高股息策略受关注'],
                opinion: '估值处于历史低位，高股息具备配置价值。'
            },
        };
        return data[sector] || {
            change: '--', volume: '--', leaders: [], news: [], opinion: '暂无分析数据'
        };
    }
}

// 单例
let instance = null;

function getAIService() {
    if (!instance) {
        instance = new AIService();
    }
    return instance;
}

module.exports = {
    AIService,
    getAIService
};
