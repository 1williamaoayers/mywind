/**
 * 各数据源采集控制路由
 */

const express = require('express');
const router = express.Router();

// 政策哨兵
const { runPolicySentinel, getSentinelStatus } = require('../services/policySentinel');

// 另类数据
const { runAlternativeDataFetch, getAltDataStatus, getChartData } = require('../services/alternativeData');
const MarketStats = require('../models/MarketStats');

// 搜索引擎
const { getSearchStatus, clearCache } = require('../services/searchEngineScraper');
const scheduler = require('../services/schedulerService');

// 腾讯财经
const { scrapeTencentNews, getTencentStatus } = require('../services/scrapers/tencent');

// 格隆汇
const { scrapeGelonghui, getGelonghuiStatus } = require('../services/scrapers/gelonghui');

// 多源校验
const { crossValidate, getValidatorStatus } = require('../services/crossValidator');

// 雪球情绪
const { scrapeXueqiuSentiment } = require('../services/visualScraper');

// 金十数据
const { scrapeJin10, getJin10Status } = require('../services/scrapers/jin10');

// 国家统计局
const { scrapeNationalStats, getStatsStatus } = require('../services/scrapers/stats');

// 36氪
const { scrape36Kr, get36KrStatus } = require('../services/scrapers/kr36');

// 集微网
const { scrapeJimei, getJimeiStatus } = require('../services/scrapers/jimei');

// 富途牛牛
const { scrapeFutu, getFutuStatus } = require('../services/scrapers/futu');

// 知乎财经
const { scrapeZhihuFinance, getZhihuStatus } = require('../services/scrapers/zhihu');

// 全球媒体
const { scrapeGlobalMedia, getGlobalMediaStatus } = require('../services/scrapers/globalMedia');

// 登录助手
const { getAllLoginStatus, clearSiteSession } = require('../utils/loginHelper');

// ==================== 政策哨兵 ====================

router.get('/policy/status', (req, res) => {
    try {
        const status = getSentinelStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/policy/check', async (req, res) => {
    try {
        const result = await runPolicySentinel();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 另类数据 ====================

router.get('/altdata/status', (req, res) => {
    try {
        const status = getAltDataStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/altdata/fetch', async (req, res) => {
    try {
        const result = await runAlternativeDataFetch();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/altdata/latest', async (req, res) => {
    try {
        const data = await MarketStats.getAllLatest();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/altdata/chart/:indicator', async (req, res) => {
    try {
        const { indicator } = req.params;
        const hours = parseInt(req.query.hours) || 24;
        const data = await getChartData(indicator, hours);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 搜索引擎 ====================

router.get('/search/status', (req, res) => {
    try {
        const status = getSearchStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/search/clear-cache', (req, res) => {
    try {
        clearCache();
        res.json({ success: true, message: '搜索缓存已清理' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/search/trigger', async (req, res) => {
    try {
        const result = await scheduler.triggerTask('searchEngine');
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 腾讯财经 ====================

router.get('/tencent/status', (req, res) => {
    try {
        const status = getTencentStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/tencent/fetch', async (req, res) => {
    try {
        const { maxItems = 20 } = req.body;
        const results = await scrapeTencentNews({ maxItems });
        const criticals = crossValidate(results, 'tencent');

        res.json({
            success: true,
            data: {
                count: results.length,
                criticalAlerts: criticals.length,
                items: results.slice(0, 5).map(r => ({ title: r.title }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 格隆汇 ====================

router.get('/gelonghui/status', (req, res) => {
    try {
        const status = getGelonghuiStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/gelonghui/fetch', async (req, res) => {
    try {
        const { maxItems = 15, type = 'all' } = req.body;
        const results = await scrapeGelonghui({ maxItems, type });
        const criticals = crossValidate(results, 'gelonghui');

        res.json({
            success: true,
            data: {
                count: results.length,
                criticalAlerts: criticals.length,
                items: results.slice(0, 5).map(r => ({ title: r.title, category: r.category }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 多源校验 ====================

router.get('/validator/status', (req, res) => {
    try {
        const status = getValidatorStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 雪球情绪分析 ====================

router.post('/xueqiu/sentiment', async (req, res) => {
    try {
        const { stockCode } = req.body;
        if (!stockCode) {
            return res.status(400).json({ success: false, error: '缺少 stockCode 参数' });
        }
        const result = await scrapeXueqiuSentiment(stockCode);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 金十数据 ====================

router.get('/jin10/status', (req, res) => {
    try {
        res.json({ success: true, data: getJin10Status() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/jin10/fetch', async (req, res) => {
    try {
        const results = await scrapeJin10({ maxItems: req.body.maxItems || 30 });
        const criticals = crossValidate(results, 'cls');
        res.json({ success: true, data: { count: results.length, criticalAlerts: criticals.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 国家统计局 ====================

router.get('/stats/status', (req, res) => {
    try {
        res.json({ success: true, data: getStatsStatus() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/stats/fetch', async (req, res) => {
    try {
        const results = await scrapeNationalStats({ maxItems: req.body.maxItems || 15 });
        res.json({ success: true, data: { count: results.length, items: results.slice(0, 5) } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 36氪 ====================

router.get('/36kr/status', (req, res) => {
    try {
        res.json({ success: true, data: get36KrStatus() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/36kr/fetch', async (req, res) => {
    try {
        const results = await scrape36Kr({ maxItems: req.body.maxItems || 20 });
        res.json({ success: true, data: { count: results.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 集微网 ====================

router.get('/jimei/status', (req, res) => {
    try {
        res.json({ success: true, data: getJimeiStatus() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/jimei/fetch', async (req, res) => {
    try {
        const results = await scrapeJimei({ maxItems: req.body.maxItems || 15 });
        res.json({ success: true, data: { count: results.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 富途牛牛 ====================

router.get('/futu/status', (req, res) => {
    try {
        res.json({ success: true, data: getFutuStatus() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/futu/fetch', async (req, res) => {
    try {
        const results = await scrapeFutu({ maxItems: req.body.maxItems || 15, market: req.body.market || 'US' });
        res.json({ success: true, data: { count: results.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 知乎财经 ====================

router.get('/zhihu/status', (req, res) => {
    try {
        res.json({ success: true, data: getZhihuStatus() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/zhihu/fetch', async (req, res) => {
    try {
        const results = await scrapeZhihuFinance({ maxItems: req.body.maxItems || 5 });
        res.json({ success: true, data: { count: results.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 全球媒体 ====================

router.get('/global/status', (req, res) => {
    try {
        res.json({ success: true, data: getGlobalMediaStatus() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/global/fetch', async (req, res) => {
    try {
        const results = await scrapeGlobalMedia({ maxItems: req.body.maxItems || 10 });
        res.json({ success: true, data: { count: results.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 登录助手 ====================

router.get('/login/status', (req, res) => {
    try {
        const status = getAllLoginStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/login/:site', (req, res) => {
    try {
        const { site } = req.params;
        const result = clearSiteSession(site);
        res.json({ success: result, message: result ? '已清除' : '清除失败' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
