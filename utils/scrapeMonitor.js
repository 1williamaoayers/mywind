/**
 * 采集监控模块
 * 
 * 功能：
 * 1. 记录采集成功率
 * 2. 统计响应时间
 * 3. 告警阈值检测
 * 
 * @author MyWind AI
 * @date 2025-12-27
 */

/**
 * 采集监控器类
 */
class ScrapeMonitor {
    constructor() {
        this.stats = {};           // 按数据源统计
        this.recentErrors = [];    // 最近错误记录
        this.alertThresholds = {
            successRateMin: 0.8,   // 成功率最低 80%
            avgDurationMax: 30000, // 平均耗时最大 30 秒
            consecutiveFailMax: 3  // 连续失败最大次数
        };
    }

    /**
     * 记录采集结果
     * 
     * @param {string} source - 数据源名称
     * @param {boolean} success - 是否成功
     * @param {number} duration - 耗时（毫秒）
     * @param {string} error - 错误信息（可选）
     */
    record(source, success, duration, error = null) {
        if (!this.stats[source]) {
            this.stats[source] = {
                success: 0,
                fail: 0,
                durations: [],
                consecutiveFails: 0,
                lastResult: null,
                lastTime: null
            };
        }

        const stat = this.stats[source];
        stat.lastTime = new Date().toISOString();

        if (success) {
            stat.success++;
            stat.consecutiveFails = 0;
            stat.lastResult = 'success';
        } else {
            stat.fail++;
            stat.consecutiveFails++;
            stat.lastResult = 'fail';

            // 记录错误
            this.recentErrors.push({
                source,
                error,
                time: stat.lastTime
            });

            // 只保留最近 50 条错误
            if (this.recentErrors.length > 50) {
                this.recentErrors.shift();
            }
        }

        // 记录耗时（只保留最近 100 条）
        stat.durations.push(duration);
        if (stat.durations.length > 100) {
            stat.durations.shift();
        }

        // 检查是否需要告警
        return this._checkAlerts(source, stat);
    }

    /**
     * 检查告警条件
     */
    _checkAlerts(source, stat) {
        const alerts = [];
        const total = stat.success + stat.fail;

        // 检查成功率
        if (total >= 5) {
            const successRate = stat.success / total;
            if (successRate < this.alertThresholds.successRateMin) {
                alerts.push({
                    type: 'LOW_SUCCESS_RATE',
                    source,
                    value: (successRate * 100).toFixed(1) + '%',
                    threshold: (this.alertThresholds.successRateMin * 100) + '%'
                });
            }
        }

        // 检查平均耗时
        if (stat.durations.length >= 3) {
            const avgDuration = stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length;
            if (avgDuration > this.alertThresholds.avgDurationMax) {
                alerts.push({
                    type: 'SLOW_RESPONSE',
                    source,
                    value: (avgDuration / 1000).toFixed(1) + 's',
                    threshold: (this.alertThresholds.avgDurationMax / 1000) + 's'
                });
            }
        }

        // 检查连续失败
        if (stat.consecutiveFails >= this.alertThresholds.consecutiveFailMax) {
            alerts.push({
                type: 'CONSECUTIVE_FAILS',
                source,
                value: stat.consecutiveFails,
                threshold: this.alertThresholds.consecutiveFailMax
            });
        }

        return alerts;
    }

    /**
     * 获取单个数据源的统计
     */
    getSourceStats(source) {
        const stat = this.stats[source];
        if (!stat) return null;

        const total = stat.success + stat.fail;
        const avgDuration = stat.durations.length > 0
            ? stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length
            : 0;

        return {
            source,
            total,
            success: stat.success,
            fail: stat.fail,
            successRate: total > 0 ? (stat.success / total * 100).toFixed(1) + '%' : 'N/A',
            avgDuration: avgDuration.toFixed(0) + 'ms',
            consecutiveFails: stat.consecutiveFails,
            lastResult: stat.lastResult,
            lastTime: stat.lastTime
        };
    }

    /**
     * 获取全部统计报告
     */
    getReport() {
        const sources = Object.keys(this.stats);

        return {
            summary: {
                totalSources: sources.length,
                totalRequests: sources.reduce((sum, s) =>
                    sum + this.stats[s].success + this.stats[s].fail, 0),
                totalSuccess: sources.reduce((sum, s) => sum + this.stats[s].success, 0),
                totalFail: sources.reduce((sum, s) => sum + this.stats[s].fail, 0)
            },
            sources: sources.map(s => this.getSourceStats(s)),
            recentErrors: this.recentErrors.slice(-10)
        };
    }

    /**
     * 重置统计
     */
    reset() {
        this.stats = {};
        this.recentErrors = [];
    }

    /**
     * 设置告警阈值
     */
    setThresholds(thresholds) {
        Object.assign(this.alertThresholds, thresholds);
    }
}

// 默认监控器实例
const defaultMonitor = new ScrapeMonitor();

/**
 * 带监控的包装函数
 * 
 * @param {string} source - 数据源名称
 * @param {Function} scrapeFunc - 采集函数
 * @returns {Promise<any>}
 */
async function withMonitor(source, scrapeFunc) {
    const startTime = Date.now();
    let success = false;
    let error = null;

    try {
        const result = await scrapeFunc();
        success = true;
        return result;
    } catch (e) {
        error = e.message;
        throw e;
    } finally {
        const duration = Date.now() - startTime;
        const alerts = defaultMonitor.record(source, success, duration, error);

        // 打印告警
        for (const alert of alerts) {
            console.warn(`[Monitor] 告警 ${alert.type}: ${alert.source} (${alert.value} > ${alert.threshold})`);
        }
    }
}

module.exports = {
    ScrapeMonitor,
    defaultMonitor,
    withMonitor
};
