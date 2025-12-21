/**
 * 集微网抓取器 - 半导体/芯片行业情报
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 抓取状态
const jimeiStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 抓取集微网新闻
 */
async function scrapeJimei(options = {}) {
    const maxItems = options.maxItems || 15;

    console.log('[集微网] 开始抓取半导体资讯...');
    jimeiStatus.isRunning = true;
    jimeiStatus.totalFetches++;

    const results = [];

    try {
        // 集微网快讯 API
        const response = await axios.get('https://www.laoyaoba.com/api/news/list?page=1&size=20', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.laoyaoba.com/'
            },
            timeout: 15000
        });

        if (response.data && response.data.data && response.data.data.list) {
            const news = response.data.data.list;

            for (let i = 0; i < Math.min(news.length, maxItems); i++) {
                const item = news[i];

                results.push({
                    source: 'jimei',
                    sourceName: '集微网',
                    dimension: 'vertical',
                    title: item.title || '',
                    content: item.summary || item.description || '',
                    url: item.id ? `https://www.laoyaoba.com/n/${item.id}` : '',
                    publishTime: item.create_time ? new Date(item.create_time * 1000) : new Date(),
                    category: '半导体'
                });
            }
        }

        jimeiStatus.successCount++;
        console.log(`[集微网] 抓取完成: ${results.length} 条`);

    } catch (error) {
        jimeiStatus.failCount++;
        console.error('[集微网] 抓取失败:', error.message);

        // 降级：爬取页面
        try {
            const fallback = await scrapeJimeiFallback(maxItems);
            results.push(...fallback);
        } catch (fallbackError) {
            console.error('[集微网] 降级抓取失败:', fallbackError.message);
        }
    } finally {
        jimeiStatus.isRunning = false;
        jimeiStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 降级抓取
 */
async function scrapeJimeiFallback(maxItems = 10) {
    const results = [];

    const response = await axios.get('https://www.laoyaoba.com/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
    });

    const $ = cheerio.load(response.data);

    $('.news-item, .article-item, .list-item').each((i, el) => {
        if (results.length >= maxItems) return false;

        const $el = $(el);
        const $link = $el.find('a').first();
        const title = $link.text().trim();
        const url = $link.attr('href');

        if (title && title.length > 5) {
            results.push({
                source: 'jimei',
                sourceName: '集微网',
                dimension: 'vertical',
                title,
                content: '',
                url: url && url.startsWith('http') ? url : `https://www.laoyaoba.com${url}`,
                publishTime: new Date(),
                category: '半导体'
            });
        }
    });

    return results;
}

/**
 * 获取状态
 */
function getJimeiStatus() {
    return {
        ...jimeiStatus,
        lastFetchTimeStr: jimeiStatus.lastFetchTime
            ? jimeiStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeJimei,
    getJimeiStatus
};
