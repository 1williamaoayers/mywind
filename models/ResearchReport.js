/**
 * Research Report Model - 第三方研报采集
 * 
 * 与 Report.js (AI 生成) 区分
 * 本模型用于存储从各研报源采集的原始研报
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const ResearchReportSchema = new mongoose.Schema({
    // ========== 研报指纹（去重用）==========
    fingerprint: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // ========== 基本信息 ==========
    title: {
        type: String,
        required: true,
        index: true
    },

    // 摘要
    summary: {
        type: String,
        default: ''
    },

    // 完整内容（如果能获取）
    content: {
        type: String,
        default: ''
    },

    // 原始 URL
    url: {
        type: String,
        default: ''
    },

    // PDF 链接
    pdfUrl: {
        type: String,
        default: ''
    },

    // ========== 研报元数据 ==========

    // 来源平台
    source: {
        type: String,
        required: true,
        enum: [
            'fxbaogao',      // 发现报告
            'eastmoney',     // 东方财富
            'hibor',         // 慧博
            'yanbaoke',      // 研报客
            'wechat',        // 微信公众号
            'broker',        // 券商官网
            'other'
        ],
        index: true
    },

    // 来源名称
    sourceName: {
        type: String,
        default: ''
    },

    // 券商/机构
    broker: {
        type: String,
        default: '',
        index: true
    },

    // 分析师
    analyst: {
        type: String,
        default: ''
    },

    // 分析师团队
    analystTeam: {
        type: [String],
        default: []
    },

    // 评级
    rating: {
        type: String,
        enum: ['买入', '增持', '持有', '减持', '卖出', '推荐', '谨慎推荐', '中性', '回避', ''],
        default: ''
    },

    // 目标价
    targetPrice: {
        type: Number,
        default: null
    },

    // ========== 关联信息 ==========

    // 关联股票代码
    stockCodes: {
        type: [String],
        default: [],
        index: true
    },

    // 关联股票名称
    stockNames: {
        type: [String],
        default: []
    },

    // 行业
    industry: {
        type: String,
        default: ''
    },

    // 研报类型
    reportType: {
        type: String,
        enum: ['深度', '点评', '晨会纪要', '电话会议', '行业', '宏观', '策略', '其他'],
        default: '其他'
    },

    // ========== 时间信息 ==========

    // 发布日期
    publishDate: {
        type: Date,
        default: Date.now,
        index: true
    },

    // 采集时间
    fetchedAt: {
        type: Date,
        default: Date.now
    },

    // ========== 处理状态 ==========

    // 是否已 AI 分析
    aiAnalyzed: {
        type: Boolean,
        default: false
    },

    // AI 分析结果
    aiAnalysis: {
        type: String,
        default: ''
    },

    // 是否已推送
    pushed: {
        type: Boolean,
        default: false
    },

    // 页数（如果是 PDF）
    pageCount: {
        type: Number,
        default: 0
    },

    // 截图路径（如果是视觉采集）
    screenshotPath: {
        type: String,
        default: ''
    },

    // OCR 置信度
    ocrConfidence: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true,
    collection: 'research_reports'
});

// 复合索引
ResearchReportSchema.index({ source: 1, publishDate: -1 });
ResearchReportSchema.index({ broker: 1, publishDate: -1 });
ResearchReportSchema.index({ stockCodes: 1, publishDate: -1 });

// TTL 索引：180天后自动清理
ResearchReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

/**
 * 静态方法：生成研报指纹
 * 用于去重：同一标题+分析师+券商 = 同一研报
 */
ResearchReportSchema.statics.generateFingerprint = function (title, analyst = '', broker = '') {
    const normalized = `${title.trim()}|${analyst.trim()}|${broker.trim()}`.toLowerCase();
    return crypto.createHash('md5').update(normalized).digest('hex');
};

/**
 * 静态方法：检查研报是否已存在
 */
ResearchReportSchema.statics.exists = async function (title, analyst = '', broker = '') {
    const fingerprint = this.generateFingerprint(title, analyst, broker);
    const existing = await this.findOne({ fingerprint });
    return !!existing;
};

/**
 * 静态方法：插入研报（去重）
 */
ResearchReportSchema.statics.upsertReport = async function (reportData) {
    const fingerprint = this.generateFingerprint(
        reportData.title,
        reportData.analyst || '',
        reportData.broker || ''
    );

    return this.findOneAndUpdate(
        { fingerprint },
        { $setOnInsert: { ...reportData, fingerprint } },
        { upsert: true, new: true }
    );
};

/**
 * 静态方法：获取最新研报
 */
ResearchReportSchema.statics.getLatest = function (limit = 20, filter = {}) {
    return this.find(filter)
        .sort({ publishDate: -1 })
        .limit(limit);
};

/**
 * 静态方法：按券商分组统计
 */
ResearchReportSchema.statics.statsByBroker = async function (days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.aggregate([
        { $match: { publishDate: { $gte: since } } },
        { $group: { _id: '$broker', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
    ]);
};

/**
 * 静态方法：搜索研报
 */
ResearchReportSchema.statics.search = function (keyword, limit = 20) {
    const regex = new RegExp(keyword, 'i');
    return this.find({
        $or: [
            { title: regex },
            { summary: regex },
            { stockNames: regex },
            { broker: regex },
            { analyst: regex }
        ]
    })
        .sort({ publishDate: -1 })
        .limit(limit);
};

module.exports = mongoose.model('ResearchReport', ResearchReportSchema);
