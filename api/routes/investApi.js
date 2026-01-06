/**
 * 股票订阅与投研系统 API 路由
 * 
 * 提供RESTful API供外部系统调用
 */

const express = require('express');
const router = express.Router();

const { getSubscriptionManager } = require('../../services/subscriptionManager');
const { getStockCollector } = require('../../services/stockCollector');
const { getReportGenerator } = require('../../services/reportGenerator');

// ==================== 订阅管理 API ====================

/**
 * 获取所有订阅
 * GET /api/v1/subscriptions
 */
router.get('/subscriptions', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const subscriptions = manager.getAll();
        const stats = manager.getStats();

        res.json({
            success: true,
            data: subscriptions,
            meta: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: error.message }
        });
    }
});

/**
 * 添加订阅
 * POST /api/v1/subscriptions
 */
router.post('/subscriptions', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const { stockCode, stockName, market, priority, options } = req.body;

        if (!stockCode || !stockName) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: '股票代码和名称不能为空' }
            });
        }

        const subscription = manager.add({
            stockCode,
            stockName,
            market,
            priority,
            options
        });

        res.json({
            success: true,
            data: subscription
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'ADD_ERROR', message: error.message }
        });
    }
});

/**
 * 删除订阅
 * DELETE /api/v1/subscriptions/:code
 */
router.delete('/subscriptions/:code', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const { code } = req.params;

        const removed = manager.remove(code);

        if (removed) {
            res.json({ success: true });
        } else {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '订阅不存在' }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'DELETE_ERROR', message: error.message }
        });
    }
});

/**
 * 批量添加订阅
 * POST /api/v1/subscriptions/batch
 */
router.post('/subscriptions/batch', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const { stocks } = req.body;

        if (!Array.isArray(stocks)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: '需要提供股票数组' }
            });
        }

        const results = manager.addBatch(stocks);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'BATCH_ERROR', message: error.message }
        });
    }
});

// ==================== 股票数据 API ====================

/**
 * 获取股票资讯
 * GET /api/v1/stocks/:code/news
 */
router.get('/stocks/:code/news', (req, res) => {
    try {
        const collector = getStockCollector();
        const { code } = req.params;
        const { limit = 20, type } = req.query;

        let data = collector.getStockData(code);

        if (type) {
            data = data.filter(item => item.type === type);
        }

        data = data.slice(0, parseInt(limit));

        res.json({
            success: true,
            data,
            meta: { total: data.length }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: error.message }
        });
    }
});

/**
 * 获取股票摘要
 * GET /api/v1/stocks/:code/summary
 */
router.get('/stocks/:code/summary', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const collector = getStockCollector();
        const { code } = req.params;

        const subscription = manager.get(code);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_SUBSCRIBED', message: '该股票未订阅' }
            });
        }

        const data = collector.getStockData(code);

        const summary = {
            stock: subscription,
            newsCount: data.filter(d => d.type === 'news').length,
            reportCount: data.filter(d => d.type === 'report').length,
            announcementCount: data.filter(d => d.type === 'announcement').length,
            latestNews: data.filter(d => d.type === 'news').slice(0, 3),
            latestReports: data.filter(d => d.type === 'report').slice(0, 3)
        };

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: error.message }
        });
    }
});

// ==================== 投研报告 API ====================

/**
 * 获取每日报告
 * GET /api/v1/reports/daily
 */
router.get('/reports/daily', (req, res) => {
    try {
        const generator = getReportGenerator();
        const { date } = req.query;

        const reports = generator.getRecentReports(7);

        if (date) {
            const targetFile = `daily_${date.replace(/-/g, '')}.md`;
            const content = generator.readReport(targetFile);

            if (content) {
                res.json({
                    success: true,
                    data: { date, content }
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: '指定日期的报告不存在' }
                });
            }
        } else {
            res.json({
                success: true,
                data: reports
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: error.message }
        });
    }
});

/**
 * 手动生成报告
 * POST /api/v1/reports/generate
 */
router.post('/reports/generate', async (req, res) => {
    try {
        const generator = getReportGenerator();
        const collector = getStockCollector();

        // 构建报告数据
        const data = {
            byStock: {},
            reports: [],
            flow: null,
            sentiment: []
        };

        // 生成报告
        const result = generator.generateDailyReport(data);

        res.json({
            success: true,
            data: {
                path: result.filepath,
                date: result.date
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'GENERATE_ERROR', message: error.message }
        });
    }
});

// ==================== 系统状态 API ====================

/**
 * 获取系统状态
 * GET /api/v1/status
 */
router.get('/status', (req, res) => {
    try {
        const manager = getSubscriptionManager();
        const collector = getStockCollector();

        res.json({
            success: true,
            data: {
                subscriptions: manager.getStats(),
                collector: collector.getStats(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'STATUS_ERROR', message: error.message }
        });
    }
});

module.exports = router;
