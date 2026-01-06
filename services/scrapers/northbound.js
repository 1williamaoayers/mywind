/**
 * 港股通资金流向爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeNorthboundFlow(options = {}) {
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[港股通] Puppeteer采集资金流向...');
        await puppeteer.gotoWithRetry(page, 'https://data.eastmoney.com/hsgt/index.html');
        await puppeteer.randomDelay(5000, 5500);  // 等待数据加载

        // 提取资金数据 - 页面数据在span.green/span.red中
        // 顺序: 沪股通净买、买入、卖出、深股通净买、买入、卖出...
        const data = await page.evaluate(() => {
            const moneyValues = [];

            // 找所有包含"亿"的span
            document.querySelectorAll('span.green, span.red').forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.includes('亿') && !text.includes('万亿') && !text.includes('亿元')) {
                    // 提取数字
                    const num = parseFloat(text.replace('亿', ''));
                    if (!isNaN(num)) {
                        moneyValues.push(num);
                    }
                }
            });

            // 前9个值分别是：沪股通(净买、买入、卖出)、深股通(净买、买入、卖出)、合计(净买、买入、卖出)
            return {
                hk2sh: moneyValues[0] || 0,  // 沪股通净买
                hk2sz: moneyValues[3] || 0,  // 深股通净买
                total: moneyValues[6] || 0   // 合计净买
            };
        });

        if (data.hk2sh !== 0) {
            results.push({
                type: 'hk2sh', name: '沪股通(北水)',
                netBuy: data.hk2sh,
                time: new Date(), source: 'northbound'
            });
        }
        if (data.hk2sz !== 0) {
            results.push({
                type: 'hk2sz', name: '深股通(北水)',
                netBuy: data.hk2sz,
                time: new Date(), source: 'northbound'
            });
        }
        if (data.total !== 0) {
            results.push({
                type: 'total', name: '北水合计',
                netBuy: data.total,
                time: new Date(), source: 'northbound'
            });
        }

        status.successCount++;
        console.log(`[港股通] 资金流向采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[港股通] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

async function scrapeNorthboundTop10(options = {}) {
    const { direction = 'south' } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        const url = direction === 'south'
            ? 'https://data.eastmoney.com/hsgt/top10/ggt.html'
            : 'https://data.eastmoney.com/hsgt/top10/hsgt.html';

        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        const items = await page.$$eval('table tr', els =>
            els.slice(1, 11).map(el => {
                const cells = el.querySelectorAll('td');
                return {
                    rank: cells[0]?.textContent?.trim() || '',
                    stockCode: cells[1]?.textContent?.trim() || '',
                    stockName: cells[2]?.textContent?.trim() || '',
                    netBuy: cells[3]?.textContent?.trim() || '',
                    source: 'northbound_top10'
                };
            }).filter(item => item.stockCode)
        );

        results.push(...items);
        console.log(`[港股通] 十大成交采集: ${results.length} 条`);
    } catch (error) {
        console.error('[港股通] 十大成交失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

async function scrapeNorthboundHistory(options = {}) {
    return [];  // 需要更复杂的实现
}

async function scrapeStockNorthboundHolding(stockCode, options = {}) {
    return [];  // 需要更复杂的实现
}

async function generateNorthboundNews() {
    const flowData = await scrapeNorthboundFlow();
    return flowData.map(f => ({
        title: `${f.name}今日净买入 ${f.netBuy} 亿`,
        source: 'northbound_summary',
        time: new Date()
    }));
}

function getNorthboundStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = {
    scrapeNorthboundFlow,
    scrapeNorthboundTop10,
    scrapeNorthboundHistory,
    scrapeStockNorthboundHolding,
    generateNorthboundNews,
    getNorthboundStatus
};
