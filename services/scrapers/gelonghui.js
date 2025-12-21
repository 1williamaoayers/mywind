/**
 * 格隆汇抓取器 - 港美股研报
 * 
 * 特点：
 * - 高质量港美股分析
 * - 深度研报和快讯
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 抓取状态
const gelonghuiStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0,
    lastNewsCount: 0
};

/**
 * 抓取格隆汇快讯和研报
 */
async function scrapeGelonghui(options = {}) {
    const maxItems = options.maxItems || 15;
    const type = options.type || 'all'; // 'flash' | 'article' | 'all'

    console.log('[格隆汇] 开始抓取...');
    gelonghuiStatus.isRunning = true;
    gelonghuiStatus.totalFetches++;

    const results = [];

    try {
        // 格隆汇 API
        const apis = [
            // 7x24 快讯
            {
                url: 'https://www.gelonghui.com/api/v3/live/list?count=20',
                type: 'flash'
            },
            // 深度文章
            {
                url: 'https://www.gelonghui.com/api/v3/article/list?count=10&category=0',
                type: 'article'
            }
        ];

        for (const api of apis) {
            if (type !== 'all' && type !== api.type) continue;

            try {
                const response = await axios.get(api.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.gelonghui.com/'
                    },
                    timeout: 15000
                });

                if (response.data && response.data.data) {
                    const items = response.data.data.list || response.data.data;

                    for (const item of items) {
                        if (results.length >= maxItems) break;

                        results.push({
                            source: 'gelonghui',
                            sourceName: '格隆汇',
                            dimension: api.type === 'flash' ? 'realtime' : 'deep_search',
                            title: item.title || item.content?.substring(0, 50) || '',
                            content: item.content || item.summary || item.abstract || '',
                            url: item.id ? `https://www.gelonghui.com/${api.type === 'flash' ? 'live' : 'p'}/${item.id}` : '',
                            publishTime: item.created_at ? new Date(item.created_at * 1000) : new Date(),
                            category: api.type === 'flash' ? '快讯' : '深度'
                        });
                    }
                }
            } catch (apiError) {
                console.error(`[格隆汇] ${api.type} 接口失败:`, apiError.message);
            }
        }

        gelonghuiStatus.successCount++;
        gelonghuiStatus.lastNewsCount = results.length;
        console.log(`[格隆汇] 抓取完成: ${results.length} 条`);

    } catch (error) {
        gelonghuiStatus.failCount++;
        console.error('[格隆汇] 抓取失败:', error.message);
    } finally {
        gelonghuiStatus.isRunning = false;
        gelonghuiStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 获取状态
 */
function getGelonghuiStatus() {
    return {
        ...gelonghuiStatus,
        lastFetchTimeStr: gelonghuiStatus.lastFetchTime
            ? gelonghuiStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeGelonghui,
    getGelonghuiStatus
};
