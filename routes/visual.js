/**
 * 视觉采集路由（OCR）
 */

const express = require('express');
const router = express.Router();

const {
    scrapeToutiao,
    scrapeWechat,
    scrapeXiaohongshu,
    getVisualStatus
} = require('../services/visualScraper');
const News = require('../models/News');

/**
 * 获取视觉采集状态
 */
router.get('/status', (req, res) => {
    try {
        const status = getVisualStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 触发今日头条视觉采集
 */
router.post('/toutiao', async (req, res) => {
    try {
        const { maxItems = 5 } = req.body;
        const results = await scrapeToutiao({ maxItems });

        // 入库
        if (results.length > 0) {
            for (const item of results) {
                try {
                    await News.findOneAndUpdate(
                        { title: item.title },
                        { $setOnInsert: item },
                        { upsert: true }
                    );
                } catch (e) {
                    // 忽略重复
                }
            }
        }

        res.json({
            success: true,
            data: {
                count: results.length,
                items: results.map(r => ({ title: r.title, confidence: r.ocrConfidence }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 微信公众号 OCR 搜索
 */
router.post('/wechat', async (req, res) => {
    try {
        const { keyword, maxItems = 3 } = req.body;
        if (!keyword) {
            return res.status(400).json({ success: false, error: '缺少 keyword 参数' });
        }
        const results = await scrapeWechat(keyword, { maxItems });
        res.json({ success: true, data: { count: results.length, items: results } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 小红书 OCR 搜索
 */
router.post('/xiaohongshu', async (req, res) => {
    try {
        const { keyword, maxItems = 3 } = req.body;
        if (!keyword) {
            return res.status(400).json({ success: false, error: '缺少 keyword 参数' });
        }
        const results = await scrapeXiaohongshu(keyword, { maxItems });
        res.json({ success: true, data: { count: results.length, items: results } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
