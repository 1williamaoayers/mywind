/**
 * 全球媒体爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeGlobalMedia(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];

    // 路透社
    const page1 = await puppeteer.createPage({ timeout: 45000 });
    try {
        console.log('[全球媒体] Puppeteer采集路透社...');
        await puppeteer.goto(page1, 'https://www.reuters.com/business/');
        await page1.waitForTimeout(2000);

        const items = await page1.$$eval('article, .story-card', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const title = el.querySelector('h3, h4, .title');
                return {
                    title: title?.textContent?.trim() || link?.textContent?.trim() || '',
                    url: link?.href || '',
                    source: 'reuters'
                };
            }).filter(item => item.title && item.title.length > 10)
        );
        results.push(...items.slice(0, 10));
    } catch (error) {
        console.error('[路透社] 采集失败:', error.message);
    } finally {
        await page1.close();
    }

    // Bloomberg
    const page2 = await puppeteer.createPage({ timeout: 45000 });
    try {
        console.log('[全球媒体] Puppeteer采集Bloomberg...');
        await puppeteer.goto(page2, 'https://www.bloomberg.com/');
        await page2.waitForTimeout(2000);

        const items = await page2.$$eval('article, .story-card', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const title = el.querySelector('h3, h4, .title');
                return {
                    title: title?.textContent?.trim() || link?.textContent?.trim() || '',
                    url: link?.href || '',
                    source: 'bloomberg'
                };
            }).filter(item => item.title && item.title.length > 10)
        );
        results.push(...items.slice(0, 10));
    } catch (error) {
        console.error('[Bloomberg] 采集失败:', error.message);
    } finally {
        await page2.close();
    }

    status.lastFetchTime = new Date();
    status.successCount++;
    console.log(`[全球媒体] 采集完成: ${results.length} 条`);

    return results.slice(0, maxItems);
}

function getGlobalMediaStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeGlobalMedia, getGlobalMediaStatus };
