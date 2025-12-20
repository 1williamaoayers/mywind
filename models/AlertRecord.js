/**
 * AlertRecord Model - 预警推送记录
 * 
 * 用于频率控制：同一股票5分钟内同级别预警静默处理
 */

const mongoose = require('mongoose');

const AlertRecordSchema = new mongoose.Schema({
    // 股票代码
    stockCode: {
        type: String,
        required: true,
        index: true
    },

    // 股票名称
    stockName: {
        type: String,
        default: ''
    },

    // 预警类型: danger/success/primary
    alertType: {
        type: String,
        required: true,
        enum: ['danger', 'success', 'primary'],
        index: true
    },

    // 关联的新闻 hashId
    newsHashId: {
        type: String,
        required: true,
        unique: true
    },

    // 新闻标题
    newsTitle: {
        type: String,
        default: ''
    },

    // 命中关键词
    matchedKeywords: {
        type: [String],
        default: []
    },

    // 来源
    source: {
        type: String,
        default: ''
    },

    // 原文链接
    newsUrl: {
        type: String,
        default: ''
    },

    // 发送时间
    sentAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    // 过期时间 (sentAt + 5分钟，用于频率控制)
    expiresAt: {
        type: Date,
        index: true
    },

    // 发送状态
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'silenced'],
        default: 'pending'
    },

    // 错误信息
    errorMessage: {
        type: String,
        default: ''
    },

    // 是否为聚合消息
    isAggregated: {
        type: Boolean,
        default: false
    },

    // 聚合的消息数量
    aggregatedCount: {
        type: Number,
        default: 1
    },

    // 飞书消息ID (用于回调确认)
    feishuMessageId: {
        type: String,
        default: ''
    }

}, {
    timestamps: true,
    collection: 'alert_records'
});

// 复合索引：频率控制查询
AlertRecordSchema.index({ stockCode: 1, alertType: 1, expiresAt: 1 });

// TTL 索引：自动清理30天前的记录
AlertRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

/**
 * 静态方法：检查是否需要静默
 * @param {string} stockCode - 股票代码
 * @param {string} alertType - 预警类型
 * @returns {Promise<boolean>} true=需要静默
 */
AlertRecordSchema.statics.shouldSilence = async function (stockCode, alertType) {
    // 红色预警不静默
    if (alertType === 'danger') {
        return false;
    }

    const now = new Date();

    // 查找5分钟内同股同级的记录
    const recent = await this.findOne({
        stockCode,
        alertType,
        expiresAt: { $gt: now },
        status: 'sent'
    });

    return !!recent;
};

/**
 * 静态方法：创建预警记录
 */
AlertRecordSchema.statics.createRecord = async function (data) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5分钟后过期

    return this.create({
        ...data,
        sentAt: now,
        expiresAt
    });
};

/**
 * 静态方法：获取待聚合的消息
 * @param {string} stockCode - 股票代码
 * @param {number} minutes - 时间窗口
 */
AlertRecordSchema.statics.getPendingForAggregation = async function (stockCode, minutes = 5) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    return this.find({
        stockCode,
        status: 'pending',
        createdAt: { $gte: since }
    }).sort({ createdAt: 1 });
};

/**
 * 静态方法：获取今日推送统计
 */
AlertRecordSchema.statics.getTodayStats = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.aggregate([
        { $match: { sentAt: { $gte: today } } },
        {
            $group: {
                _id: '$alertType',
                count: { $sum: 1 },
                silencedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'silenced'] }, 1, 0] }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('AlertRecord', AlertRecordSchema);
