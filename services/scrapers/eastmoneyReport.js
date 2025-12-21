/**
 * 东方财富研报中心抓取器
 * 
 * 特点：
 * - 最全的免费研报库
 * - 结构清晰，反爬较弱
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 抓取状态
const eastmoneyReportStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 抓取东方财富研报中心
 */
async function scrapeEastmoneyReports(options = {}) {
    const { stockCode = '', industry = '', maxItems = 20 } = options;

    console.log('[东财研报] 开始采集...');
    eastmoneyReportStatus.isRunning = true;
    eastmoneyReportStatus.totalFetches++;

    const results = [];

    try {
        // 东财研报中心 API
        let url = 'https://reportapi.eastmoney.com/report/list';
        const params = {
            pageSize: maxItems,
            beginTime: '',
            endTime: '',
            pageNo: 1,
            fields: '',
            qType: stockCode ? 1 : (industry ? 2 : 0), // 0=全部, 1=个股, 2=行业
            code: stockCode || '',
            industryCode: industry || ''
        };

        const response = await axios.get(url, {
            params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://data.eastmoney.com/'
            },
            timeout: 15000
        });

        if (response.data && response.data.data) {
            const reports = response.data.data;

            for (const report of reports) {
                results.push({
                    source: 'eastmoney',
                    sourceName: '东方财富',
                    title: report.title || '',
                    url: report.infoCode ? `https://data.eastmoney.com/report/info/${report.infoCode}.html` : '',
                    pdfUrl: report.attachUrl || '',
                    broker: report.orgSName || report.orgName || '',
                    analyst: report.researcher || '',
                    rating: normalizeRating(report.emRatingName || ''),
                    stockCodes: report.stockCode ? [report.stockCode] : [],
                    stockNames: report.stockName ? [report.stockName] : [],
                    industry: report.industryName || '',
                    publishDate: report.publishDate ? new Date(report.publishDate) : new Date(),
                    reportType: detectReportType(report.title || '')
                });
            }
        }

        eastmoneyReportStatus.successCount++;
        console.log(`[东财研报] 采集完成: ${results.length} 份研报`);

    } catch (error) {
        eastmoneyReportStatus.failCount++;
        console.error('[东财研报] 采集失败:', error.message);
    } finally {
        eastmoneyReportStatus.isRunning = false;
        eastmoneyReportStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 标准化评级
 */
function normalizeRating(rating) {
    const ratingMap = {
        '买入': '买入',
        '强烈推荐': '买入',
        '推荐': '推荐',
        '增持': '增持',
        '谨慎推荐': '谨慎推荐',
        '中性': '中性',
        '持有': '持有',
        '观望': '持有',
        '减持': '减持',
        '卖出': '卖出',
        '回避': '回避'
    };

    return ratingMap[rating] || '';
}

/**
 * 检测研报类型
 */
function detectReportType(title) {
    if (/深度|深入|详解/.test(title)) return '深度';
    if (/点评|快评|简评/.test(title)) return '点评';
    if (/晨会|晨报/.test(title)) return '晨会纪要';
    if (/电话|会议纪要|调研/.test(title)) return '电话会议';
    if (/行业|产业/.test(title)) return '行业';
    if (/宏观|策略|配置/.test(title)) return '策略';
    return '其他';
}

/**
 * 获取状态
 */
function getEastmoneyReportStatus() {
    return {
        ...eastmoneyReportStatus,
        lastFetchTimeStr: eastmoneyReportStatus.lastFetchTime
            ? eastmoneyReportStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeEastmoneyReports,
    getEastmoneyReportStatus
};
