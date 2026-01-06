/**
 * 股票管理路由
 */

const express = require('express');
const router = express.Router();

const stockService = require('../services/stockService');
const Stock = require('../models/Stock');

/**
 * 获取所有股票
 */
router.get('/', async (req, res) => {
    try {
        const stocks = await Stock.find().sort({ market: 1, code: 1 });
        res.json({ success: true, data: stocks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 添加股票
 */
router.post('/', async (req, res) => {
    try {
        const { market, code, customMatrix } = req.body;

        if (!market || !code) {
            return res.status(400).json({ success: false, error: '缺少 market 或 code' });
        }

        const stock = await stockService.addStock(market, code, customMatrix);
        res.json({ success: true, data: stock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 更新股票矩阵关键词
 */
router.put('/:id/matrix', async (req, res) => {
    try {
        const { layer, keywords } = req.body;
        const stock = await stockService.updateMatrix(req.params.id, layer, keywords);
        res.json({ success: true, data: stock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 删除股票
 */
router.delete('/:id', async (req, res) => {
    try {
        await stockService.deleteStock(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取股票财务数据
 * GET /stocks/:code/finance
 * 
 * 数据源: 新浪财经 (真实采集)
 */
router.get('/:code/finance', async (req, res) => {
    try {
        const { getFinancialDataService } = require('../services/financialDataService');
        const financeService = getFinancialDataService();

        const stockCode = req.params.code;
        const data = await financeService.getFinancialSummary(stockCode);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 清除财务数据缓存
 * DELETE /stocks/:code/finance/cache
 */
router.delete('/:code/finance/cache', async (req, res) => {
    try {
        const { getFinancialDataService } = require('../services/financialDataService');
        const financeService = getFinancialDataService();

        financeService.clearCache(req.params.code);
        res.json({ success: true, message: `缓存已清除: ${req.params.code}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
