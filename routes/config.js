/**
 * 系统配置和关键词管理路由
 */

const express = require('express');
const router = express.Router();

const { getKeywords, addKeyword, removeKeyword } = require('../config/filterConfig');

/**
 * 获取系统配置状态
 */
router.get('/status', (req, res) => {
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

/**
 * 获取白名单关键词列表
 */
router.get('/keywords', (req, res) => {
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
router.post('/keywords', (req, res) => {
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
router.delete('/keywords/:keyword', (req, res) => {
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

module.exports = router;
