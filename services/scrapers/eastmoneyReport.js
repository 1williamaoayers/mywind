/**
 * 东财研报爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeEastmoneyReports(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        console.log('[东财研报] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://data.eastmoney.com/report/');
        await puppeteer.randomDelay(4000, 5000);

        // 等待页面加载
        await page.waitForSelector('a', { timeout: 10000 }).catch(() => { });

        // 提取研报链接 - 筛选包含/report/的链接
        const items = await page.$$eval('a', els =>
            els.filter(el => {
                const href = el.href || '';
                const text = el.textContent?.trim() || '';
                // 筛选研报链接
                return text.length > 10 && text.length < 100 &&
                    href.includes('/report/') && href.includes('.html');
            }).slice(0, 30).map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || '',
                source: 'eastmoney_report',
                type: 'research'
            }))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[东财研报] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[东财研报] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getEastmoneyReportStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeEastmoneyReports, getEastmoneyReportStatus };
