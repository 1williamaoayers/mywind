/**
 * Notification Service - 飞书智能推送系统
 * 
 * 功能：
 * 1. 三级分色卡片 (红/绿/蓝)
 * 2. 5分钟同股同级静默
 * 3. 消息聚合
 * 4. @提醒支持
 */

const axios = require('axios');
const AlertRecord = require('../models/AlertRecord');
const News = require('../models/News');

// 飞书 Webhook URL (从环境变量读取)
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK || '';

// @提醒用户ID列表 (红色预警时使用)
const ALERT_USER_IDS = (process.env.FEISHU_ALERT_USERS || '').split(',').filter(Boolean);

// 预警级别配置
const ALERT_CONFIG = {
    danger: {
        template: 'red',
        title: '🚨 红色高危预警',
        level: '高危',
        card_color: 'red'
    },
    success: {
        template: 'green',
        title: '📈 绿色利好预警',
        level: '利好',
        card_color: 'green'
    },
    primary: {
        template: 'blue',
        title: '📢 蓝色动向提醒',
        level: '关注',
        card_color: 'blue'
    }
};

/**
 * 构建飞书 Flow Webhook 负载 (6 字段 JSON)
 * @param {object} data - 推送数据
 * @returns {object} 6 字段 JSON 对象
 */
function buildFlowPayload(data) {
    const {
        stockName,
        stockCode,
        alertType,
        keywords,
        source,
        title,
        url,
        isAggregated,
        aggregatedCount,
        fullContent,
        totalTitles
    } = data;

    const config = ALERT_CONFIG[alertType] || ALERT_CONFIG.primary;

    // 格式化时间: YYYY-MM-DD HH:mm
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(/\//g, '-');

    // 构建正文内容
    let textContent = '';
    if (fullContent) {
        textContent = fullContent;
    } else {
        const keywordStr = keywords && keywords.length > 0 ? keywords.join(', ') : '无';
        textContent = `【${stockName} (${stockCode})】\n` +
            `预警等级: ${config.level}\n` +
            `命中关键词: ${keywordStr}\n` +
            `来源: ${source || '未知'}\n` +
            `标题: ${title || '无标题'}`;
        if (isAggregated) {
            textContent += `\n(已聚合 ${aggregatedCount} 条相关消息)`;
        }
    }

    // 返回 6 字段 JSON
    return {
        report_type: config.title,
        timestamp: timestamp,
        total_titles: totalTitles || 1,
        text: textContent,
        card_color: config.card_color,
        source_url: url || 'https://github.com'
    };
}

/**
 * 构建飞书交互式卡片 (兼容旧代码，内部调用 buildFlowPayload)
 * @param {object} data - 推送数据
 * @returns {object} 6 字段 JSON 对象
 */
function buildCard(data) {
    return buildFlowPayload(data);
}

/**
 * 构建聚合卡片
 * @param {object} mainData - 主消息数据
 * @param {Array} relatedItems - 相关消息列表
 */
function buildAggregatedCard(mainData, relatedItems) {
    return buildCard({
        ...mainData,
        isAggregated: true,
        aggregatedCount: relatedItems.length + 1
    });
}

/**
 * 发送飞书消息 (适配 Flow Webhook)
 * @param {object} payload - 6 字段 JSON 数据
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendToFeishu(payload) {
    if (!FEISHU_WEBHOOK) {
        console.error('[飞书] Webhook URL 未配置');
        return { success: false, error: 'Webhook URL 未配置' };
    }

    try {
        console.log('[飞书] 发送数据:', JSON.stringify(payload, null, 2));

        const response = await axios.post(FEISHU_WEBHOOK, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        // Flow Webhook 成功响应通常为 HTTP 200
        if (response.status === 200) {
            console.log('[飞书] 消息发送成功');
            return {
                success: true,
                messageId: response.data?.data?.message_id || 'flow_success'
            };
        } else {
            console.error('[飞书] 发送失败:', response.data);
            return {
                success: false,
                error: response.data?.msg || '发送失败'
            };
        }
    } catch (error) {
        console.error('[飞书] 请求失败:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 处理单条预警推送 (带频率控制)
 * @param {object} news - 新闻文档
 * @param {object} stock - 股票信息
 */
async function processAlert(news, stock) {
    const { alertType, hashId, title, source, sourceName, url, publishTime, matchedKeywords } = news;
    const { code: stockCode, name: stockName } = stock;

    if (!alertType) {
        return { sent: false, reason: '无预警类型' };
    }

    // 检查是否已推送过
    const existingRecord = await AlertRecord.findOne({ newsHashId: hashId });
    if (existingRecord) {
        return { sent: false, reason: '已推送过' };
    }

    // 检查频率控制 (非红色预警)
    const shouldSilence = await AlertRecord.shouldSilence(stockCode, alertType);
    if (shouldSilence) {
        // 创建静默记录
        await AlertRecord.createRecord({
            stockCode,
            stockName,
            alertType,
            newsHashId: hashId,
            newsTitle: title,
            matchedKeywords,
            source: sourceName || source,
            newsUrl: url,
            status: 'silenced'
        });

        return { sent: false, reason: '5分钟内静默' };
    }

    // 构建卡片
    const cardData = buildCard({
        stockName,
        stockCode,
        alertType,
        keywords: matchedKeywords || [],
        source: sourceName || source,
        time: publishTime,
        title,
        url
    });

    // 发送飞书消息
    const result = await sendToFeishu(cardData);

    // 创建推送记录
    await AlertRecord.createRecord({
        stockCode,
        stockName,
        alertType,
        newsHashId: hashId,
        newsTitle: title,
        matchedKeywords,
        source: sourceName || source,
        newsUrl: url,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error || '',
        feishuMessageId: result.messageId || ''
    });

    return {
        sent: result.success,
        messageId: result.messageId,
        error: result.error
    };
}

/**
 * 批量处理待推送预警
 */
async function processPendingAlerts() {
    // 获取待推送的重要新闻
    const pendingNews = await News.getPendingAlerts();

    if (pendingNews.length === 0) {
        return { processed: 0, sent: 0, silenced: 0, failed: 0 };
    }

    console.log(`[飞书] 待处理预警: ${pendingNews.length} 条`);

    let sent = 0;
    let silenced = 0;
    let failed = 0;

    for (const news of pendingNews) {
        // 获取关联股票
        const stocks = news.matchedStocks || [];

        for (const stock of stocks) {
            try {
                const result = await processAlert(news, stock);

                if (result.sent) {
                    sent++;
                    // 标记新闻已发送预警
                    await news.markAlertSent();
                } else if (result.reason === '5分钟内静默') {
                    silenced++;
                } else {
                    failed++;
                }

                // 限流
                await new Promise(r => setTimeout(r, 500));
            } catch (error) {
                console.error('[飞书] 处理失败:', error.message);
                failed++;
            }
        }
    }

    console.log(`[飞书] 处理完成: 发送=${sent}, 静默=${silenced}, 失败=${failed}`);

    return { processed: pendingNews.length, sent, silenced, failed };
}

/**
 * 发送测试消息 (使用 6 字段 Flow 格式)
 * @param {string} type - 预警类型 (danger/success/primary)
 */
async function sendTestMessage(type = 'danger') {
    const config = ALERT_CONFIG[type] || ALERT_CONFIG.danger;

    // 格式化时间
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(/\//g, '-');

    // 构建测试数据 (6 字段 JSON)
    const testPayload = {
        report_type: config.title,
        timestamp: timestamp,
        total_titles: 5,
        text: `【测试股票 (TEST001)】\n预警等级: ${config.level}\n命中关键词: 测试关键词, 预警测试\n来源: Private-Wind-Ultra\n这是一条测试预警消息，用于验证飞书 Flow Webhook 配置是否正确。`,
        card_color: config.card_color,
        source_url: 'https://github.com'
    };

    console.log('[飞书] 发送测试消息:', JSON.stringify(testPayload, null, 2));

    const result = await sendToFeishu(testPayload);

    return {
        success: result.success,
        type,
        payload: testPayload,
        error: result.error
    };
}

/**
 * 获取推送统计
 */
async function getStats() {
    const todayStats = await AlertRecord.getTodayStats();

    return {
        today: todayStats,
        webhookConfigured: !!FEISHU_WEBHOOK
    };
}

module.exports = {
    // 卡片构建
    buildCard,
    buildAggregatedCard,

    // 发送
    sendToFeishu,
    processAlert,
    processPendingAlerts,

    // 测试
    sendTestMessage,

    // 统计
    getStats,

    // 常量
    ALERT_CONFIG
};
