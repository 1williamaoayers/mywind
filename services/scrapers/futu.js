/**
 * 富途爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeFutu(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[富途] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://news.futunn.com/main');
        await puppeteer.randomDelay(4000, 4500);

        // 提取新闻 - 链接包含/post/，父元素是market-wrap
        const items = await page.$$eval('a[href*="/post/"]', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                return {
                    title: text.split('\n')[0]?.trim() || '',  // 取第一行作为标题
                    url: el.href || '',
                    source: 'futu'
                };
            }).filter(item => item.title && item.title.length > 10 && item.title.length < 100)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[富途] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[富途] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getFutuStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeFutu, getFutuStatus };
