/**
 * 新闻查询路由
 */

const express = require('express');
const router = express.Router();

const News = require('../models/News');

/**
 * 获取新闻列表 - 万得式 API
 * 支持: level, keyword, source, startDate, endDate, limit, page
 */
router.get('/', async (req, res) => {
    try {
        const {
            level,       // 预警等级: red/green/blue
            keyword,     // 模糊搜索标题+摘要
            source,      // 来源筛选
            dimension,   // 维度筛选
            stockId,     // 股票ID筛选
            startDate,   // 开始日期
            endDate,     // 结束日期
            limit = 50,  // 每页数量
            page = 1     // 页码
        } = req.query;

        // 构建查询条件
        let query = {};

        // 预警等级映射
        if (level) {
            const levelMap = { red: 'danger', green: 'success', blue: 'primary' };
            query.alertType = levelMap[level] || level;
        }

        // 模糊搜索 (标题 + AI摘要)
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { aiSummary: { $regex: keyword, $options: 'i' } },
                { matchedKeywords: { $in: [keyword] } }
            ];
        }

        // 来源筛选
        if (source) query.source = source;
        if (dimension) query.dimension = dimension;
        if (stockId) query.matchedStocks = stockId;

        // 日期范围
        if (startDate || endDate) {
            query.publishTime = {};
            if (startDate) query.publishTime.$gte = new Date(startDate);
            if (endDate) query.publishTime.$lte = new Date(endDate);
        }

        // 分页
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 查询
        const [news, total] = await Promise.all([
            News.find(query)
                .sort({ publishTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('matchedStocks', 'code name market'),
            News.countDocuments(query)
        ]);

        // 规范化 JSON 输出 (万得式)
        const normalizedData = news.map(item => ({
            id: item._id,
            title: item.title,
            content: item.content || '',
            sentiment_score: item.sentiment === 'positive' ? 8 : item.sentiment === 'negative' ? 3 : 5,
            sentiment_label: item.sentiment === 'positive' ? '利好' : item.sentiment === 'negative' ? '利空' : '中性',
            impact_sector: item.matchedKeywords || [],
            alert_level: item.alertType === 'danger' ? 'red' : item.alertType === 'success' ? 'green' : item.alertType === 'primary' ? 'blue' : null,
            source: item.sourceName || item.source,
            source_id: item.source,
            original_url: item.url,
            publish_time: item.publishTime,
            crawl_time: item.crawlTime,
            ai_summary: item.aiSummary || '',
            matched_stocks: item.matchedStocks?.map(s => ({ code: s.code, name: s.name, market: s.market })) || [],
            is_important: item.isImportant || false
        }));

        res.json({
            success: true,
            data: normalizedData,
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
 * 获取今日统计
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await News.getTodayStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
