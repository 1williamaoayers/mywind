/**
 * Report Model - AI 研报存储
 * 
 * 支持历史查询和缓存策略
 */

const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    // 关联股票
    stockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock',
        required: true,
        index: true
    },

    // 股票代码
    stockCode: {
        type: String,
        required: true,
        index: true
    },

    // 股票名称
    stockName: {
        type: String,
        required: true
    },

    // 报告日期 (YYYY-MM-DD)
    reportDate: {
        type: String,
        required: true,
        index: true
    },

    // ========== AI 生成内容 ==========

    // 今日动态总结
    summary: {
        type: String,
        required: true
    },

    // 情绪评分 (1-10)
    sentimentScore: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },

    // 情绪标签
    sentimentLabel: {
        type: String,
        enum: ['极度悲观', '悲观', '偏悲观', '中性偏空', '中性', '中性偏多', '偏乐观', '乐观', '极度乐观'],
        default: '中性'
    },

    // 潜在风险点
    risks: {
        type: [String],
        default: []
    },

    // 潜在机会点
    opportunities: {
        type: [String],
        default: []
    },

    // 完整研报内容
    fullContent: {
        type: String,
        default: ''
    },

    // ========== 数据来源 ==========

    // 核心层新闻数量
    directNewsCount: {
        type: Number,
        default: 0
    },

    // 板块层新闻数量
    contextNewsCount: {
        type: Number,
        default: 0
    },

    // 引用的新闻 ID
    referencedNews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'News'
    }],

    // ========== AI 调用信息 ==========

    // 使用的模型
    model: {
        type: String,
        default: 'deepseek-chat'
    },

    // Token 消耗
    tokenUsage: {
        prompt: { type: Number, default: 0 },
        completion: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },

    // API 调用耗时 (ms)
    latency: {
        type: Number,
        default: 0
    },

    // ========== 状态 ==========

    // 生成状态
    status: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed'],
        default: 'pending'
    },

    // 错误信息
    errorMessage: {
        type: String,
        default: ''
    },

    // 是否已推送飞书
    feishuSent: {
        type: Boolean,
        default: false
    },

    // 飞书推送时间
    feishuSentAt: {
        type: Date
    },

    // 触发方式
    triggerType: {
        type: String,
        enum: ['scheduled', 'manual'],
        default: 'manual'
    }

}, {
    timestamps: true,
    collection: 'reports'
});

// 复合唯一索引：每股每天只能有一份研报
ReportSchema.index({ stockCode: 1, reportDate: 1 }, { unique: true });

// TTL 索引：90天后自动清理
ReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * 静态方法：获取今日缓存的研报
 */
ReportSchema.statics.getTodayCache = async function (stockCode) {
    const today = new Date().toISOString().split('T')[0];
    return this.findOne({
        stockCode,
        reportDate: today,
        status: 'completed'
    });
};

/**
 * 静态方法：获取股票历史研报
 */
ReportSchema.statics.getHistory = function (stockCode, limit = 30) {
    return this.find({ stockCode, status: 'completed' })
        .sort({ reportDate: -1 })
        .limit(limit);
};

/**
 * 静态方法：获取今日所有研报
 */
ReportSchema.statics.getTodayReports = function () {
    const today = new Date().toISOString().split('T')[0];
    return this.find({ reportDate: today })
        .sort({ createdAt: -1 })
        .populate('stockId', 'code name market');
};

/**
 * 静态方法：获取 Token 使用统计
 */
ReportSchema.statics.getTokenStats = async function (days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'completed' } },
        {
            $group: {
                _id: '$model',
                totalPromptTokens: { $sum: '$tokenUsage.prompt' },
                totalCompletionTokens: { $sum: '$tokenUsage.completion' },
                totalTokens: { $sum: '$tokenUsage.total' },
                reportCount: { $sum: 1 },
                avgLatency: { $avg: '$latency' }
            }
        }
    ]);
};

/**
 * 实例方法：标记飞书已发送
 */
ReportSchema.methods.markFeishuSent = function () {
    this.feishuSent = true;
    this.feishuSentAt = new Date();
    return this.save();
};

/**
 * 情绪评分转标签
 */
ReportSchema.statics.scoreToLabel = function (score) {
    const labels = [
        '极度悲观', '悲观', '偏悲观', '中性偏空', '中性',
        '中性偏多', '偏乐观', '乐观', '极度乐观'
    ];
    const index = Math.min(Math.max(Math.round(score) - 1, 0), 8);
    return labels[index];
};

module.exports = mongoose.model('Report', ReportSchema);
