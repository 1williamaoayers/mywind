/**
 * 飞书预警推送路由
 */

const express = require('express');
const router = express.Router();

const { processPendingAlerts, sendTestMessage, getStats } = require('../services/notificationService');
const AlertRecord = require('../models/AlertRecord');

/**
 * 获取推送统计
 */
router.get('/stats', async (req, res) => {
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
router.get('/', async (req, res) => {
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
router.post('/process', async (req, res) => {
    try {
        const result = await processPendingAlerts();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 发送飞书测试消息
 * POST /api/alerts/test
 * Body: { type: 'danger' | 'success' | 'primary' }
 */
router.post('/test', async (req, res) => {
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

module.exports = router;
