/**
 * AI Service - AI 研报生成服务
 * 
 * 功能：
 * 1. 核心层+板块层数据聚合
 * 2. DeepSeek/GPT API 适配
 * 3. 流式输出 (SSE)
 * 4. 缓存策略 (同股当日返回缓存)
 * 5. Token 统计
 */

const axios = require('axios');
const News = require('../models/News');
const Stock = require('../models/Stock');
const Report = require('../models/Report');
const { sendToFeishu } = require('./notificationService');

// AI API 配置
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_API_BASE = process.env.AI_API_BASE || 'https://api.deepseek.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

// Token 保护配置
const MAX_TITLE_LENGTH = 100;      // 单条新闻标题最大字符数
const MAX_CONTENT_LENGTH = 500;    // 单条内容摘要最大字符数
const MAX_NEWS_COUNT = 8;          // 核心层最多新闻条数
const MAX_CONTEXT_COUNT = 4;       // 板块层最多新闻条数
const CONCURRENT_DELAY = 3000;     // 并发请求间隔 (毫秒)

/**
 * 构建分析师 Prompt
 */
function buildPrompt(stockName, stockCode, directNews, contextNews) {
    // 截断新闻列表，防止超出 Context Window
    const truncatedDirect = directNews.slice(0, MAX_NEWS_COUNT);
    const truncatedContext = contextNews.slice(0, MAX_CONTEXT_COUNT);

    const directList = truncatedDirect.length > 0
        ? truncatedDirect.map((n, i) => {
            const title = (n.title || '').substring(0, MAX_TITLE_LENGTH);
            const content = (n.content || '').substring(0, MAX_CONTENT_LENGTH);
            return `${i + 1}. [${n.sourceName}] ${title}${content ? '\n   ' + content : ''}`;
        }).join('\n')
        : '暂无直接相关新闻';

    const contextList = truncatedContext.length > 0
        ? truncatedContext.map((n, i) => {
            const title = (n.title || '').substring(0, MAX_TITLE_LENGTH);
            return `${i + 1}. [${n.sourceName}] ${title}`;
        }).join('\n')
        : '暂无板块背景新闻';

    return `你是一位资深的金融分析师，拥有20年A股、港股、美股投研经验。请根据以下信息撰写专业的每日复盘报告。

【股票信息】
${stockName} (${stockCode})

【核心层事实】(今日与该股直接相关的新闻)
${directList}

【板块层背景】(行业趋势、竞争对手动态)
${contextList}

请严格按照以下 JSON 格式输出，不要添加任何额外文字：

{
  "summary": "今日动态总结（100字以内，简明扼要）",
  "sentimentScore": 5,
  "risks": ["风险点1", "风险点2"],
  "opportunities": ["机会点1", "机会点2"],
  "fullContent": "完整分析报告（300-500字，包含技术面、消息面、资金面分析）"
}

注意：
1. sentimentScore 为 1-10 的整数，1=极度悲观，10=极度乐观
2. risks 和 opportunities 各列出 2-3 点
3. 保持客观专业，避免过度乐观或悲观`;
}

/**
 * 调用 AI API
 */
async function callAI(prompt, options = {}) {
    if (!AI_API_KEY) {
        throw new Error('AI_API_KEY 未配置');
    }

    const startTime = Date.now();

    try {
        const response = await axios.post(
            `${AI_API_BASE}/chat/completions`,
            {
                model: options.model || AI_MODEL,
                messages: [
                    { role: 'system', content: '你是一位专业的金融分析师，输出格式必须是有效的 JSON。' },
                    { role: 'user', content: prompt }
                ],
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2000,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${AI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        const latency = Date.now() - startTime;
        const data = response.data;
        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {};

        return {
            success: true,
            content,
            tokenUsage: {
                prompt: usage.prompt_tokens || 0,
                completion: usage.completion_tokens || 0,
                total: usage.total_tokens || 0
            },
            latency,
            model: data.model || AI_MODEL
        };
    } catch (error) {
        console.error('[AI] API 调用失败:', error.message);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message,
            latency: Date.now() - startTime
        };
    }
}

/**
 * 解析 AI 响应
 */
function parseAIResponse(content) {
    try {
        // 尝试提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                success: true,
                data: {
                    summary: parsed.summary || '解析失败',
                    sentimentScore: Math.min(10, Math.max(1, parseInt(parsed.sentimentScore) || 5)),
                    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
                    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
                    fullContent: parsed.fullContent || content
                }
            };
        }

        // JSON 解析失败，返回原始内容
        return {
            success: true,
            data: {
                summary: content.substring(0, 200),
                sentimentScore: 5,
                risks: [],
                opportunities: [],
                fullContent: content
            }
        };
    } catch (error) {
        return {
            success: false,
            error: '解析 AI 响应失败: ' + error.message
        };
    }
}

/**
 * 聚合股票相关新闻
 */
async function aggregateNews(stockId, stockCode) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 核心层新闻 (matchedLayer = direct)
    const directNews = await News.find({
        matchedStocks: stockId,
        matchedLayer: 'direct',
        publishTime: { $gte: today }
    })
        .sort({ publishTime: -1 })
        .limit(10)
        .lean();

    // 板块层新闻 (matchedLayer = context)
    const contextNews = await News.find({
        matchedStocks: stockId,
        matchedLayer: 'context',
        publishTime: { $gte: today }
    })
        .sort({ publishTime: -1 })
        .limit(5)
        .lean();

    return { directNews, contextNews };
}

/**
 * 生成单只股票的 AI 研报
 */
async function generateReport(stockId, options = {}) {
    const { forceRefresh = false, triggerType = 'manual' } = options;

    // 获取股票信息
    const stock = await Stock.findById(stockId);
    if (!stock) {
        throw new Error('股票不存在');
    }

    const { code: stockCode, name: stockName } = stock;
    const reportDate = new Date().toISOString().split('T')[0];

    // 检查缓存
    if (!forceRefresh) {
        const cached = await Report.getTodayCache(stockCode);
        if (cached) {
            console.log(`[AI] 返回缓存研报: ${stockCode}`);
            return { success: true, report: cached, fromCache: true };
        }
    }

    console.log(`[AI] 开始生成研报: ${stockCode} ${stockName}`);

    // 聚合新闻
    const { directNews, contextNews } = await aggregateNews(stockId, stockCode);

    if (directNews.length === 0 && contextNews.length === 0) {
        console.log(`[AI] ${stockCode} 今日无相关新闻，跳过`);
        return { success: false, error: '今日无相关新闻' };
    }

    // 创建或更新研报记录
    let report = await Report.findOneAndUpdate(
        { stockCode, reportDate },
        {
            stockId,
            stockCode,
            stockName,
            reportDate,
            status: 'generating',
            triggerType,
            directNewsCount: directNews.length,
            contextNewsCount: contextNews.length,
            referencedNews: [...directNews, ...contextNews].map(n => n._id)
        },
        { upsert: true, new: true }
    );

    try {
        // 构建 Prompt
        const prompt = buildPrompt(stockName, stockCode, directNews, contextNews);

        // 调用 AI
        const aiResult = await callAI(prompt);

        if (!aiResult.success) {
            report.status = 'failed';
            report.errorMessage = aiResult.error;
            await report.save();
            return { success: false, error: aiResult.error };
        }

        // 解析响应
        const parseResult = parseAIResponse(aiResult.content);

        if (!parseResult.success) {
            report.status = 'failed';
            report.errorMessage = parseResult.error;
            await report.save();
            return { success: false, error: parseResult.error };
        }

        // 更新研报
        const { summary, sentimentScore, risks, opportunities, fullContent } = parseResult.data;

        report.summary = summary;
        report.sentimentScore = sentimentScore;
        report.sentimentLabel = Report.scoreToLabel(sentimentScore);
        report.risks = risks;
        report.opportunities = opportunities;
        report.fullContent = fullContent;
        report.model = aiResult.model;
        report.tokenUsage = aiResult.tokenUsage;
        report.latency = aiResult.latency;
        report.status = 'completed';

        await report.save();

        console.log(`[AI] 研报生成完成: ${stockCode}, Token: ${aiResult.tokenUsage.total}, 耗时: ${aiResult.latency}ms`);

        return { success: true, report, fromCache: false };

    } catch (error) {
        report.status = 'failed';
        report.errorMessage = error.message;
        await report.save();

        return { success: false, error: error.message };
    }
}

/**
 * 批量生成所有股票研报
 */
async function generateAllReports(options = {}) {
    const { triggerType = 'scheduled' } = options;

    const stocks = await Stock.find({ isActive: true });

    if (stocks.length === 0) {
        console.log('[AI] 没有激活的股票');
        return { total: 0, success: 0, failed: 0, cached: 0 };
    }

    console.log(`[AI] 开始批量生成研报: ${stocks.length} 只股票`);

    let success = 0;
    let failed = 0;
    let cached = 0;

    for (const stock of stocks) {
        try {
            const result = await generateReport(stock._id, { triggerType });

            if (result.success) {
                if (result.fromCache) {
                    cached++;
                } else {
                    success++;
                }
            } else {
                failed++;
            }

            // 并发限流保护：增加延时防止 API 封禁
            console.log(`[AI] 等待 ${CONCURRENT_DELAY}ms 后处理下一只股票...`);
            await new Promise(r => setTimeout(r, CONCURRENT_DELAY));
        } catch (error) {
            console.error(`[AI] ${stock.code} 生成失败:`, error.message);
            failed++;
            // 失败后等待更长时间
            await new Promise(r => setTimeout(r, CONCURRENT_DELAY * 2));
        }
    }

    console.log(`[AI] 批量生成完成: 成功=${success}, 缓存=${cached}, 失败=${failed}`);

    return { total: stocks.length, success, failed, cached };
}

/**
 * 构建飞书研报卡片
 */
function buildReportCard(report) {
    const { stockName, stockCode, summary, sentimentScore, sentimentLabel, risks, opportunities } = report;

    // 情绪颜色
    let template = 'blue';
    if (sentimentScore >= 7) template = 'green';
    else if (sentimentScore <= 3) template = 'red';

    const riskText = risks.length > 0 ? risks.map(r => `• ${r}`).join('\n') : '暂无';
    const oppText = opportunities.length > 0 ? opportunities.map(o => `• ${o}`).join('\n') : '暂无';

    return {
        msg_type: 'interactive',
        card: {
            config: { wide_screen_mode: true },
            header: {
                template,
                title: {
                    tag: 'plain_text',
                    content: `📊 AI 每日复盘 | ${stockName}`
                }
            },
            elements: [
                {
                    tag: 'markdown',
                    content: `**【${stockName} (${stockCode})】**\n情绪评分: **${sentimentScore}/10** (${sentimentLabel})`
                },
                { tag: 'hr' },
                {
                    tag: 'markdown',
                    content: `📝 **今日总结**\n${summary}`
                },
                { tag: 'hr' },
                {
                    tag: 'column_set',
                    flex_mode: 'bisect',
                    columns: [
                        {
                            tag: 'column',
                            width: 'weighted',
                            weight: 1,
                            elements: [{
                                tag: 'markdown',
                                content: `⚠️ **风险点**\n${riskText}`
                            }]
                        },
                        {
                            tag: 'column',
                            width: 'weighted',
                            weight: 1,
                            elements: [{
                                tag: 'markdown',
                                content: `💡 **机会点**\n${oppText}`
                            }]
                        }
                    ]
                },
                { tag: 'hr' },
                {
                    tag: 'action',
                    actions: [{
                        tag: 'button',
                        text: { tag: 'plain_text', content: '📖 阅读完整研报' },
                        type: 'primary',
                        url: `${process.env.APP_URL || 'http://localhost:8088'}/report/${report._id}`
                    }]
                }
            ]
        }
    };
}

/**
 * 发送研报到飞书
 */
async function sendReportToFeishu(report) {
    if (report.feishuSent) {
        return { success: false, error: '已发送过' };
    }

    const card = buildReportCard(report);
    const result = await sendToFeishu(card);

    if (result.success) {
        await report.markFeishuSent();
    }

    return result;
}

/**
 * 获取 Token 使用统计
 */
async function getTokenStats(days = 30) {
    return Report.getTokenStats(days);
}

module.exports = {
    // 核心功能
    generateReport,
    generateAllReports,

    // 飞书推送
    buildReportCard,
    sendReportToFeishu,

    // 辅助
    aggregateNews,
    callAI,
    parseAIResponse,
    buildPrompt,
    getTokenStats,

    // 常量
    AI_MODEL
};
