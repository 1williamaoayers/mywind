/**
 * API Routes - REST API 路由
 */

const express = require('express');
const router = express.Router();

// 服务
const stockService = require('../services/stockService');
const { processPendingAlerts, sendTestMessage, getStats } = require('../services/notificationService');

// 模型
const Stock = require('../models/Stock');
const News = require('../models/News');
const AlertRecord = require('../models/AlertRecord');

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
 * 获取新闻列表
 */
router.get('/news', async (req, res) => {
    try {
        const { dimension, stockId, limit = 50 } = req.query;

        let query = {};
        if (dimension) query.dimension = dimension;
        if (stockId) query.matchedStocks = stockId;

        const news = await News.find(query)
            .sort({ publishTime: -1 })
            .limit(parseInt(limit))
            .populate('matchedStocks', 'code name market');

        res.json({ success: true, data: news });
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

module.exports = router;
