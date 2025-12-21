/**
 * 研报聚合服务
 * 
 * 功能：
 * 1. 多源研报采集聚合
 * 2. 指纹去重
 * 3. 优先级权重分配
 * 4. 验证码自动切换
 */

const ResearchReport = require('../models/ResearchReport');

// 引入抓取器
const { scrapeFxbaogao, getFxbaogaoStatus } = require('./scrapers/fxbaogao');
const { scrapeEastmoneyReports, getEastmoneyReportStatus } = require('./scrapers/eastmoneyReport');
const { scrapeWechatSearch, monitorBrokerAccounts, getWechatSearchStatus } = require('./scrapers/wechatSearch');
const { scrapeYanbaoke, getYanbaokeStatus } = require('./scrapers/yanbaoke');

// 聚合状态
const aggregatorStatus = {
    isRunning: false,
    lastRunTime: null,
    totalRuns: 0,
    lastNewReports: 0,
    lastDuplicates: 0,
    sourceStats: {}
};

// 源优先级（数字越小优先级越高）
const SOURCE_PRIORITY = {
    wechat: 1,      // 一级：微信公众号（最快）
    eastmoney: 2,   // 二级：东财（API 稳定）
    fxbaogao: 3,    // 三级：发现报告（最全）
    yanbaoke: 4     // 四级：研报客（补漏）
};

/**
 * 运行完整的研报采集
 */
async function runFullResearchScrape(options = {}) {
    const { keyword = '', stockCode = '', maxItemsPerSource = 10 } = options;

    console.log('[研报聚合] 开始多源采集...');
    aggregatorStatus.isRunning = true;
    aggregatorStatus.totalRuns++;

    const allReports = [];
    let newCount = 0;
    let duplicateCount = 0;
    const sourceStats = {};

    // 定义采集任务（按优先级排序）
    const scrapeTasks = [
        {
            name: 'wechat',
            priority: 1,
            fn: () => keyword
                ? scrapeWechatSearch({ keyword, maxItems: maxItemsPerSource })
                : monitorBrokerAccounts(undefined, 3)
        },
        {
            name: 'eastmoney',
            priority: 2,
            fn: () => scrapeEastmoneyReports({ stockCode, maxItems: maxItemsPerSource })
        },
        {
            name: 'fxbaogao',
            priority: 3,
            fn: () => scrapeFxbaogao({ keyword, maxItems: maxItemsPerSource })
        },
        {
            name: 'yanbaoke',
            priority: 4,
            fn: () => scrapeYanbaoke({ keyword, maxItems: maxItemsPerSource })
        }
    ];

    // 按优先级执行
    for (const task of scrapeTasks) {
        try {
            console.log(`[研报聚合] 采集 ${task.name} (优先级 ${task.priority})...`);
            const results = await task.fn();

            sourceStats[task.name] = {
                total: results.length,
                new: 0,
                duplicate: 0
            };

            // 去重并入库
            for (const report of results) {
                try {
                    const exists = await ResearchReport.exists(
                        report.title,
                        report.analyst || '',
                        report.broker || ''
                    );

                    if (exists) {
                        duplicateCount++;
                        sourceStats[task.name].duplicate++;
                    } else {
                        // 插入新研报
                        await ResearchReport.upsertReport({
                            ...report,
                            source: task.name,
                            fetchedAt: new Date()
                        });
                        newCount++;
                        sourceStats[task.name].new++;
                        allReports.push(report);
                    }
                } catch (dbError) {
                    console.error(`[研报聚合] 入库失败:`, dbError.message);
                }
            }

            console.log(`[研报聚合] ${task.name}: ${sourceStats[task.name].new} 新 / ${sourceStats[task.name].duplicate} 重复`);

        } catch (error) {
            console.error(`[研报聚合] ${task.name} 失败:`, error.message);
            sourceStats[task.name] = { total: 0, new: 0, duplicate: 0, error: error.message };

            // 如果遇到验证码或反爬，继续下一个源
            if (error.message.includes('验证码') || error.message.includes('captcha')) {
                console.log(`[研报聚合] ${task.name} 触发验证码，切换到下一个源`);
            }
        }

        // 源之间间隔
        await new Promise(r => setTimeout(r, 2000));
    }

    aggregatorStatus.isRunning = false;
    aggregatorStatus.lastRunTime = new Date();
    aggregatorStatus.lastNewReports = newCount;
    aggregatorStatus.lastDuplicates = duplicateCount;
    aggregatorStatus.sourceStats = sourceStats;

    console.log(`[研报聚合] 完成: ${newCount} 新研报 / ${duplicateCount} 重复`);

    return {
        newReports: newCount,
        duplicates: duplicateCount,
        sourceStats,
        reports: allReports.slice(0, 20) // 返回前 20 份
    };
}

/**
 * 获取所有源的状态
 */
function getAllSourceStatus() {
    return {
        aggregator: {
            ...aggregatorStatus,
            lastRunTimeStr: aggregatorStatus.lastRunTime
                ? aggregatorStatus.lastRunTime.toLocaleString('zh-CN')
                : '从未运行'
        },
        sources: {
            wechat: getWechatSearchStatus(),
            eastmoney: getEastmoneyReportStatus(),
            fxbaogao: getFxbaogaoStatus(),
            yanbaoke: getYanbaokeStatus()
        },
        priorities: SOURCE_PRIORITY
    };
}

/**
 * 搜索已采集的研报
 */
async function searchReports(keyword, limit = 20) {
    return ResearchReport.search(keyword, limit);
}

/**
 * 获取最新研报
 */
async function getLatestReports(limit = 20, source = null) {
    const filter = source ? { source } : {};
    return ResearchReport.getLatest(limit, filter);
}

/**
 * 获取统计信息
 */
async function getReportStats() {
    const [brokerStats, totalCount, todayCount] = await Promise.all([
        ResearchReport.statsByBroker(7),
        ResearchReport.countDocuments(),
        ResearchReport.countDocuments({
            fetchedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        })
    ]);

    return {
        total: totalCount,
        today: todayCount,
        byBroker: brokerStats
    };
}

module.exports = {
    runFullResearchScrape,
    getAllSourceStatus,
    searchReports,
    getLatestReports,
    getReportStats,
    SOURCE_PRIORITY
};
