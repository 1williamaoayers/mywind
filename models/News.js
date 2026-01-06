/**
 * News Model - 新闻/公告数据模型
 * 
 * 使用 MD5 hashId 实现全局去重
 */

const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
    // MD5 唯一标识 (title + date + source)
    hashId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // 跨源识别哈希 (title + date，用于检测同一新闻在不同源出现)
    crossSourceHash: {
        type: String,
        index: true
    },

    // 数据来源标识 (如: xueqiu, cls, cninfo)
    source: {
        type: String,
        required: true,
        index: true
    },

    // 来源显示名称
    sourceName: {
        type: String,
        default: ''
    },

    // 维度分类 (可选，默认realtime)
    dimension: {
        type: String,
        required: false,  // 改为非必填，避免采集数据缺失此字段导致入库失败
        enum: ['official', 'deep_search', 'realtime', 'social', 'compliance', 'global', 'targeted'],
        default: 'realtime',  // 默认值
        index: true
    },

    // 标题
    title: {
        type: String,
        required: true,
        trim: true
    },

    // 正文摘要 (限制长度)
    content: {
        type: String,
        default: '',
        maxlength: 5000
    },

    // 原文链接
    url: {
        type: String,
        default: ''
    },

    // 发布时间
    publishTime: {
        type: Date,
        index: true
    },

    // 采集时间
    crawlTime: {
        type: Date,
        default: Date.now
    },

    // ========== 关键词匹配 ==========

    // 命中的关键词列表
    matchedKeywords: {
        type: [String],
        default: []
    },

    // 命中的矩阵层级 (决定预警级别)
    matchedLayer: {
        type: String,
        enum: ['direct', 'related', 'context', null],
        default: null
    },

    // 关联的股票 ID 列表
    matchedStocks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock'
    }],

    // ========== 预警相关 ==========

    // 是否为重要新闻 (需要预警)
    isImportant: {
        type: Boolean,
        default: false,
        index: true
    },

    // 预警类型: danger/success/primary/null
    alertType: {
        type: String,
        enum: ['danger', 'success', 'primary', null],
        default: null
    },

    // 预警已发送
    alertSent: {
        type: Boolean,
        default: false
    },

    // 预警发送时间
    alertSentAt: {
        type: Date
    },

    // ========== 处理状态 ==========

    // AI 处理状态
    isProcessed: {
        type: Boolean,
        default: false
    },

    // AI 摘要
    aiSummary: {
        type: String,
        default: ''
    },

    // 情感分析结果
    sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral', null],
        default: null
    },

    // ========== 元数据 ==========

    // 原始数据 (JSON格式保存)
    rawData: {
        type: mongoose.Schema.Types.Mixed,
        select: false  // 默认不查询
    }

}, {
    timestamps: true,
    collection: 'news'
});

// 复合索引: 加速常用查询
NewsSchema.index({ source: 1, publishTime: -1 });
NewsSchema.index({ dimension: 1, publishTime: -1 });
NewsSchema.index({ matchedLayer: 1, alertSent: 1 });
NewsSchema.index({ 'matchedStocks': 1, publishTime: -1 });

// 全文索引
NewsSchema.index({ title: 'text', content: 'text' });

/**
 * 静态方法: 按维度获取最新新闻
 */
NewsSchema.statics.getByDimension = function (dimension, limit = 50) {
    return this.find({ dimension })
        .sort({ publishTime: -1 })
        .limit(limit)
        .populate('matchedStocks', 'code name market');
};

/**
 * 静态方法: 获取待预警新闻
 */
NewsSchema.statics.getPendingAlerts = function () {
    return this.find({
        isImportant: true,
        alertSent: false,
        alertType: { $ne: null }
    })
        .sort({ publishTime: -1 })
        .populate('matchedStocks', 'code name market');
};

/**
 * 静态方法: 获取股票相关新闻
 */
NewsSchema.statics.getByStock = function (stockId, limit = 100) {
    return this.find({ matchedStocks: stockId })
        .sort({ publishTime: -1 })
        .limit(limit);
};

/**
 * 静态方法: 获取今日新闻统计
 */
NewsSchema.statics.getTodayStats = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.aggregate([
        { $match: { crawlTime: { $gte: today } } },
        {
            $group: {
                _id: { source: '$source', dimension: '$dimension' },
                count: { $sum: 1 },
                importantCount: {
                    $sum: { $cond: ['$isImportant', 1, 0] }
                }
            }
        },
        {
            $group: {
                _id: '$_id.dimension',
                sources: {
                    $push: {
                        source: '$_id.source',
                        count: '$count',
                        importantCount: '$importantCount'
                    }
                },
                totalCount: { $sum: '$count' }
            }
        }
    ]);

    return stats;
};

/**
 * 实例方法: 标记为已发送预警
 */
NewsSchema.methods.markAlertSent = function () {
    this.alertSent = true;
    this.alertSentAt = new Date();
    return this.save();
};

module.exports = mongoose.model('News', NewsSchema);
