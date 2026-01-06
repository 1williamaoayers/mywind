/**
 * API Routes - REST API 路由入口
 * 
 * 重构说明：
 * 原 1228 行代码已拆分为 10 个子模块，
 * 本文件现在只负责挂载子路由
 */

const express = require('express');
const router = express.Router();

// ==================== 子路由模块 ====================

const stocksRouter = require('./stocks');       // 股票管理
const newsRouter = require('./news');           // 新闻查询
const alertsRouter = require('./alerts');       // 飞书预警
const reportsRouter = require('./reports');     // AI 研报
const schedulerRouter = require('./scheduler'); // 调度管理
const configRouter = require('./config');       // 系统配置
const accountsRouter = require('./accounts');   // 账号保险箱
const visualRouter = require('./visual');       // 视觉采集
const scraperRouter = require('./scraper');     // 数据源采集
const researchRouter = require('./research');   // 研报采集
const hkRouter = require('./hk');               // 港股专属 ✨

// ==================== 健康检查 ====================

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Private-Wind-Ultra API',
        version: '2.0.0'  // 重构版本
    });
});

// ==================== 挂载子路由 ====================

// 股票管理 - /api/stocks
router.use('/stocks', stocksRouter);

// 新闻查询 - /api/news
router.use('/news', newsRouter);

// 飞书预警 - /api/alerts
router.use('/alerts', alertsRouter);

// AI 研报 - /api/reports
router.use('/reports', reportsRouter);

// 调度管理 - /api/scheduler
router.use('/scheduler', schedulerRouter);

// 系统配置 - /api/config
router.use('/config', configRouter);

// 账号保险箱 - /api/accounts
router.use('/accounts', accountsRouter);

// 视觉采集 - /api/visual
router.use('/visual', visualRouter);

// 研报采集 - /api/research
router.use('/research', researchRouter);

// 数据源采集（包含多个子路径）
// /api/policy, /api/altdata, /api/search, /api/tencent, 
// /api/gelonghui, /api/validator, /api/xueqiu, /api/jin10,
// /api/stats, /api/36kr, /api/jimei, /api/futu, 
// /api/zhihu, /api/global, /api/login
router.use('/', scraperRouter);

// 港股专属 - /api/hk ✨
// /api/hk/news, /api/hk/northbound, /api/hk/hkex, /api/hk/research
router.use('/hk', hkRouter);

// ==================== 兼容旧接口 ====================

// 保持 /api/test/feishu 向后兼容
router.post('/test/feishu', (req, res, next) => {
    // 转发到 alerts 路由的 test 接口
    req.url = '/test';
    alertsRouter(req, res, next);
});

module.exports = router;
