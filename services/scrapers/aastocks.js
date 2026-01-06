/**
 * AAStocks 港股资讯爬虫 (Puppeteer版)
 * 
 * 数据源：AAStocks 阿斯达克财经网
 * 采集内容：港股新闻、研报、窝轮数据
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = {
    lastFetchTime: null,
    totalFetched: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 采集AAStocks新闻
 */
async function scrapeAAStocksNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        console.log('[AAStocks] Puppeteer采集新闻...');

        // 使用简体中文版新闻页面
        await puppeteer.gotoWithRetry(page, 'http://www.aastock.com/sc/stocks/news/aafn');
        await puppeteer.randomDelay(4000, 5000);

        // 提取新闻 - 使用newshead4 class
        const items = await page.$$eval('.newshead4 a, .news-item a', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                return {
                    title: text,
                    url: el.href || '',
                    source: 'aastocks',
                    sourceName: 'AAStocks'
                };
            }).filter(item => item.title && item.title.length > 10 && !item.title.includes('iPhone'))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        status.totalFetched += results.length;
        console.log(`[AAStocks] 采集成功: ${results.length} 条`);

    } catch (error) {
        status.failCount++;
        console.error('[AAStocks] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

/**
 * 采集AAStocks研报
 */
async function scrapeAAStocksResearch(options = {}) {
    const { maxItems = 20 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        console.log('[AAStocks] Puppeteer采集研报...');

        await puppeteer.gotoWithRetry(page, 'http://www.aastocks.com/tc/stocks/analysis/stock-aafn-con');
        await page.waitForTimeout(2000);

        const items = await page.$$eval('.report-list li, .analysis-list li, article', els =>
            els.map(el => {
                const link = el.querySelector('a');
                return {
                    title: link?.textContent?.trim() || el.textContent?.trim().substring(0, 100),
                    url: link?.href || '',
                    source: 'aastocks_research',
                    type: 'research'
                };
            }).filter(item => item.title)
        );

        results.push(...items.slice(0, maxItems));
        console.log(`[AAStocks] 研报采集: ${results.length} 条`);

    } catch (error) {
        console.error('[AAStocks] 研报采集失败:', error.message);
    } finally {
        await page.close();
    }

    return results;
}

/**
 * 采集窝轮数据
 */
async function scrapeAAStocksWarrant(options = {}) {
    const { maxItems = 20 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        await puppeteer.gotoWithRetry(page, 'http://www.aastocks.com/tc/warrants/overview.aspx');
        await page.waitForTimeout(2000);

        const items = await page.$$eval('table tr', els =>
            els.slice(1).map(el => {
                const cells = el.querySelectorAll('td');
                return {
                    code: cells[0]?.textContent?.trim() || '',
                    name: cells[1]?.textContent?.trim() || '',
                    price: cells[2]?.textContent?.trim() || '',
                    change: cells[3]?.textContent?.trim() || '',
                    volume: cells[4]?.textContent?.trim() || '',
                    source: 'aastocks_warrant'
                };
            }).filter(item => item.code)
        );

        results.push(...items.slice(0, maxItems));

    } catch (error) {
        console.error('[AAStocks] 窝轮采集失败:', error.message);
    } finally {
        await page.close();
    }

    return results;
}

function getAAStocksStatus() {
    return {
        ...status,
        lastFetchTimeStr: status.lastFetchTime?.toLocaleString('zh-CN') || '从未运行',
        method: 'Puppeteer'
    };
}

module.exports = {
    scrapeAAStocksNews,
    scrapeAAStocksResearch,
    scrapeAAStocksWarrant,
    getAAStocksStatus
};
