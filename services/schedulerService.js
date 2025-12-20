/**
 * Scheduler Service - 分布式调度引擎
 * 
 * 使用 node-cron 实现定时任务：
 * 1. 研报生成调度
 * 2. 采集任务调度
 * 3. 预警推送调度
 */

const cron = require('node-cron');
const { generateAllReports } = require('./aiService');
const { runFullScrape, runDimensionScrape, DIMENSIONS } = require('./scraperService');
const { processPendingAlerts } = require('./notificationService');

// 调度任务存储
const scheduledTasks = new Map();

// 默认调度配置
const DEFAULT_SCHEDULES = {
    // 研报生成：工作日 15:30
    report: {
        cron: '30 15 * * 1-5',
        enabled: true,
        description: '工作日 15:30 生成 AI 研报'
    },
    // 实时采集：每 5 分钟
    scrapeRealtime: {
        cron: '*/5 * * * *',
        enabled: true,
        description: '每 5 分钟采集实时资讯'
    },
    // 深度采集：每 30 分钟
    scrapeDeep: {
        cron: '*/30 * * * *',
        enabled: true,
        description: '每 30 分钟采集深度内容'
    },
    // 预警推送：每 2 分钟
    alerts: {
        cron: '*/2 * * * *',
        enabled: true,
        description: '每 2 分钟处理待推送预警'
    },
    // 数据清理：每天凌晨 3 点
    cleanup: {
        cron: '0 3 * * *',
        enabled: true,
        description: '每天凌晨 3 点清理 30 天前的旧数据'
    }
};

// 当前配置 (可被前端修改)
let currentConfig = { ...DEFAULT_SCHEDULES };

/**
 * 解析用户输入的时间点为 cron 表达式
 * @param {string[]} times - 时间点数组，如 ['15:30', '21:00']
 * @param {boolean} workdayOnly - 仅工作日
 */
function timesToCron(times, workdayOnly = true) {
    if (!times || times.length === 0) {
        return null;
    }

    // 多个时间点需要创建多个任务
    return times.map(time => {
        const [hour, minute] = time.split(':').map(Number);
        const dayPart = workdayOnly ? '1-5' : '*';
        return `${minute} ${hour} * * ${dayPart}`;
    });
}

/**
 * 任务执行器：AI 研报生成
 */
async function executeReportTask() {
    console.log('[调度] 开始执行 AI 研报生成任务');
    try {
        const result = await generateAllReports({ triggerType: 'scheduled' });
        console.log(`[调度] 研报生成完成:`, result);
        return result;
    } catch (error) {
        console.error('[调度] 研报生成失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：实时资讯采集
 */
async function executeRealtimeScrapeTask() {
    console.log('[调度] 开始采集实时资讯');
    try {
        const result = await runDimensionScrape(DIMENSIONS.REALTIME);
        console.log(`[调度] 实时采集完成:`, result);
        return result;
    } catch (error) {
        console.error('[调度] 实时采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：深度内容采集
 */
async function executeDeepScrapeTask() {
    console.log('[调度] 开始采集深度内容');
    try {
        const result = await runDimensionScrape(DIMENSIONS.DEEP_SEARCH);
        console.log(`[调度] 深度采集完成:`, result);
        return result;
    } catch (error) {
        console.error('[调度] 深度采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：预警推送
 */
async function executeAlertTask() {
    try {
        const result = await processPendingAlerts();
        if (result.sent > 0 || result.silenced > 0) {
            console.log(`[调度] 预警推送: 发送=${result.sent}, 静默=${result.silenced}`);
        }
        return result;
    } catch (error) {
        console.error('[调度] 预警推送失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：数据清理 (保持硬盘健康)
 */
async function executeCleanupTask() {
    console.log('[调度] 开始执行数据清理任务');
    try {
        const News = require('../models/News');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 只删除非重要新闻 (保留重要预警记录)
        const result = await News.deleteMany({
            crawlTime: { $lt: thirtyDaysAgo },
            isImportant: { $ne: true }
        });

        console.log(`[调度] 数据清理完成: 删除 ${result.deletedCount} 条旧新闻`);
        return { deleted: result.deletedCount };
    } catch (error) {
        console.error('[调度] 数据清理失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 启动单个调度任务
 */
function startTask(taskId, cronExpr, executor) {
    if (scheduledTasks.has(taskId)) {
        scheduledTasks.get(taskId).stop();
    }

    if (!cron.validate(cronExpr)) {
        console.error(`[调度] 无效的 cron 表达式: ${cronExpr}`);
        return false;
    }

    const task = cron.schedule(cronExpr, executor, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
    });

    scheduledTasks.set(taskId, task);
    console.log(`[调度] 任务已启动: ${taskId} (${cronExpr})`);

    return true;
}

/**
 * 停止单个调度任务
 */
function stopTask(taskId) {
    if (scheduledTasks.has(taskId)) {
        scheduledTasks.get(taskId).stop();
        scheduledTasks.delete(taskId);
        console.log(`[调度] 任务已停止: ${taskId}`);
        return true;
    }
    return false;
}

/**
 * 初始化所有调度任务
 */
function initScheduler() {
    console.log('[调度] 初始化调度引擎...');

    // 研报生成
    if (currentConfig.report.enabled) {
        startTask('report', currentConfig.report.cron, executeReportTask);
    }

    // 实时采集
    if (currentConfig.scrapeRealtime.enabled) {
        startTask('scrapeRealtime', currentConfig.scrapeRealtime.cron, executeRealtimeScrapeTask);
    }

    // 深度采集
    if (currentConfig.scrapeDeep.enabled) {
        startTask('scrapeDeep', currentConfig.scrapeDeep.cron, executeDeepScrapeTask);
    }

    // 预警推送
    if (currentConfig.alerts.enabled) {
        startTask('alerts', currentConfig.alerts.cron, executeAlertTask);
    }

    // 数据清理
    if (currentConfig.cleanup.enabled) {
        startTask('cleanup', currentConfig.cleanup.cron, executeCleanupTask);
    }

    console.log(`[调度] 已启动 ${scheduledTasks.size} 个调度任务`);
}

/**
 * 停止所有调度任务
 */
function stopAllTasks() {
    scheduledTasks.forEach((task, id) => {
        task.stop();
        console.log(`[调度] 任务已停止: ${id}`);
    });
    scheduledTasks.clear();
}

/**
 * 更新调度配置
 */
function updateConfig(newConfig) {
    // 停止所有任务
    stopAllTasks();

    // 合并配置
    currentConfig = { ...currentConfig, ...newConfig };

    // 重新初始化
    initScheduler();

    return currentConfig;
}

/**
 * 更新研报生成时间
 * @param {string[]} times - 时间点数组，如 ['15:30', '21:00']
 * @param {boolean} workdayOnly - 仅工作日
 */
function updateReportSchedule(times, workdayOnly = true) {
    // 停止现有研报任务
    stopTask('report');

    if (!times || times.length === 0) {
        currentConfig.report.enabled = false;
        return { success: true, message: '研报调度已禁用' };
    }

    // 为每个时间点创建任务
    times.forEach((time, index) => {
        const [hour, minute] = time.split(':').map(Number);
        const dayPart = workdayOnly ? '1-5' : '*';
        const cronExpr = `${minute} ${hour} * * ${dayPart}`;

        const taskId = times.length === 1 ? 'report' : `report_${index}`;
        startTask(taskId, cronExpr, executeReportTask);
    });

    currentConfig.report.enabled = true;
    currentConfig.report.times = times;
    currentConfig.report.workdayOnly = workdayOnly;

    return {
        success: true,
        message: `研报调度已更新: ${times.join(', ')}`,
        config: currentConfig.report
    };
}

/**
 * 获取当前配置
 */
function getConfig() {
    return {
        ...currentConfig,
        activeTasks: Array.from(scheduledTasks.keys())
    };
}

/**
 * 获取任务状态
 */
function getTaskStatus() {
    const status = {};
    scheduledTasks.forEach((task, id) => {
        status[id] = {
            running: true,
            config: currentConfig[id]
        };
    });
    return status;
}

/**
 * 手动触发任务
 */
async function triggerTask(taskId) {
    switch (taskId) {
        case 'report':
            return executeReportTask();
        case 'scrapeRealtime':
            return executeRealtimeScrapeTask();
        case 'scrapeDeep':
            return executeDeepScrapeTask();
        case 'scrapeFull':
            return runFullScrape();
        case 'alerts':
            return executeAlertTask();
        case 'cleanup':
            return executeCleanupTask();
        default:
            return { error: '未知任务' };
    }
}

module.exports = {
    // 初始化
    initScheduler,
    stopAllTasks,

    // 任务管理
    startTask,
    stopTask,
    triggerTask,

    // 配置
    getConfig,
    updateConfig,
    updateReportSchedule,
    getTaskStatus,

    // 工具
    timesToCron,

    // 常量
    DEFAULT_SCHEDULES
};
