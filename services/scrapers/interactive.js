/**
 * 上证e互动/深交所互动易爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeSSEInteractive(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        console.log('[上证e互动] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'http://sns.sseinfo.com/');
        await puppeteer.randomDelay(3000, 3000 * 1.5);

        const items = await page.$$eval('.qa-list li, .question-item, .list li', els =>
            els.map(el => {
                const title = el.querySelector('.title, h3, .question');
                const link = el.querySelector('a');
                const company = el.querySelector('.company, .stock');
                return {
                    title: title?.textContent?.trim() || '',
                    url: link?.href || '',
                    company: company?.textContent?.trim() || '',
                    source: 'sse_interactive'
                };
            }).filter(item => item.title && item.title.length > 5)
        );

        results.push(...items.slice(0, maxItems));
        console.log(`[上证e互动] 采集成功: ${results.length} 条`);
    } catch (error) {
        console.error('[上证e互动] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

async function scrapeSZSEInteractive(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        console.log('[深交所互动易] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://irm.cninfo.com.cn/');
        await puppeteer.randomDelay(3000, 3000 * 1.5);

        const items = await page.$$eval('.qa-list li, .question-item, .list li', els =>
            els.map(el => {
                const title = el.querySelector('.title, h3, .question');
                const link = el.querySelector('a');
                return {
                    title: title?.textContent?.trim() || '',
                    url: link?.href || '',
                    source: 'szse_interactive'
                };
            }).filter(item => item.title && item.title.length > 5)
        );

        results.push(...items.slice(0, maxItems));
        console.log(`[深交所互动易] 采集成功: ${results.length} 条`);
    } catch (error) {
        console.error('[深交所互动易] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

async function scrapeAllInteractive(options = {}) {
    const [sse, szse] = await Promise.all([
        scrapeSSEInteractive(options),
        scrapeSZSEInteractive(options)
    ]);
    status.lastFetchTime = new Date();
    status.successCount++;
    return [...sse, ...szse];
}

function getInteractiveStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeSSEInteractive, scrapeSZSEInteractive, scrapeAllInteractive, getInteractiveStatus };
