/**
 * 公告API路由
 * 
 * 端点：
 * - GET /api/announcements - 公告列表
 * - GET /api/announcements/:stockCode - 某股票公告
 * - GET /api/announcements/:stockCode/:id/pdf - 下载PDF
 * - POST /api/announcements/scrape - 触发采集
 * - GET /api/announcements/stats - 统计信息
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const Announcement = require('../models/Announcement');
const {
    collectAnnouncements,
    collectAllSubscribed,
    retryFailed
} = require('../services/announcementCollector');

/**
 * 获取公告列表
 * GET /api/announcements?stockCode=09618&year=2024&type=季报&limit=20&page=1
 */
router.get('/', async (req, res) => {
    try {
        const {
            stockCode,
            year,
            type,
            status = 'downloaded',
            limit = 50,
            page = 1
        } = req.query;

        let query = {};
        if (stockCode) query.stockCode = stockCode;
        if (year) query.year = parseInt(year);
        if (type) query.type = type;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [announcements, total] = await Promise.all([
            Announcement.find(query)
                .sort({ publishDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Announcement.countDocuments(query)
        ]);

        // 格式化响应
        const data = announcements.map(ann => ({
            id: ann._id,
            stockCode: ann.stockCode,
            stockName: ann.stockName,
            title: ann.title,
            type: ann.type,
            year: ann.year,
            quarter: ann.quarter,
            publishDate: ann.publishDate,
            pdfUrl: ann.status === 'downloaded'
                ? `/api/announcements/${ann.stockCode}/${ann._id}/pdf`
                : null,
            pdfSize: ann.pdfSize ? `${(ann.pdfSize / 1024).toFixed(0)} KB` : null,
            source: ann.source,
            status: ann.status
        }));

        res.json({
            success: true,
            data,
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
 * 获取某股票的公告列表
 * GET /api/announcements/:stockCode
 */
router.get('/:stockCode', async (req, res) => {
    try {
        const { stockCode } = req.params;
        const { year, type, limit = 50 } = req.query;

        const announcements = await Announcement.getByStock(stockCode, {
            year: year ? parseInt(year) : null,
            type,
            limit: parseInt(limit)
        });

        const data = announcements.map(ann => ({
            id: ann._id,
            title: ann.title,
            type: ann.type,
            year: ann.year,
            quarter: ann.quarter,
            publishDate: ann.publishDate,
            pdfUrl: `/api/announcements/${stockCode}/${ann._id}/pdf`,
            pdfSize: ann.pdfSize ? `${(ann.pdfSize / 1024).toFixed(0)} KB` : null
        }));

        res.json({ success: true, data });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 下载公告PDF
 * GET /api/announcements/:stockCode/:id/pdf
 */
router.get('/:stockCode/:id/pdf', async (req, res) => {
    try {
        const { stockCode, id } = req.params;

        const announcement = await Announcement.findOne({
            _id: id,
            stockCode,
            status: 'downloaded'
        });

        if (!announcement) {
            return res.status(404).json({
                success: false,
                error: '公告不存在或未下载'
            });
        }

        if (!announcement.pdfPath || !fs.existsSync(announcement.pdfPath)) {
            return res.status(404).json({
                success: false,
                error: 'PDF文件不存在'
            });
        }

        // 设置下载头
        const fileName = encodeURIComponent(
            announcement.title.replace(/[\\/:*?"<>|]/g, '_') + '.pdf'
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);

        // 发送文件
        res.sendFile(announcement.pdfPath);

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 触发公告采集
 * POST /api/announcements/scrape
 * Body: { stockCode: '09618', stockName: '京东集团' } 或 { all: true }
 */
router.post('/scrape', async (req, res) => {
    try {
        const { stockCode, stockName, all = false, years = [2024, 2025] } = req.body;

        let result;

        if (all) {
            // 采集所有订阅股票
            result = await collectAllSubscribed({ years });
        } else if (stockCode && stockName) {
            // 采集单只股票
            result = await collectAnnouncements(stockCode, stockName, { years });
        } else {
            return res.status(400).json({
                success: false,
                error: '需要提供 stockCode 和 stockName，或设置 all: true'
            });
        }

        res.json({ success: true, data: result });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 重试失败的下载
 * POST /api/announcements/retry
 */
router.post('/retry', async (req, res) => {
    try {
        const result = await retryFailed();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取公告统计
 * GET /api/announcements/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await Announcement.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
