/**
 * 港股专属调度服务
 * 
 * 管理所有港股相关的采集任务
 */

const cron = require('node-cron');

// 引入港股爬虫
const { scrapeAAStocksNews, scrapeAAStocksResearch } = require('./scrapers/aastocks');
const { scrapeHKEXNews, scrapeHKEXAnnouncements, scrapeHKEXIPO } = require('./scrapers/hkex');
const { scrapeNorthboundFlow, scrapeNorthboundTop10, generateNorthboundNews } = require('./scrapers/northbound');
const { scrapeETNetNews } = require('./scrapers/etnet');
const { scrapeHKEJNews } = require('./scrapers/hkej');
const { scrapeHKETNews } = require('./scrapers/hket');
const { scrapeZhitongNews, scrapeZhitongHK } = require('./scrapers/zhitong');
const { scrapeGelonghui } = require('./scrapers/gelonghui');

// 调度状态
const hkSchedulerStatus = {
    isRunning: false,
    lastRunTime: null,
    totalRuns: 0,
    tasks: {}
};

// 调度任务列表
const scheduledTasks = [];

/**
 * 港股实时资讯采集（每5分钟）
 */
async function runHKRealtimeScrape() {
    console.log('[港股调度] 开始实时资讯采集...');
    hkSchedulerStatus.isRunning = true;

    const results = [];

    try {
        // 并行采集多个源
        const [aastocks, zhitong, etnet, gelonghui] = await Promise.allSettled([
            scrapeAAStocksNews({ maxItems: 20 }),
            scrapeZhitongNews({ maxItems: 20 }),
            scrapeETNetNews({ maxItems: 20 }),
            scrapeGelonghui({ maxItems: 20 })
        ]);

        if (aastocks.status === 'fulfilled') results.push(...aastocks.value);
        if (zhitong.status === 'fulfilled') results.push(...zhitong.value);
        if (etnet.status === 'fulfilled') results.push(...etnet.value);
        if (gelonghui.status === 'fulfilled') results.push(...gelonghui.value);

        hkSchedulerStatus.tasks.realtime = {
            lastRun: new Date(),
            count: results.length,
            status: 'success'
        };

        console.log(`[港股调度] 实时采集完成: ${results.length} 条`);

    } catch (error) {
        console.error('[港股调度] 实时采集失败:', error.message);
        hkSchedulerStatus.tasks.realtime = {
            lastRun: new Date(),
            status: 'error',
            error: error.message
        };
    }

    hkSchedulerStatus.isRunning = false;
    hkSchedulerStatus.lastRunTime = new Date();
    hkSchedulerStatus.totalRuns++;

    return results;
}

/**
 * 港股通资金流向采集（每15分钟，交易时段）
 */
async function runNorthboundScrape() {
    console.log('[港股调度] 开始港股通资金采集...');

    try {
        const [flow, top10, news] = await Promise.allSettled([
            scrapeNorthboundFlow(),
            scrapeNorthboundTop10({ direction: 'south' }),
            generateNorthboundNews()
        ]);

        const results = {
            flow: flow.status === 'fulfilled' ? flow.value : [],
            top10: top10.status === 'fulfilled' ? top10.value : [],
            news: news.status === 'fulfilled' ? news.value : []
        };

        hkSchedulerStatus.tasks.northbound = {
            lastRun: new Date(),
            status: 'success',
            flowCount: results.flow.length,
            top10Count: results.top10.length
        };

        console.log(`[港股调度] 港股通采集完成`);
        return results;

    } catch (error) {
        console.error('[港股调度] 港股通采集失败:', error.message);
        hkSchedulerStatus.tasks.northbound = {
            lastRun: new Date(),
            status: 'error',
            error: error.message
        };
        return null;
    }
}

/**
 * 港交所官方信息采集（每30分钟）
 */
async function runHKEXScrape() {
    console.log('[港股调度] 开始港交所采集...');

    try {
        const [news, announcements, ipo] = await Promise.allSettled([
            scrapeHKEXNews({ maxItems: 20 }),
            scrapeHKEXAnnouncements({ maxItems: 20 }),
            scrapeHKEXIPO({ maxItems: 10 })
        ]);

        const results = [];
        if (news.status === 'fulfilled') results.push(...news.value);
        if (announcements.status === 'fulfilled') results.push(...announcements.value);
        if (ipo.status === 'fulfilled') results.push(...ipo.value);

        hkSchedulerStatus.tasks.hkex = {
            lastRun: new Date(),
            count: results.length,
            status: 'success'
        };

        console.log(`[港股调度] 港交所采集完成: ${results.length} 条`);
        return results;

    } catch (error) {
        console.error('[港股调度] 港交所采集失败:', error.message);
        hkSchedulerStatus.tasks.hkex = {
            lastRun: new Date(),
            status: 'error',
            error: error.message
        };
        return [];
    }
}

/**
 * 港股研报采集（每小时）
 */
async function runHKResearchScrape() {
    console.log('[港股调度] 开始港股研报采集...');

    try {
        const [aastocksResearch, hkejColumn] = await Promise.allSettled([
            scrapeAAStocksResearch({ maxItems: 15 }),
            require('./scrapers/hkej').scrapeHKEJColumn({ maxItems: 10 })
        ]);

        const results = [];
        if (aastocksResearch.status === 'fulfilled') results.push(...aastocksResearch.value);
        if (hkejColumn.status === 'fulfilled') results.push(...hkejColumn.value);

        hkSchedulerStatus.tasks.research = {
            lastRun: new Date(),
            count: results.length,
            status: 'success'
        };

        console.log(`[港股调度] 研报采集完成: ${results.length} 条`);
        return results;

    } catch (error) {
        console.error('[港股调度] 研报采集失败:', error.message);
        return [];
    }
}

/**
 * 初始化港股调度器
 */
function initHKScheduler() {
    console.log('[港股调度] 初始化调度器...');

    // 清除现有任务
    scheduledTasks.forEach(task => task.stop());
    scheduledTasks.length = 0;

    // 港股实时资讯：每5分钟
    const realtimeTask = cron.schedule('*/5 9-16 * * 1-5', () => {
        runHKRealtimeScrape();
    }, { scheduled: false });
    scheduledTasks.push(realtimeTask);

    // 港股通资金：每15分钟（交易时段）
    const northboundTask = cron.schedule('*/15 9-16 * * 1-5', () => {
        runNorthboundScrape();
    }, { scheduled: false });
    scheduledTasks.push(northboundTask);

    // 港交所官方：每30分钟
    const hkexTask = cron.schedule('*/30 9-17 * * 1-5', () => {
        runHKEXScrape();
    }, { scheduled: false });
    scheduledTasks.push(hkexTask);

    // 港股研报：每小时
    const researchTask = cron.schedule('0 * 9-18 * * 1-5', () => {
        runHKResearchScrape();
    }, { scheduled: false });
    scheduledTasks.push(researchTask);

    console.log('[港股调度] 已注册 4 个调度任务');

    return {
        realtime: realtimeTask,
        northbound: northboundTask,
        hkex: hkexTask,
        research: researchTask
    };
}

/**
 * 启动港股调度器
 */
function startHKScheduler() {
    scheduledTasks.forEach(task => task.start());
    console.log('[港股调度] 调度器已启动');
}

/**
 * 停止港股调度器
 */
function stopHKScheduler() {
    scheduledTasks.forEach(task => task.stop());
    console.log('[港股调度] 调度器已停止');
}

/**
 * 获取调度器状态
 */
function getHKSchedulerStatus() {
    return {
        ...hkSchedulerStatus,
        lastRunTimeStr: hkSchedulerStatus.lastRunTime
            ? hkSchedulerStatus.lastRunTime.toLocaleString('zh-CN')
            : '从未运行',
        taskCount: scheduledTasks.length,
        isActive: scheduledTasks.some(t => t.options?.scheduled !== false)
    };
}

/**
 * 手动触发全部港股采集
 */
async function runFullHKScrape() {
    console.log('[港股调度] 手动触发全量采集...');

    const [realtime, northbound, hkex, research] = await Promise.allSettled([
        runHKRealtimeScrape(),
        runNorthboundScrape(),
        runHKEXScrape(),
        runHKResearchScrape()
    ]);

    return {
        realtime: realtime.status === 'fulfilled' ? realtime.value : [],
        northbound: northbound.status === 'fulfilled' ? northbound.value : null,
        hkex: hkex.status === 'fulfilled' ? hkex.value : [],
        research: research.status === 'fulfilled' ? research.value : []
    };
}

module.exports = {
    initHKScheduler,
    startHKScheduler,
    stopHKScheduler,
    getHKSchedulerStatus,
    runHKRealtimeScrape,
    runNorthboundScrape,
    runHKEXScrape,
    runHKResearchScrape,
    runFullHKScrape
};
