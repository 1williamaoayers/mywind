/**
 * 账号保险箱路由
 */

const express = require('express');
const router = express.Router();

const Account = require('../models/Account');
const authService = require('../services/authService');

/**
 * 获取支持的平台列表
 */
router.get('/platforms', (req, res) => {
    res.json({ success: true, data: Account.getPlatforms() });
});

/**
 * 获取所有托管账号
 */
router.get('/', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
router.post('/:id/login', async (req, res) => {
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
router.get('/screenshot', (req, res) => {
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
router.post('/:id/clear-session', async (req, res) => {
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
