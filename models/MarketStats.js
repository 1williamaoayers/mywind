/**
 * MarketStats Model - 另类市场数据
 * 
 * 存储：
 * - 汇率数据（USD/CNH）
 * - 美债收益率
 * - 其他另类指标
 */

const mongoose = require('mongoose');

const MarketStatsSchema = new mongoose.Schema({
    // 指标类型
    indicator: {
        type: String,
        required: true,
        enum: ['usd_cnh', 'us_10y_yield', 'vix', 'gold', 'oil', 'btc'],
        index: true
    },

    // 数值
    value: {
        type: Number,
        required: true
    },

    // 变化率（百分比）
    changePercent: {
        type: Number,
        default: 0
    },

    // 数据来源
    source: {
        type: String,
        default: 'ocr'
    },

    // OCR 置信度
    ocrConfidence: {
        type: Number,
        default: 0
    },

    // 采集时间
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    collection: 'market_stats'
});

// 复合索引
MarketStatsSchema.index({ indicator: 1, timestamp: -1 });

/**
 * 静态方法：获取最新指标值
 */
MarketStatsSchema.statics.getLatest = async function (indicator) {
    return this.findOne({ indicator }).sort({ timestamp: -1 });
};

/**
 * 静态方法：获取指标历史（最近 N 条）
 */
MarketStatsSchema.statics.getHistory = async function (indicator, limit = 24) {
    return this.find({ indicator })
        .sort({ timestamp: -1 })
        .limit(limit);
};

/**
 * 静态方法：获取所有最新指标
 */
MarketStatsSchema.statics.getAllLatest = async function () {
    const indicators = ['usd_cnh', 'us_10y_yield', 'vix', 'gold', 'oil', 'btc'];
    const result = {};

    for (const ind of indicators) {
        const latest = await this.getLatest(ind);
        if (latest) {
            result[ind] = {
                value: latest.value,
                changePercent: latest.changePercent,
                timestamp: latest.timestamp
            };
        }
    }

    return result;
};

module.exports = mongoose.model('MarketStats', MarketStatsSchema);
