/**
 * 研报采集路由
 */

const express = require('express');
const router = express.Router();

const {
    runFullResearchScrape,
    getAllSourceStatus: getResearchSourceStatus,
    searchReports,
    getLatestReports,
    getReportStats
} = require('../services/researchAggregator');

/**
 * 获取研报源状态
 */
router.get('/status', (req, res) => {
    try {
        const status = getResearchSourceStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 触发多源研报采集
 */
router.post('/scrape', async (req, res) => {
    try {
        const { keyword = '', stockCode = '', maxItemsPerSource = 10 } = req.body;
        const result = await runFullResearchScrape({ keyword, stockCode, maxItemsPerSource });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 搜索研报
 */
router.get('/search', async (req, res) => {
    try {
        const { keyword, limit = 20 } = req.query;
        if (!keyword) {
            return res.status(400).json({ success: false, error: '缺少 keyword 参数' });
        }
        const reports = await searchReports(keyword, parseInt(limit));
        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取最新研报
 */
router.get('/latest', async (req, res) => {
    try {
        const { limit = 20, source } = req.query;
        const reports = await getLatestReports(parseInt(limit), source || null);
        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取研报统计
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await getReportStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
