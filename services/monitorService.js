/**
 * 采集监控服务
 * 
 * 功能：
 * 1. 采集成功率监控
 * 2. 数据源健康检查
 * 3. 采集延迟统计
 * 4. 告警推送
 */

const fs = require('fs');
const path = require('path');

// 监控数据存储
const monitorData = {
    sources: {},         // 各数据源状态
    history: [],         // 历史记录
    alerts: [],          // 告警记录
    startTime: new Date()
};

// 监控日志文件
const MONITOR_LOG_FILE = path.join(__dirname, '../logs/monitor.json');

/**
 * 记录采集结果
 */
function recordScrapeResult(source, options = {}) {
    const { success = true, count = 0, duration = 0, error = null } = options;

    if (!monitorData.sources[source]) {
        monitorData.sources[source] = {
            name: source,
            totalRuns: 0,
            successCount: 0,
            failCount: 0,
            totalItems: 0,
            avgDuration: 0,
            lastRun: null,
            lastError: null,
            lastSuccess: null,
            recentErrors: []
        };
    }

    const srcData = monitorData.sources[source];
    srcData.totalRuns++;
    srcData.lastRun = new Date();

    if (success) {
        srcData.successCount++;
        srcData.totalItems += count;
        srcData.lastSuccess = new Date();
        // 更新平均耗时
        srcData.avgDuration = (srcData.avgDuration * (srcData.successCount - 1) + duration) / srcData.successCount;
    } else {
        srcData.failCount++;
        srcData.lastError = { time: new Date(), message: error };
        srcData.recentErrors.push({ time: new Date(), message: error });
        if (srcData.recentErrors.length > 10) {
            srcData.recentErrors.shift();
        }

        // 连续失败超过3次触发告警
        if (checkConsecutiveFailures(source) >= 3) {
            triggerAlert(source, `连续采集失败 ${checkConsecutiveFailures(source)} 次: ${error}`);
        }
    }

    // 添加到历史记录
    monitorData.history.push({
        source,
        time: new Date(),
        success,
        count,
        duration,
        error
    });

    // 保持历史记录在1000条以内
    if (monitorData.history.length > 1000) {
        monitorData.history = monitorData.history.slice(-1000);
    }

    return srcData;
}

/**
 * 检查连续失败次数
 */
function checkConsecutiveFailures(source) {
    const recent = monitorData.history
        .filter(h => h.source === source)
        .slice(-10);

    let failures = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
        if (!recent[i].success) {
            failures++;
        } else {
            break;
        }
    }
    return failures;
}

/**
 * 触发告警
 */
function triggerAlert(source, message) {
    const alert = {
        id: Date.now(),
        source,
        message,
        time: new Date(),
        level: 'error',
        acknowledged: false
    };

    monitorData.alerts.push(alert);
    console.error(`[监控告警] ${source}: ${message}`);

    // 保持告警记录在100条以内
    if (monitorData.alerts.length > 100) {
        monitorData.alerts = monitorData.alerts.slice(-100);
    }

    return alert;
}

/**
 * 获取数据源成功率
 */
function getSourceSuccessRate(source) {
    const data = monitorData.sources[source];
    if (!data || data.totalRuns === 0) return 0;
    return Math.round((data.successCount / data.totalRuns) * 100);
}

/**
 * 获取全部监控状态
 */
function getMonitorStatus() {
    const sources = {};

    for (const [name, data] of Object.entries(monitorData.sources)) {
        sources[name] = {
            name: data.name,
            successRate: getSourceSuccessRate(name) + '%',
            totalRuns: data.totalRuns,
            successCount: data.successCount,
            failCount: data.failCount,
            totalItems: data.totalItems,
            avgDuration: Math.round(data.avgDuration) + 'ms',
            lastRun: data.lastRun?.toLocaleString('zh-CN'),
            lastSuccess: data.lastSuccess?.toLocaleString('zh-CN'),
            lastError: data.lastError,
            status: getSourceHealthStatus(name)
        };
    }

    return {
        uptime: formatUptime(Date.now() - monitorData.startTime.getTime()),
        sourcesCount: Object.keys(sources).length,
        sources,
        recentAlerts: monitorData.alerts.slice(-10),
        overallHealth: getOverallHealth()
    };
}

/**
 * 获取数据源健康状态
 */
function getSourceHealthStatus(source) {
    const rate = getSourceSuccessRate(source);
    const data = monitorData.sources[source];

    if (!data || data.totalRuns === 0) return 'unknown';
    if (rate >= 90) return 'healthy';
    if (rate >= 70) return 'warning';
    return 'critical';
}

/**
 * 获取整体健康度
 */
function getOverallHealth() {
    const statuses = Object.keys(monitorData.sources).map(s => getSourceHealthStatus(s));
    const critical = statuses.filter(s => s === 'critical').length;
    const warning = statuses.filter(s => s === 'warning').length;
    const healthy = statuses.filter(s => s === 'healthy').length;

    if (critical > 0) return 'critical';
    if (warning > healthy) return 'warning';
    return 'healthy';
}

/**
 * 格式化运行时间
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天${hours % 24}小时`;
    if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
    if (minutes > 0) return `${minutes}分钟`;
    return `${seconds}秒`;
}

/**
 * 健康检查 - 检查所有数据源
 */
async function runHealthCheck(scrapers = {}) {
    console.log('[监控] 开始健康检查...');
    const results = {};

    for (const [name, scraper] of Object.entries(scrapers)) {
        try {
            if (typeof scraper.getStatus === 'function') {
                results[name] = {
                    status: 'ok',
                    data: scraper.getStatus()
                };
            } else if (typeof scraper === 'function') {
                // 尝试调用获取少量数据
                const startTime = Date.now();
                const data = await scraper({ maxItems: 1 });
                const duration = Date.now() - startTime;

                results[name] = {
                    status: data && data.length > 0 ? 'ok' : 'empty',
                    duration,
                    count: data?.length || 0
                };

                recordScrapeResult(name, {
                    success: data && data.length > 0,
                    count: data?.length || 0,
                    duration
                });
            }
        } catch (error) {
            results[name] = {
                status: 'error',
                error: error.message
            };

            recordScrapeResult(name, {
                success: false,
                error: error.message
            });
        }
    }

    console.log('[监控] 健康检查完成');
    return results;
}

/**
 * 保存监控数据到文件
 */
function saveMonitorData() {
    try {
        const dir = path.dirname(MONITOR_LOG_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(MONITOR_LOG_FILE, JSON.stringify(monitorData, null, 2));
    } catch (error) {
        console.error('[监控] 保存数据失败:', error.message);
    }
}

/**
 * 加载监控数据
 */
function loadMonitorData() {
    try {
        if (fs.existsSync(MONITOR_LOG_FILE)) {
            const data = JSON.parse(fs.readFileSync(MONITOR_LOG_FILE, 'utf8'));
            Object.assign(monitorData, data);
            monitorData.startTime = new Date();
        }
    } catch (error) {
        console.error('[监控] 加载数据失败:', error.message);
    }
}

module.exports = {
    recordScrapeResult,
    getMonitorStatus,
    getSourceSuccessRate,
    getSourceHealthStatus,
    triggerAlert,
    runHealthCheck,
    saveMonitorData,
    loadMonitorData
};
