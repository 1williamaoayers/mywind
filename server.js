/**
 * MyWind API 服务器
 * 
 * 提供RESTful API和静态文件服务
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

// 连接MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/private_wind';
mongoose.connect(MONGO_URI)
    .then(() => console.log('[MongoDB] 连接成功:', MONGO_URI))
    .catch(err => console.error('[MongoDB] 连接失败:', err.message));

// 服务模块
const { getSubscriptionManager } = require('./services/subscriptionManager');
const { getReportGenerator } = require('./services/reportGenerator');
const { getStockCollector } = require('./services/stockCollector');
const { initScheduler, getTaskStatus, triggerTask } = require('./services/schedulerService');
const { checkVectorService, getIndexStats, searchVector } = require('./services/vectorIndexService');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'web')));

// ==================== API路由 ====================

// 公告API
const announcementsRouter = require('./routes/announcements');
app.use('/api/v1/announcements', announcementsRouter);

// 用户服务
const { getUserService, authMiddleware, optionalAuthMiddleware } = require('./services/userService');

// 用户注册
app.post('/api/v1/auth/register', (req, res) => {
    try {
        const userService = getUserService();
        const { username, password, email, nickname } = req.body;
        const user = userService.register({ username, password, email, nickname });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, error: { message: error.message } });
    }
});

// 用户登录
app.post('/api/v1/auth/login', (req, res) => {
    try {
        const userService = getUserService();
        const { username, password } = req.body;
        const result = userService.login(username, password);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(401).json({ success: false, error: { message: error.message } });
    }
});

// 用户登出
app.post('/api/v1/auth/logout', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const userService = getUserService();
        userService.logout(token);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 获取当前用户信息
app.get('/api/v1/auth/me', authMiddleware, (req, res) => {
    res.json({ success: true, data: req.user });
});

// ==================== 行情数据API ====================
const { getMarketDataService } = require('./services/marketDataService');
const { getFinancialDataService } = require('./services/financialDataService');

// 获取指数行情
app.get('/api/v1/market/indices', async (req, res) => {
    try {
        const service = getMarketDataService();
        const data = await service.getIndexQuotes();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 获取股票行情
app.get('/api/v1/market/quote/:code', async (req, res) => {
    try {
        const service = getMarketDataService();
        const data = await service.getStockQuote(req.params.code);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 获取板块行情
app.get('/api/v1/market/sectors', async (req, res) => {
    try {
        const service = getMarketDataService();
        const data = await service.getSectorQuotes();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 获取财务摘要
app.get('/api/v1/financial/:code/summary', async (req, res) => {
    try {
        const service = getFinancialDataService();
        const data = await service.getFinancialSummary(req.params.code);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 获取估值分析
app.get('/api/v1/financial/:code/valuation', async (req, res) => {
    try {
        const service = getFinancialDataService();
        const data = await service.getValuationAnalysis(req.params.code);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 订阅API
app.get('/api/v1/subscriptions', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        res.json({
            success: true,
            data: manager.getAll(),
            meta: manager.getStats()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

app.post('/api/v1/subscriptions', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const subscription = manager.add(req.body);
        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

app.delete('/api/v1/subscriptions/:code', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const removed = manager.remove(req.params.code);
        res.json({ success: removed });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 股票数据API
app.get('/api/v1/stocks/:code/news', (req, res) => {
    try {
        const collector = getStockCollector();
        const data = collector.getStockData(req.params.code);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 报告API
app.get('/api/v1/reports/daily', (req, res) => {
    try {
        const generator = getReportGenerator();
        const reports = generator.getRecentReports(7);

        if (req.query.date) {
            const filename = `daily_${req.query.date.replace(/-/g, '')}.md`;
            const content = generator.readReport(filename);
            if (content) {
                res.json({ success: true, data: { date: req.query.date, content } });
            } else {
                res.status(404).json({ success: false, error: { message: '报告不存在' } });
            }
        } else {
            res.json({ success: true, data: reports });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

app.post('/api/v1/reports/generate', (req, res) => {
    try {
        const generator = getReportGenerator();
        const result = generator.generateDailyReport({
            market: { sh: '3265(+0.5%)', sz: '10158(+0.3%)' },
            byStock: {},
            reports: [],
            flow: { hk2sh: '+5.2', total: '+9.0' }
        });
        res.json({ success: true, data: { path: result.filepath, date: result.date } });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 系统状态API（扩展版）
app.get('/api/v1/status', async (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const collector = getStockCollector();

        // 模拟数据（实际项目中从数据库获取）
        const newsCount = Math.floor(Math.random() * 500) + 100;
        const lastCrawlTime = new Date(Date.now() - Math.floor(Math.random() * 600000));

        res.json({
            success: true,
            data: {
                subscriptions: manager.getStats(),
                collector: collector.getStats(),
                // 新增字段
                mongoConnected: true,
                newsCount: newsCount,
                lastCrawlTime: lastCrawlTime.toISOString(),
                alertStats: {
                    red: Math.floor(Math.random() * 10),
                    green: Math.floor(Math.random() * 20),
                    blue: Math.floor(Math.random() * 30)
                },
                version: '1.0.0',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 预警统计API（新增）
app.get('/api/v1/alerts/stats', (req, res) => {
    try {
        // 模拟数据
        const today = [
            { _id: 'danger', count: Math.floor(Math.random() * 10) + 1 },
            { _id: 'success', count: Math.floor(Math.random() * 15) + 5 },
            { _id: 'primary', count: Math.floor(Math.random() * 20) + 10 },
            { _id: 'silenced', count: Math.floor(Math.random() * 5) }
        ];

        // 模拟过去7天情绪数据
        const sentimentTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            sentimentTrend.push({
                date: date.toISOString().split('T')[0],
                score: Math.random() * 4 + 3 // 3-7分
            });
        }

        res.json({
            success: true,
            data: {
                today,
                sentimentTrend
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 调度配置API（新增）
let scheduleConfig = {
    times: ['08:30', '15:30'],
    workdayOnly: true
};

app.get('/api/v1/scheduler/config', (req, res) => {
    res.json({ success: true, data: scheduleConfig });
});

app.post('/api/v1/scheduler/config', (req, res) => {
    try {
        const { times, workdayOnly } = req.body;
        scheduleConfig = { times: times || scheduleConfig.times, workdayOnly: workdayOnly ?? scheduleConfig.workdayOnly };
        res.json({ success: true, data: scheduleConfig });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 调度器状态API
app.get('/api/v1/scheduler/status', (req, res) => {
    try {
        const status = getTaskStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 手动触发采集API（调度器暂停时使用）
app.post('/api/v1/scheduler/trigger/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        console.log(`[API] 手动触发任务: ${taskId}`);
        const result = await triggerTask(taskId);
        res.json({ success: true, data: result, taskId });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 飞书推送测试API（新增）
app.post('/api/v1/test/feishu', async (req, res) => {
    try {
        const { type } = req.body;
        // 模拟发送成功
        console.log(`[Feishu Test] 发送 ${type} 类型测试消息`);
        res.json({ success: true, message: `${type} 测试消息发送成功` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 向量检索API（P0修复：MongoDB→ChromaDB同步） ====================

// 向量库状态查询
app.get('/api/v1/vector/status', async (req, res) => {
    try {
        const serviceStatus = await checkVectorService();
        const indexStats = getIndexStats();
        res.json({
            success: true,
            data: {
                service: serviceStatus,
                local: indexStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 语义搜索API
app.post('/api/v1/vector/search', async (req, res) => {
    try {
        const { query, topK = 5, source, docType } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, error: { message: '缺少 query 参数' } });
        }
        const results = await searchVector(query, topK, { source, docType });
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 关键词管理API（新增）
let keywords = ['茅台', '新能源', '半导体', 'AI', '芯片'];

app.get('/api/v1/config/keywords', (req, res) => {
    res.json({ success: true, data: keywords });
});

app.post('/api/v1/config/keywords', (req, res) => {
    try {
        const { keyword } = req.body;
        if (keyword && !keywords.includes(keyword)) {
            keywords.push(keyword);
        }
        res.json({ success: true, data: keywords });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

app.delete('/api/v1/config/keywords/:keyword', (req, res) => {
    try {
        const { keyword } = req.params;
        keywords = keywords.filter(k => k !== keyword);
        res.json({ success: true, data: keywords });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// AI问答API（集成AI服务）
const { getAIService } = require('./services/aiService');

app.post('/api/v1/ai/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        const aiService = getAIService();
        const result = await aiService.chat(message, context);

        res.json({
            success: true,
            data: {
                reply: result.response,
                intent: result.intent
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║                                            ║');
    console.log('║   📊 MyWind 智能投研终端                   ║');
    console.log('║                                            ║');
    console.log(`║   🌐 访问地址: http://localhost:${PORT}         ║`);
    console.log('║                                            ║');
    console.log('║   人人都买得起的万得终端                   ║');
    console.log('║                                            ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    // 启动调度器
    try {
        initScheduler();
        console.log('[服务] ✅ 调度器已启动');
    } catch (err) {
        console.error('[服务] ❌ 调度器启动失败:', err.message);
    }
});

module.exports = app;
