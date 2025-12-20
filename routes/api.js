/**
 * API Routes - REST API 路由
 */

const express = require('express');
const router = express.Router();

// 服务
const stockService = require('../services/stockService');
const { processPendingAlerts, sendTestMessage, getStats } = require('../services/notificationService');
const { getKeywords, addKeyword, removeKeyword } = require('../config/filterConfig');
const { getSearchStatus, clearCache } = require('../services/searchEngineScraper');

// 模型
const Stock = require('../models/Stock');
const News = require('../models/News');
const AlertRecord = require('../models/AlertRecord');
const Account = require('../models/Account');
const { PLATFORMS } = require('../models/Account');

// 认证服务
const authService = require('../services/authService');

// ==================== 健康检查 ====================

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Private-Wind-Ultra API'
    });
});

// ==================== 股票管理 ====================

/**
 * 获取所有股票
 */
router.get('/stocks', async (req, res) => {
    try {
        const stocks = await Stock.find().sort({ market: 1, code: 1 });
        res.json({ success: true, data: stocks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 添加股票
 */
router.post('/stocks', async (req, res) => {
    try {
        const { market, code, customMatrix } = req.body;

        if (!market || !code) {
            return res.status(400).json({ success: false, error: '缺少 market 或 code' });
        }

        const stock = await stockService.addStock(market, code, customMatrix);
        res.json({ success: true, data: stock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 更新股票矩阵关键词
 */
router.put('/stocks/:id/matrix', async (req, res) => {
    try {
        const { layer, keywords } = req.body;
        const stock = await stockService.updateMatrix(req.params.id, layer, keywords);
        res.json({ success: true, data: stock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 删除股票
 */
router.delete('/stocks/:id', async (req, res) => {
    try {
        await stockService.deleteStock(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 新闻查询 ====================

/**
 * 获取新闻列表 - 万得式 API
 * 支持: level, keyword, source, startDate, endDate, limit, page
 */
router.get('/news', async (req, res) => {
    try {
        const {
            level,       // 预警等级: red/green/blue
            keyword,     // 模糊搜索标题+摘要
            source,      // 来源筛选
            dimension,   // 维度筛选
            stockId,     // 股票ID筛选
            startDate,   // 开始日期
            endDate,     // 结束日期
            limit = 50,  // 每页数量
            page = 1     // 页码
        } = req.query;

        // 构建查询条件
        let query = {};

        // 预警等级映射
        if (level) {
            const levelMap = { red: 'danger', green: 'success', blue: 'primary' };
            query.alertType = levelMap[level] || level;
        }

        // 模糊搜索 (标题 + AI摘要)
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { aiSummary: { $regex: keyword, $options: 'i' } },
                { matchedKeywords: { $in: [keyword] } }
            ];
        }

        // 来源筛选
        if (source) query.source = source;
        if (dimension) query.dimension = dimension;
        if (stockId) query.matchedStocks = stockId;

        // 日期范围
        if (startDate || endDate) {
            query.publishTime = {};
            if (startDate) query.publishTime.$gte = new Date(startDate);
            if (endDate) query.publishTime.$lte = new Date(endDate);
        }

        // 分页
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 查询
        const [news, total] = await Promise.all([
            News.find(query)
                .sort({ publishTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('matchedStocks', 'code name market'),
            News.countDocuments(query)
        ]);

        // 规范化 JSON 输出 (万得式)
        const normalizedData = news.map(item => ({
            id: item._id,
            title: item.title,
            content: item.content || '',
            sentiment_score: item.sentiment === 'positive' ? 8 : item.sentiment === 'negative' ? 3 : 5,
            sentiment_label: item.sentiment === 'positive' ? '利好' : item.sentiment === 'negative' ? '利空' : '中性',
            impact_sector: item.matchedKeywords || [],
            alert_level: item.alertType === 'danger' ? 'red' : item.alertType === 'success' ? 'green' : item.alertType === 'primary' ? 'blue' : null,
            source: item.sourceName || item.source,
            source_id: item.source,
            original_url: item.url,
            publish_time: item.publishTime,
            crawl_time: item.crawlTime,
            ai_summary: item.aiSummary || '',
            matched_stocks: item.matchedStocks?.map(s => ({ code: s.code, name: s.name, market: s.market })) || [],
            is_important: item.isImportant || false
        }));

        res.json({
            success: true,
            data: normalizedData,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取今日统计
 */
router.get('/news/stats', async (req, res) => {
    try {
        const stats = await News.getTodayStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 飞书推送 ====================

/**
 * 获取推送统计
 */
router.get('/alerts/stats', async (req, res) => {
    try {
        const stats = await getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取推送记录
 */
router.get('/alerts', async (req, res) => {
    try {
        const { limit = 50, status } = req.query;

        let query = {};
        if (status) query.status = status;

        const records = await AlertRecord.find(query)
            .sort({ sentAt: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 手动触发待处理预警
 */
router.post('/alerts/process', async (req, res) => {
    try {
        const result = await processPendingAlerts();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 测试接口 ====================

/**
 * 发送飞书测试消息
 * POST /api/test/feishu
 * Body: { type: 'danger' | 'success' | 'primary' }
 */
router.post('/test/feishu', async (req, res) => {
    try {
        const { type = 'danger' } = req.body;

        if (!['danger', 'success', 'primary'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: '无效的类型，可选: danger, success, primary'
            });
        }

        const result = await sendTestMessage(type);

        if (result.success) {
            res.json({
                success: true,
                message: `${type} 类型测试消息发送成功`,
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || '发送失败'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取系统配置状态
 */
router.get('/config/status', (req, res) => {
    res.json({
        success: true,
        data: {
            feishuWebhook: !!process.env.FEISHU_WEBHOOK,
            mongoConnected: require('mongoose').connection.readyState === 1,
            alertUsersConfigured: !!(process.env.FEISHU_ALERT_USERS),
            aiConfigured: !!(process.env.AI_API_KEY)
        }
    });
});

// ==================== AI 研报 ====================

const Report = require('../models/Report');
const { generateReport, generateAllReports, sendReportToFeishu, getTokenStats } = require('../services/aiService');
const scheduler = require('../services/schedulerService');

/**
 * 获取研报列表
 */
router.get('/reports', async (req, res) => {
    try {
        const { stockCode, limit = 30 } = req.query;

        let query = { status: 'completed' };
        if (stockCode) query.stockCode = stockCode;

        const reports = await Report.find(query)
            .sort({ reportDate: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取单个研报详情
 */
router.get('/reports/:id', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: '研报不存在' });
        }
        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 手动生成单只股票研报
 * POST /api/reports/generate
 * Body: { stockId: 'xxx', forceRefresh: false }
 */
router.post('/reports/generate', async (req, res) => {
    try {
        const { stockId, forceRefresh = false } = req.body;

        if (!stockId) {
            return res.status(400).json({ success: false, error: '缺少 stockId' });
        }

        const result = await generateReport(stockId, {
            forceRefresh,
            triggerType: 'manual'
        });

        if (result.success) {
            res.json({
                success: true,
                data: result.report,
                fromCache: result.fromCache
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 批量生成所有股票研报
 */
router.post('/reports/generate-all', async (req, res) => {
    try {
        const result = await generateAllReports({ triggerType: 'manual' });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 发送研报到飞书
 */
router.post('/reports/:id/send-feishu', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: '研报不存在' });
        }

        const result = await sendReportToFeishu(report);
        res.json({ success: result.success, error: result.error });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取 Token 使用统计
 */
router.get('/reports/stats/tokens', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const stats = await getTokenStats(parseInt(days));
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 调度管理 ====================

/**
 * 获取调度配置
 */
router.get('/scheduler/config', (req, res) => {
    try {
        const config = scheduler.getConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 更新研报调度时间
 * POST /api/scheduler/report
 * Body: { times: ['15:30', '21:00'], workdayOnly: true }
 */
router.post('/scheduler/report', (req, res) => {
    try {
        const { times, workdayOnly = true } = req.body;
        const result = scheduler.updateReportSchedule(times, workdayOnly);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 手动触发调度任务
 * POST /api/scheduler/trigger
 * Body: { taskId: 'report' | 'scrapeRealtime' | 'scrapeDeep' | 'scrapeFull' | 'alerts' }
 */
router.post('/scheduler/trigger', async (req, res) => {
    try {
        const { taskId } = req.body;
        if (!taskId) {
            return res.status(400).json({ success: false, error: '缺少 taskId' });
        }

        const result = await scheduler.triggerTask(taskId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取任务状态
 */
router.get('/scheduler/status', (req, res) => {
    try {
        const status = scheduler.getTaskStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 白名单关键词管理 ====================

/**
 * 获取白名单关键词列表
 */
router.get('/config/keywords', (req, res) => {
    try {
        const keywords = getKeywords();
        res.json({ success: true, data: keywords });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 添加白名单关键词
 */
router.post('/config/keywords', (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.status(400).json({ success: false, error: '缺少 keyword 参数' });
        }
        const result = addKeyword(keyword);
        if (result.success) {
            res.json({ success: true, data: { keyword: result.keyword, total: getKeywords().length } });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 删除白名单关键词
 */
router.delete('/config/keywords/:keyword', (req, res) => {
    try {
        const { keyword } = req.params;
        const result = removeKeyword(decodeURIComponent(keyword));
        if (result.success) {
            res.json({ success: true, data: { keyword: result.keyword, total: getKeywords().length } });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 搜索引擎增强 ====================

/**
 * 获取搜索引擎状态
 */
router.get('/search/status', (req, res) => {
    try {
        const status = getSearchStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 清理搜索缓存
 */
router.post('/search/clear-cache', (req, res) => {
    try {
        clearCache();
        res.json({ success: true, message: '搜索缓存已清理' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 手动触发搜索引擎采集
 */
router.post('/search/trigger', async (req, res) => {
    try {
        const scheduler = require('../services/schedulerService');
        const result = await scheduler.triggerTask('searchEngine');
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 账号保险箱 ====================

/**
 * 获取支持的平台列表
 */
router.get('/accounts/platforms', (req, res) => {
    res.json({ success: true, data: Account.getPlatforms() });
});

/**
 * 获取所有托管账号
 */
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await Account.find().select('-encryptedPassword');
        res.json({ success: true, data: accounts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 添加托管账号
 */
router.post('/accounts', async (req, res) => {
    try {
        const { platform, displayName, username, password } = req.body;

        if (!platform || !username || !password) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        // 检查是否已存在
        const existing = await Account.findOne({ platform, username });
        if (existing) {
            return res.status(400).json({ success: false, error: '该账号已存在' });
        }

        const account = new Account({
            platform,
            displayName: displayName || username,
            username
        });
        account.setPassword(password);
        await account.save();

        res.json({ success: true, data: account.toJSON() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 删除托管账号
 */
router.delete('/accounts/:id', async (req, res) => {
    try {
        const account = await Account.findByIdAndDelete(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, error: '账号不存在' });
        }
        // 清除 Session
        authService.clearSession(account.platform);
        res.json({ success: true, message: '账号已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 触发账号登录
 */
router.post('/accounts/:id/login', async (req, res) => {
    try {
        const result = await authService.performLogin(req.params.id);
        res.json({ success: result.success, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取当前截图（Base64）
 */
router.get('/accounts/screenshot', (req, res) => {
    const screenshot = authService.getCurrentScreenshot();
    if (screenshot) {
        res.json({ success: true, data: screenshot });
    } else {
        res.json({ success: false, error: '暂无截图' });
    }
});

/**
 * 清除账号 Session
 */
router.post('/accounts/:id/clear-session', async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, error: '账号不存在' });
        }
        authService.clearSession(account.platform);
        await account.updateStatus('idle', 'Session 已清除');
        res.json({ success: true, message: 'Session 已清除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
