/**
 * AI 研报路由
 */

const express = require('express');
const router = express.Router();

const Report = require('../models/Report');
const { generateReport, generateAllReports, sendReportToFeishu, getTokenStats } = require('../services/aiService');

/**
 * 获取研报列表
 */
router.get('/', async (req, res) => {
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
 * 获取 Token 使用统计
 * 注意：此路由需要在 /:id 之前定义，否则会被匹配为 id
 */
router.get('/stats/tokens', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const stats = await getTokenStats(parseInt(days));
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取单个研报详情
 */
router.get('/:id', async (req, res) => {
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
router.post('/generate', async (req, res) => {
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
router.post('/generate-all', async (req, res) => {
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
router.post('/:id/send-feishu', async (req, res) => {
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

module.exports = router;
