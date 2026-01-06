/**
 * 调度管理路由
 */

const express = require('express');
const router = express.Router();

const scheduler = require('../services/schedulerService');

/**
 * 获取调度配置
 */
router.get('/config', (req, res) => {
    try {
        const config = scheduler.getConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取任务状态
 */
router.get('/status', (req, res) => {
    try {
        const status = scheduler.getTaskStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 更新研报调度时间
 * POST /api/scheduler/report
 * Body: { times: ['15:30', '21:00'], workdayOnly: true }
 */
router.post('/report', (req, res) => {
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
router.post('/trigger', async (req, res) => {
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

module.exports = router;
