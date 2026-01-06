/**
 * DeepSeek AI 服务模块
 * 
 * 功能：
 * 1. 调用DeepSeek API进行对话
 * 2. 股票分析
 * 3. 研报生成
 */

// DeepSeek配置
const DEEPSEEK_CONFIG = {
    apiKey: process.env.AI_API_KEY || 'sk-a1c794ab1969492aa06f7d1177af0451',
    apiBase: process.env.AI_API_BASE || 'https://api.deepseek.com/v1',
    model: process.env.AI_MODEL || 'deepseek-chat'
};

/**
 * 调用DeepSeek API
 */
async function callDeepSeek(messages, options = {}) {
    const { temperature = 0.7, maxTokens = 2000 } = options;

    const requestBody = {
        model: DEEPSEEK_CONFIG.model,
        messages,
        temperature,
        max_tokens: maxTokens
    };

    console.log('[DeepSeek] 调用API...');

    try {
        const response = await fetch(`${DEEPSEEK_CONFIG.apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API错误: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '';

        console.log(`[DeepSeek] 回复长度: ${reply.length}字`);

        return {
            success: true,
            content: reply,
            usage: data.usage
        };
    } catch (error) {
        console.error('[DeepSeek] 调用失败:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 智能投资问答
 */
async function investmentChat(question, context = {}) {
    const systemPrompt = `你是MyWind智能投研终端的AI助手，专注于A股、港股、美股投资分析。

你的能力：
1. 分析股票基本面和技术面
2. 解读最新市场资讯
3. 提供投资观点和建议
4. 回答投资相关问题

注意事项：
- 回答要专业、简洁
- 提供具体的数据和分析
- 使用Markdown格式输出
- 如果涉及具体投资建议，请加风险提示

${context.stockData ? `用户订阅的股票信息：${JSON.stringify(context.stockData)}` : ''}
`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
    ];

    const result = await callDeepSeek(messages, { temperature: 0.7 });

    return result;
}

/**
 * 股票分析
 */
async function analyzeStock(stockName, stockCode, newsData = []) {
    const prompt = `请分析股票 ${stockName}（${stockCode}）：

${newsData.length > 0 ? `最近的相关资讯：
${newsData.map((n, i) => `${i + 1}. ${n.title}`).join('\n')}` : ''}

请从以下几个方面分析：
1. 基本面分析
2. 近期资讯解读
3. 技术面观点
4. 风险提示
5. 投资建议

请用Markdown格式输出，结构清晰。`;

    const messages = [
        {
            role: 'system',
            content: '你是专业的证券分析师，擅长A股、港股分析。请提供专业、客观的分析。'
        },
        { role: 'user', content: prompt }
    ];

    return await callDeepSeek(messages, { temperature: 0.5, maxTokens: 3000 });
}

/**
 * 板块分析
 */
async function analyzeSector(sectorName) {
    const prompt = `请分析${sectorName}板块的最新情况：

请包含：
1. 板块近期表现
2. 驱动因素分析
3. 龙头个股点评
4. 投资机会与风险
5. 操作建议

请用Markdown格式输出。`;

    const messages = [
        {
            role: 'system',
            content: '你是专业的行业研究员，擅长行业分析和投资策略。'
        },
        { role: 'user', content: prompt }
    ];

    return await callDeepSeek(messages, { temperature: 0.6 });
}

/**
 * 生成每日投研摘要
 */
async function generateDailySummary(news = [], marketData = {}) {
    const prompt = `请根据以下信息生成今日投研摘要：

市场数据：
${JSON.stringify(marketData, null, 2)}

今日重点资讯：
${news.slice(0, 10).map((n, i) => `${i + 1}. ${n.title}`).join('\n')}

请生成一份简洁的投研摘要，包括：
1. 今日市场回顾（2-3句话）
2. 重点资讯解读（选取3-5条重要的）
3. 明日关注点

使用Markdown格式。`;

    const messages = [
        {
            role: 'system',
            content: '你是专业的投资研究员，擅长撰写简洁精炼的投研报告。'
        },
        { role: 'user', content: prompt }
    ];

    return await callDeepSeek(messages, { temperature: 0.5 });
}

/**
 * 研报摘要
 */
async function summarizeReport(reportContent) {
    const prompt = `请对以下研究报告进行摘要：

${reportContent.substring(0, 5000)}

请提取：
1. 核心观点（3-5点）
2. 投资评级
3. 目标价（如果有）
4. 关键风险

使用Markdown格式，控制在300字以内。`;

    const messages = [
        {
            role: 'system',
            content: '你是专业的研报分析师，擅长提取研报核心要点。'
        },
        { role: 'user', content: prompt }
    ];

    return await callDeepSeek(messages, { temperature: 0.3, maxTokens: 1000 });
}

module.exports = {
    callDeepSeek,
    investmentChat,
    analyzeStock,
    analyzeSector,
    generateDailySummary,
    summarizeReport,
    DEEPSEEK_CONFIG
};
