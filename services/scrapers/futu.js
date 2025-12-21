/**
 * 富途牛牛社区抓取器 - 港美股情绪
 */

const axios = require('axios');

// 抓取状态
const futuStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 抓取富途牛牛社区热帖
 */
async function scrapeFutu(options = {}) {
    const maxItems = options.maxItems || 15;
    const market = options.market || 'US'; // 'US' | 'HK'

    console.log('[富途牛牛] 开始抓取社区热帖...');
    futuStatus.isRunning = true;
    futuStatus.totalFetches++;

    const results = [];

    try {
        // 富途社区 API（公开）
        const apiUrl = `https://www.futunn.com/quote-api/quote-api/interface/quote/get-news-list?market=${market}&page=1&page_size=20`;

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.futunn.com/'
            },
            timeout: 15000
        });

        if (response.data && response.data.data && response.data.data.list) {
            const news = response.data.data.list;

            for (let i = 0; i < Math.min(news.length, maxItems); i++) {
                const item = news[i];

                results.push({
                    source: 'futu',
                    sourceName: '富途牛牛',
                    dimension: 'social',
                    title: item.title || '',
                    content: item.abstract || item.summary || '',
                    url: item.url || '',
                    publishTime: item.publish_time ? new Date(item.publish_time * 1000) : new Date(),
                    category: market === 'US' ? '美股' : '港股'
                });
            }
        }

        futuStatus.successCount++;
        console.log(`[富途牛牛] 抓取完成: ${results.length} 条`);

    } catch (error) {
        futuStatus.failCount++;
        console.error('[富途牛牛] 抓取失败:', error.message);
    } finally {
        futuStatus.isRunning = false;
        futuStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 获取状态
 */
function getFutuStatus() {
    return {
        ...futuStatus,
        lastFetchTimeStr: futuStatus.lastFetchTime
            ? futuStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeFutu,
    getFutuStatus
};
