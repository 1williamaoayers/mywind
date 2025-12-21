/**
 * 36氪抓取器 - 互联网/硬科技/投融资
 */

const axios = require('axios');

// 抓取状态
const kr36Status = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 抓取 36氪 快讯和深度
 */
async function scrape36Kr(options = {}) {
    const maxItems = options.maxItems || 20;
    const type = options.type || 'all'; // 'newsflash' | 'article' | 'all'

    console.log('[36氪] 开始抓取...');
    kr36Status.isRunning = true;
    kr36Status.totalFetches++;

    const results = [];

    try {
        const apis = [
            // 快讯
            {
                url: 'https://gateway.36kr.com/api/mis/nav/newsflash/flow?per_page=20',
                type: 'newsflash'
            },
            // 文章
            {
                url: 'https://gateway.36kr.com/api/mis/nav/home/flow?per_page=10',
                type: 'article'
            }
        ];

        for (const api of apis) {
            if (type !== 'all' && type !== api.type) continue;

            try {
                const response = await axios.get(api.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://36kr.com/'
                    },
                    timeout: 15000
                });

                if (response.data && response.data.data && response.data.data.items) {
                    const items = response.data.data.items;

                    for (const item of items) {
                        if (results.length >= maxItems) break;

                        const widget = item.templateMaterial || item;

                        results.push({
                            source: '36kr',
                            sourceName: '36氪',
                            dimension: api.type === 'newsflash' ? 'realtime' : 'deep_search',
                            title: widget.widgetTitle || widget.title || '',
                            content: widget.widgetContent || widget.summary || '',
                            url: widget.itemId ? `https://36kr.com/${api.type === 'newsflash' ? 'newsflashes' : 'p'}/${widget.itemId}` : '',
                            publishTime: widget.publishTime ? new Date(widget.publishTime) : new Date(),
                            category: api.type === 'newsflash' ? '快讯' : '深度'
                        });
                    }
                }
            } catch (apiError) {
                console.error(`[36氪] ${api.type} 接口失败:`, apiError.message);
            }
        }

        kr36Status.successCount++;
        console.log(`[36氪] 抓取完成: ${results.length} 条`);

    } catch (error) {
        kr36Status.failCount++;
        console.error('[36氪] 抓取失败:', error.message);
    } finally {
        kr36Status.isRunning = false;
        kr36Status.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 获取状态
 */
function get36KrStatus() {
    return {
        ...kr36Status,
        lastFetchTimeStr: kr36Status.lastFetchTime
            ? kr36Status.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrape36Kr,
    get36KrStatus
};
