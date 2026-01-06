/**
 * 公告数据模型
 * 
 * 存储业绩公告、年报、季报等PDF文档信息
 */

const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
    // 股票信息
    stockCode: {
        type: String,
        required: true,
        index: true
    },
    stockName: {
        type: String,
        required: true
    },
    market: {
        type: String,
        default: 'HK'  // HK/US/A
    },

    // 公告信息
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['年报', '中期报告', '季报', '业绩公告', '股息公告', '其他'],
        default: '业绩公告'
    },
    year: {
        type: Number,
        index: true
    },
    quarter: {
        type: String,
        enum: ['Q1', 'Q2', 'Q3', 'Q4', null]
    },

    // 来源信息
    source: {
        type: String,
        enum: ['ths', 'hkex', 'sec'],
        default: 'ths'
    },
    sourceUrl: String,  // 原始公告页面URL

    // PDF信息
    pdfUrl: String,      // 原始PDF URL
    pdfPath: String,     // 本地存储路径
    pdfSize: Number,     // 文件大小(bytes)
    pdfValid: {
        type: Boolean,
        default: false
    },

    // 时间信息
    publishDate: {
        type: Date,
        index: true
    },
    crawlTime: {
        type: Date,
        default: Date.now
    },

    // 状态
    status: {
        type: String,
        enum: ['pending', 'downloading', 'downloaded', 'failed'],
        default: 'pending'
    },
    errorMsg: String,
    retryCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true  // createdAt, updatedAt
});

// 复合索引：按股票代码和年份查询
AnnouncementSchema.index({ stockCode: 1, year: -1 });
AnnouncementSchema.index({ stockCode: 1, publishDate: -1 });

// 唯一索引：防止重复采集
AnnouncementSchema.index({ stockCode: 1, title: 1 }, { unique: true });

/**
 * 静态方法：获取股票的公告列表
 */
AnnouncementSchema.statics.getByStock = async function (stockCode, options = {}) {
    const { year, type, limit = 50, page = 1 } = options;

    let query = { stockCode, status: 'downloaded' };
    if (year) query.year = year;
    if (type) query.type = type;

    const skip = (page - 1) * limit;

    return this.find(query)
        .sort({ publishDate: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * 静态方法：获取待下载的公告
 */
AnnouncementSchema.statics.getPending = async function (limit = 10) {
    return this.find({
        status: { $in: ['pending', 'failed'] },
        retryCount: { $lt: 3 }
    })
        .sort({ crawlTime: 1 })
        .limit(limit);
};

/**
 * 静态方法：获取统计信息
 */
AnnouncementSchema.statics.getStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalSize: { $sum: '$pdfSize' }
            }
        }
    ]);

    const byStock = await this.aggregate([
        { $match: { status: 'downloaded' } },
        {
            $group: {
                _id: '$stockCode',
                count: { $sum: 1 }
            }
        }
    ]);

    return { byStatus: stats, byStock };
};

module.exports = mongoose.model('Announcement', AnnouncementSchema);
