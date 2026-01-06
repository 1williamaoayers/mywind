/**
 * 告警管理器
 * 
 * 功能：
 * 1. 记录告警日志
 * 2. 控制台输出
 * 3. 可扩展webhook通知
 */

const fs = require('fs');
const path = require('path');

const ALERT_LOG = path.join(__dirname, '../data/alerts.log');

/**
 * 告警级别
 */
const LEVELS = {
    info: { icon: 'ℹ️', color: '\x1b[36m' },
    warning: { icon: '⚠️', color: '\x1b[33m' },
    critical: { icon: '🚨', color: '\x1b[31m' }
};

/**
 * 发送告警
 */
async function alert(options) {
    const { level = 'warning', title, message, scrapers = [] } = options;
    const levelInfo = LEVELS[level] || LEVELS.warning;

    const timestamp = new Date().toLocaleString('zh-CN');

    // 构建告警消息
    const alertMessage = [
        `${levelInfo.icon} [${level.toUpperCase()}] ${title}`,
        `时间: ${timestamp}`,
        `消息: ${message}`,
        scrapers.length > 0 ? `相关爬虫: ${scrapers.join(', ')}` : ''
    ].filter(Boolean).join('\n');

    // 控制台输出
    console.log('');
    console.log(levelInfo.color + '='.repeat(50) + '\x1b[0m');
    console.log(alertMessage);
    console.log(levelInfo.color + '='.repeat(50) + '\x1b[0m');
    console.log('');

    // 写入日志
    const logLine = `[${timestamp}] [${level}] ${title}: ${message}\n`;
    fs.appendFileSync(ALERT_LOG, logLine);

    // 触发webhook（如果配置）
    await triggerWebhook(options);

    return true;
}

/**
 * 触发Webhook通知（可选）
 */
async function triggerWebhook(options) {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;

    if (!webhookUrl) {
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: options.level,
                title: options.title,
                message: options.message,
                scrapers: options.scrapers,
                timestamp: new Date().toISOString()
            })
        });

        return response.ok;
    } catch (error) {
        console.error('[告警] Webhook发送失败:', error.message);
        return false;
    }
}

/**
 * 读取告警历史
 */
function getAlertHistory(limit = 50) {
    if (!fs.existsSync(ALERT_LOG)) {
        return [];
    }

    const content = fs.readFileSync(ALERT_LOG, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines.slice(-limit);
}

/**
 * 清理过期告警
 */
function cleanOldAlerts(days = 7) {
    if (!fs.existsSync(ALERT_LOG)) {
        return 0;
    }

    const content = fs.readFileSync(ALERT_LOG, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = lines.filter(line => {
        const match = line.match(/\[([\d/\s:]+)\]/);
        if (match) {
            const date = new Date(match[1]);
            return date > cutoff;
        }
        return false;
    });

    fs.writeFileSync(ALERT_LOG, filtered.join('\n') + '\n');

    return lines.length - filtered.length;
}

module.exports = {
    alert,
    getAlertHistory,
    cleanOldAlerts,
    LEVELS
};
