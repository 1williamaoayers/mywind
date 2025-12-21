/**
 * 金十数据抓取器 - 全球宏观极速源
 * 
 * 特点：
 * - 外汇、宏观事件最快
 * - 非农、美联储决议第一梯队
 */

const axios = require('axios');

// 抓取状态
const jin10Status = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0,
    lastNewsCount: 0
};

/**
 * 抓取金十数据快讯
 */
async function scrapeJin10(options = {}) {
    const maxItems = options.maxItems || 30;

    console.log('[金十数据] 开始抓取快讯...');
    jin10Status.isRunning = true;
    jin10Status.totalFetches++;

    const results = [];

    try {
        // 金十数据快讯 API
        const timestamp = Date.now();
        const apiUrl = `https://flash-api.jin10.com/get_flash_list?max_time=${timestamp}&channel=-8200`;

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.jin10.com/',
                'x-app-id': 'bVBF4FyRTn5NJF5n',
                'x-version': '1.0.0'
            },
            timeout: 15000
        });

        if (response.data && response.data.data) {
            const news = response.data.data;

            for (let i = 0; i < Math.min(news.length, maxItems); i++) {
                const item = news[i];

                // 金十数据的内容格式特殊
                let content = '';
                if (item.data) {
                    if (typeof item.data === 'string') {
                        content = item.data;
                    } else if (item.data.content) {
                        content = item.data.content;
                    }
                }

                // 移除 HTML 标签
                content = content.replace(/<[^>]+>/g, '').trim();

                if (content.length > 0) {
                    results.push({
                        source: 'jin10',
                        sourceName: '金十数据',
                        dimension: 'realtime',
                        title: content.substring(0, 100),
                        content: content,
                        url: `https://www.jin10.com/details/${item.id}`,
                        publishTime: item.time ? new Date(item.time) : new Date(),
                        category: item.type === 1 ? '重要' : '快讯',
                        isImportant: item.important === 1
                    });
                }
            }
        }

        jin10Status.successCount++;
        jin10Status.lastNewsCount = results.length;
        console.log(`[金十数据] 抓取完成: ${results.length} 条快讯`);

    } catch (error) {
        jin10Status.failCount++;
        console.error('[金十数据] 抓取失败:', error.message);
    } finally {
        jin10Status.isRunning = false;
        jin10Status.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 获取状态
 */
function getJin10Status() {
    return {
        ...jin10Status,
        lastFetchTimeStr: jin10Status.lastFetchTime
            ? jin10Status.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeJin10,
    getJin10Status
};
