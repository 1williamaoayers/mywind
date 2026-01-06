/**
 * 智能调度优化服务
 * 
 * 功能：
 * 1. 根据源特性设置合理频率
 * 2. 交易时段自动加速
 * 3. 失败自动重试
 * 4. 负载均衡
 */

const cron = require('node-cron');
const { recordScrapeResult } = require('./monitorService');

// 调度配置
const SCHEDULE_CONFIG = {
    // 实时快讯（高频）- 交易时段每2分钟，非交易时段每10分钟
    realtime: {
        sources: ['cls', 'wallstreet', 'jin10', 'ths', 'stcn'],
        tradingHours: '*/2 9-15 * * 1-5',      // 交易日 9:00-15:00
        offHours: '*/10 * * * *',              // 其他时间
        priority: 1,
        retryCount: 2,
        timeout: 10000
    },

    // 港股实时（高频）- 港股交易时段
    hk_realtime: {
        sources: ['aastocks', 'etnet', 'zhitong'],
        tradingHours: '*/3 9-16 * * 1-5',      // 港股 9:30-16:00
        offHours: '*/15 * * * *',
        priority: 1,
        retryCount: 2,
        timeout: 15000
    },

    // 港股通资金（中频）
    northbound: {
        sources: ['northbound'],
        tradingHours: '*/10 9-16 * * 1-5',
        offHours: '0 9,12,16 * * 1-5',         // 非交易时段固定时间
        priority: 2,
        retryCount: 3,
        timeout: 10000
    },

    // 官方信披（中频）
    official: {
        sources: ['cninfo', 'hkexnews', 'hkex', 'sec', 'interactive'],
        tradingHours: '*/15 9-17 * * 1-5',
        offHours: '0 */2 * * *',
        priority: 2,
        retryCount: 3,
        timeout: 20000
    },

    // 社交舆情（中频）
    social: {
        sources: ['xueqiu', 'weibo', 'guba', 'taoguba'],
        tradingHours: '*/5 9-15 * * 1-5',
        offHours: '*/30 * * * *',
        priority: 3,
        retryCount: 2,
        timeout: 15000
    },

    // 研报深度（低频）
    research: {
        sources: ['eastmoney_report', 'fxbaogao', 'yanbaoke', 'seekingalpha'],
        schedule: '0 */2 9-18 * * 1-5',       // 每2小时
        priority: 4,
        retryCount: 2,
        timeout: 30000
    },

    // 视觉采集（低频，资源消耗大）
    visual: {
        sources: ['toutiao', 'wechat', 'xiaohongshu'],
        schedule: '0 */4 9-22 * * *',          // 每4小时
        priority: 5,
        retryCount: 1,
        timeout: 60000
    },

    // 海外市场（根据时区）
    overseas: {
        sources: ['yahoo', 'seekingalpha', 'globalMedia'],
        schedule: '0 21,23,1,3 * * *',         // 美股时段
        priority: 3,
        retryCount: 2,
        timeout: 20000
    }
};

// 调度状态
const schedulerState = {
    isRunning: false,
    tasks: {},
    lastRun: {},
    pendingRetries: []
};

/**
 * 判断当前是否为交易时段
 */
function isTradingHours(market = 'cn') {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // 周末不是交易日
    if (day === 0 || day === 6) return false;

    switch (market) {
        case 'cn':
            // A股: 9:30-11:30, 13:00-15:00
            return (hour >= 9 && hour < 12) || (hour >= 13 && hour < 15);
        case 'hk':
            // 港股: 9:30-12:00, 13:00-16:00
            return (hour >= 9 && hour < 12) || (hour >= 13 && hour < 16);
        case 'us':
            // 美股: 21:30-04:00 (北京时间)
            return hour >= 21 || hour < 4;
        default:
            return hour >= 9 && hour < 17;
    }
}

/**
 * 获取源的调度配置
 */
function getSourceConfig(source) {
    for (const [category, config] of Object.entries(SCHEDULE_CONFIG)) {
        if (config.sources.includes(source)) {
            return { category, ...config };
        }
    }
    return null;
}

/**
 * 创建带重试的采集任务
 */
function createScrapeTask(source, scraper, config) {
    return async () => {
        const startTime = Date.now();
        let lastError = null;

        for (let attempt = 0; attempt <= (config.retryCount || 1); attempt++) {
            try {
                console.log(`[调度] 开始采集 ${source}${attempt > 0 ? ` (重试 ${attempt})` : ''}`);

                const result = await Promise.race([
                    scraper({ maxItems: 30 }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('采集超时')), config.timeout || 15000)
                    )
                ]);

                const duration = Date.now() - startTime;

                recordScrapeResult(source, {
                    success: true,
                    count: result?.length || 0,
                    duration
                });

                console.log(`[调度] ${source} 采集成功: ${result?.length || 0} 条, 耗时 ${duration}ms`);
                return result;

            } catch (error) {
                lastError = error;
                console.error(`[调度] ${source} 采集失败 (尝试 ${attempt + 1}/${config.retryCount + 1}):`, error.message);

                // 重试前等待
                if (attempt < config.retryCount) {
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                }
            }
        }

        // 所有重试都失败
        recordScrapeResult(source, {
            success: false,
            error: lastError?.message
        });

        return null;
    };
}

/**
 * 初始化智能调度器
 */
function initSmartScheduler(scrapers = {}) {
    console.log('[智能调度] 初始化调度器...');

    // 清除现有任务
    Object.values(schedulerState.tasks).forEach(task => {
        if (task && task.stop) task.stop();
    });
    schedulerState.tasks = {};

    for (const [category, config] of Object.entries(SCHEDULE_CONFIG)) {
        for (const source of config.sources) {
            const scraper = scrapers[source];
            if (!scraper) {
                console.warn(`[智能调度] 未找到采集器: ${source}`);
                continue;
            }

            const task = createScrapeTask(source, scraper, config);

            // 使用交易时段或固定调度
            const schedule = config.tradingHours && isTradingHours()
                ? config.tradingHours
                : (config.offHours || config.schedule);

            if (schedule) {
                try {
                    schedulerState.tasks[source] = cron.schedule(schedule, task, { scheduled: false });
                    console.log(`[智能调度] 注册任务: ${source} -> ${schedule}`);
                } catch (e) {
                    console.error(`[智能调度] 注册任务失败 ${source}:`, e.message);
                }
            }
        }
    }

    console.log(`[智能调度] 已注册 ${Object.keys(schedulerState.tasks).length} 个任务`);
    return schedulerState.tasks;
}

/**
 * 启动调度器
 */
function startScheduler() {
    schedulerState.isRunning = true;
    Object.values(schedulerState.tasks).forEach(task => {
        if (task && task.start) task.start();
    });
    console.log('[智能调度] 调度器已启动');
}

/**
 * 停止调度器
 */
function stopScheduler() {
    schedulerState.isRunning = false;
    Object.values(schedulerState.tasks).forEach(task => {
        if (task && task.stop) task.stop();
    });
    console.log('[智能调度] 调度器已停止');
}

/**
 * 获取调度状态
 */
function getSchedulerStatus() {
    return {
        isRunning: schedulerState.isRunning,
        taskCount: Object.keys(schedulerState.tasks).length,
        isTradingHours: {
            cn: isTradingHours('cn'),
            hk: isTradingHours('hk'),
            us: isTradingHours('us')
        },
        categories: Object.keys(SCHEDULE_CONFIG),
        lastRun: schedulerState.lastRun
    };
}

/**
 * 手动触发特定源采集
 */
async function triggerScrape(source, scraper) {
    const config = getSourceConfig(source) || { retryCount: 1, timeout: 15000 };
    const task = createScrapeTask(source, scraper, config);
    return await task();
}

module.exports = {
    SCHEDULE_CONFIG,
    isTradingHours,
    getSourceConfig,
    initSmartScheduler,
    startScheduler,
    stopScheduler,
    getSchedulerStatus,
    triggerScrape
};
