/**
 * 港股专属 API 路由
 * 
 * 提供港股相关的所有 API 接口
 */

const express = require('express');
const router = express.Router();

// 引入港股服务
const hkScheduler = require('../services/hkSchedulerService');
const { detectHKAlertType, matchHKSector, isHKStockNews } = require('../config/hkKeywords');

// 引入港股爬虫
const aastocks = require('../services/scrapers/aastocks');
const hkex = require('../services/scrapers/hkex');
const northbound = require('../services/scrapers/northbound');
const etnet = require('../services/scrapers/etnet');
const hkej = require('../services/scrapers/hkej');
const hket = require('../services/scrapers/hket');
const zhitong = require('../services/scrapers/zhitong');

// ======================== 调度管理 ========================

/**
 * 获取港股调度器状态
 */
router.get('/scheduler/status', (req, res) => {
    res.json({
        success: true,
        data: hkScheduler.getHKSchedulerStatus()
    });
});

/**
 * 启动港股调度器
 */
router.post('/scheduler/start', (req, res) => {
    try {
        hkScheduler.initHKScheduler();
        hkScheduler.startHKScheduler();
        res.json({ success: true, message: '港股调度器已启动' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 停止港股调度器
 */
router.post('/scheduler/stop', (req, res) => {
    try {
        hkScheduler.stopHKScheduler();
        res.json({ success: true, message: '港股调度器已停止' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 手动触发全量采集
 */
router.post('/scheduler/run', async (req, res) => {
    try {
        const results = await hkScheduler.runFullHKScrape();
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================== 港股资讯 ========================

/**
 * 获取 AAStocks 新闻
 */
router.get('/news/aastocks', async (req, res) => {
    try {
        const { maxItems = 30 } = req.query;
        const news = await aastocks.scrapeAAStocksNews({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: news, count: news.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取智通财经新闻
 */
router.get('/news/zhitong', async (req, res) => {
    try {
        const { maxItems = 30 } = req.query;
        const news = await zhitong.scrapeZhitongHK({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: news, count: news.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取经济通新闻
 */
router.get('/news/etnet', async (req, res) => {
    try {
        const { maxItems = 30 } = req.query;
        const news = await etnet.scrapeETNetNews({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: news, count: news.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取信报财经新闻
 */
router.get('/news/hkej', async (req, res) => {
    try {
        const { maxItems = 30 } = req.query;
        const news = await hkej.scrapeHKEJNews({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: news, count: news.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取香港经济日报新闻
 */
router.get('/news/hket', async (req, res) => {
    try {
        const { maxItems = 30, channel = 'finance' } = req.query;
        const news = await hket.scrapeHKETNews({ maxItems: parseInt(maxItems), channel });
        res.json({ success: true, data: news, count: news.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================== 港交所官方 ========================

/**
 * 获取港交所新闻
 */
router.get('/hkex/news', async (req, res) => {
    try {
        const { maxItems = 30 } = req.query;
        const news = await hkex.scrapeHKEXNews({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: news, count: news.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取港交所公告
 */
router.get('/hkex/announcements', async (req, res) => {
    try {
        const { maxItems = 30 } = req.query;
        const announcements = await hkex.scrapeHKEXAnnouncements({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: announcements, count: announcements.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取港股 IPO
 */
router.get('/hkex/ipo', async (req, res) => {
    try {
        const { maxItems = 20 } = req.query;
        const ipo = await hkex.scrapeHKEXIPO({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: ipo, count: ipo.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================== 港股通资金 ========================

/**
 * 获取港股通资金流向
 */
router.get('/northbound/flow', async (req, res) => {
    try {
        const flow = await northbound.scrapeNorthboundFlow();
        res.json({ success: true, data: flow });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取港股通十大成交
 */
router.get('/northbound/top10', async (req, res) => {
    try {
        const { direction = 'south' } = req.query;
        const top10 = await northbound.scrapeNorthboundTop10({ direction });
        res.json({ success: true, data: top10, count: top10.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取港股通历史数据
 */
router.get('/northbound/history', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const history = await northbound.scrapeNorthboundHistory({ days: parseInt(days) });
        res.json({ success: true, data: history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取个股港股通持股
 */
router.get('/northbound/holding/:stockCode', async (req, res) => {
    try {
        const { stockCode } = req.params;
        const holding = await northbound.scrapeStockNorthboundHolding(stockCode);
        res.json({ success: true, data: holding, count: holding.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================== 港股研报 ========================

/**
 * 获取 AAStocks 研报
 */
router.get('/research/aastocks', async (req, res) => {
    try {
        const { maxItems = 20 } = req.query;
        const research = await aastocks.scrapeAAStocksResearch({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: research, count: research.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取信报专栏
 */
router.get('/research/hkej-column', async (req, res) => {
    try {
        const { maxItems = 20 } = req.query;
        const column = await hkej.scrapeHKEJColumn({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: column, count: column.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取智通财经研报
 */
router.get('/research/zhitong', async (req, res) => {
    try {
        const { maxItems = 15 } = req.query;
        const research = await zhitong.scrapeZhitongResearch({ maxItems: parseInt(maxItems) });
        res.json({ success: true, data: research, count: research.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================== 窝轮牛熊 ========================

/**
 * 获取窝轮排行
 */
router.get('/warrant', async (req, res) => {
    try {
        const { maxItems = 20 } = req.query;
        const warrant = await aastocks.scrapeAAStocksWarrant({ maxItems: parseInt(maxItems), type: 'warrant' });
        res.json({ success: true, data: warrant, count: warrant.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取牛熊证排行
 */
router.get('/cbbc', async (req, res) => {
    try {
        const { maxItems = 20 } = req.query;
        const cbbc = await aastocks.scrapeAAStocksWarrant({ maxItems: parseInt(maxItems), type: 'cbbc' });
        res.json({ success: true, data: cbbc, count: cbbc.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================== 工具接口 ========================

/**
 * 检测新闻预警类型
 */
router.post('/analyze/alert', (req, res) => {
    const { title, content } = req.body;
    const alertType = detectHKAlertType(title, content);
    const sectors = matchHKSector(title, content);
    const isHK = isHKStockNews(title, content);

    res.json({
        success: true,
        data: {
            alertType,
            sectors,
            isHKStock: isHK
        }
    });
});

/**
 * 获取所有数据源状态
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: {
            scheduler: hkScheduler.getHKSchedulerStatus(),
            sources: {
                aastocks: aastocks.getAAStocksStatus(),
                hkex: hkex.getHKEXStatus(),
                northbound: northbound.getNorthboundStatus(),
                etnet: etnet.getETNetStatus(),
                hkej: hkej.getHKEJStatus(),
                hket: hket.getHKETStatus(),
                zhitong: zhitong.getZhitongStatus()
            }
        }
    });
});

module.exports = router;
