/**
 * 腾讯财经抓取器 - 7x24 快讯
 * 
 * 特点：
 * - 反爬较弱，作为"稳定兜底源"
 * - HTML 结构简洁
 * - 每 2 分钟巡检
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 抓取状态
const tencentStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0,
    lastNewsCount: 0
};

/**
 * 抓取腾讯财经 7x24 快讯
 */
async function scrapeTencentNews(options = {}) {
    const maxItems = options.maxItems || 20;

    console.log('[腾讯财经] 开始抓取快讯...');
    tencentStatus.isRunning = true;
    tencentStatus.totalFetches++;

    const results = [];

    try {
        // 腾讯财经快讯 API（更稳定）
        const apiUrl = 'https://pacaio.match.qq.com/irs/rcd?cid=137&token=49cbb2154853ef1a74ff4e53723372ce&ext=finance&num=30';

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://finance.qq.com/'
            },
            timeout: 15000
        });

        if (response.data && response.data.data) {
            const news = response.data.data;

            for (let i = 0; i < Math.min(news.length, maxItems); i++) {
                const item = news[i];
                results.push({
                    source: 'tencent',
                    sourceName: '腾讯财经',
                    dimension: 'realtime',
                    title: item.title || '',
                    content: item.intro || item.abstract || '',
                    url: item.url || item.vurl || '',
                    publishTime: item.publish_time ? new Date(item.publish_time * 1000) : new Date(),
                    category: item.category_cn || '快讯'
                });
            }
        }

        tencentStatus.successCount++;
        tencentStatus.lastNewsCount = results.length;
        console.log(`[腾讯财经] 抓取完成: ${results.length} 条快讯`);

    } catch (error) {
        tencentStatus.failCount++;
        console.error('[腾讯财经] 抓取失败:', error.message);

        // 降级方案：直接爬取页面
        try {
            const fallbackResults = await scrapeTencentFallback(maxItems);
            results.push(...fallbackResults);
        } catch (fallbackError) {
            console.error('[腾讯财经] 降级抓取也失败:', fallbackError.message);
        }
    } finally {
        tencentStatus.isRunning = false;
        tencentStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 降级方案：直接爬取页面
 */
async function scrapeTencentFallback(maxItems = 10) {
    console.log('[腾讯财经] 尝试降级抓取...');

    const results = [];

    try {
        const response = await axios.get('https://finance.qq.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // 尝试多个选择器
        const selectors = [
            '.list-news li a',
            '.news-list li a',
            '.cf li a',
            'a[href*="/a/"]'
        ];

        for (const selector of selectors) {
            $(selector).each((i, el) => {
                if (results.length >= maxItems) return false;

                const $el = $(el);
                const title = $el.text().trim();
                const url = $el.attr('href');

                if (title && title.length > 10 && url) {
                    results.push({
                        source: 'tencent',
                        sourceName: '腾讯财经',
                        dimension: 'realtime',
                        title,
                        content: '',
                        url: url.startsWith('http') ? url : `https://finance.qq.com${url}`,
                        publishTime: new Date()
                    });
                }
            });

            if (results.length > 0) break;
        }

    } catch (error) {
        console.error('[腾讯财经] 降级抓取失败:', error.message);
    }

    return results;
}

/**
 * 获取状态
 */
function getTencentStatus() {
    return {
        ...tencentStatus,
        lastFetchTimeStr: tencentStatus.lastFetchTime
            ? tencentStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeTencentNews,
    getTencentStatus
};
