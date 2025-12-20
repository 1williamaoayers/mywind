/**
 * Hash Utils - MD5 内容去重工具
 * 
 * 去重规则：基于 title + date + source 生成 hashId
 * 无日期时默认使用抓取当天日期，确保跨源重复识别
 */

const crypto = require('crypto');

/**
 * 格式化日期为 YYYY-MM-DD 字符串 (只取日期部分)
 * @param {Date|string|number} date - 日期
 * @returns {string} YYYY-MM-DD 格式
 */
function formatDateOnly(date) {
    let d;

    if (!date) {
        d = new Date();
    } else if (date instanceof Date) {
        d = date;
    } else if (typeof date === 'number') {
        d = new Date(date);
    } else {
        d = new Date(date);
    }

    // 无效日期使用当天
    if (isNaN(d.getTime())) {
        d = new Date();
    }

    return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * 生成内容 MD5 哈希
 * 规则: title + date(YYYY-MM-DD) + source
 * 
 * @param {string} source - 来源标识
 * @param {string} title - 标题
 * @param {string|Date} publishTime - 发布时间 (无则使用当天)
 * @returns {string} 32位 MD5 哈希
 */
function generateHashId(source, title, publishTime) {
    const dateStr = formatDateOnly(publishTime);

    // 标准化标题: 去除首尾空白、转小写
    const normalizedTitle = String(title || '').trim().toLowerCase();
    const normalizedSource = String(source || '').toLowerCase().trim();

    const content = [
        normalizedTitle,
        dateStr,
        normalizedSource
    ].join('|');

    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

/**
 * 生成跨源识别哈希 (仅基于标题和日期，用于检测同一新闻在不同源出现)
 * @param {string} title - 标题
 * @param {string|Date} publishTime - 发布时间
 * @returns {string} 32位 MD5 哈希
 */
function generateCrossSourceHash(title, publishTime) {
    const dateStr = formatDateOnly(publishTime);
    const normalizedTitle = String(title || '').trim().toLowerCase();

    const content = `${normalizedTitle}|${dateStr}`;
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

/**
 * 生成简单内容哈希 (仅基于标题和来源)
 * @param {string} source - 来源
 * @param {string} title - 标题
 * @returns {string} 32位 MD5 哈希
 */
function generateSimpleHash(source, title) {
    const content = `${String(source).toLowerCase()}|${String(title).trim().toLowerCase()}`;
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

/**
 * 批量检查哈希是否已存在
 * @param {mongoose.Model} NewsModel - News 模型
 * @param {string[]} hashIds - 哈希 ID 数组
 * @returns {Promise<Set<string>>} 已存在的哈希集合
 */
async function checkExistingHashes(NewsModel, hashIds) {
    if (!hashIds || hashIds.length === 0) {
        return new Set();
    }

    const existing = await NewsModel.find(
        { hashId: { $in: hashIds } },
        { hashId: 1 }
    ).lean();

    return new Set(existing.map(doc => doc.hashId));
}

/**
 * 检查跨源重复 (同一标题+日期在任意源已存在)
 * @param {mongoose.Model} NewsModel - News 模型
 * @param {string} title - 标题
 * @param {Date} publishTime - 发布时间
 * @returns {Promise<boolean>} 是否存在
 */
async function checkCrossSourceDuplicate(NewsModel, title, publishTime) {
    const crossHash = generateCrossSourceHash(title, publishTime);

    const existing = await NewsModel.findOne(
        { crossSourceHash: crossHash },
        { _id: 1 }
    ).lean();

    return !!existing;
}

/**
 * 过滤已存在的内容
 * @param {mongoose.Model} NewsModel - News 模型
 * @param {Array<{hashId: string, ...}>} items - 待插入的内容数组
 * @returns {Promise<Array>} 未重复的内容数组
 */
async function filterDuplicates(NewsModel, items) {
    if (!items || items.length === 0) {
        return [];
    }

    const hashIds = items.map(item => item.hashId);
    const existingSet = await checkExistingHashes(NewsModel, hashIds);

    return items.filter(item => !existingSet.has(item.hashId));
}

/**
 * 安全插入 (检查重复后插入)
 * @param {mongoose.Model} NewsModel - News 模型
 * @param {object} newsData - 新闻数据
 * @returns {Promise<object|null>} 插入的文档或 null (如果重复)
 */
async function safeInsert(NewsModel, newsData) {
    // 确保有发布时间，无则使用当天
    if (!newsData.publishTime) {
        newsData.publishTime = new Date();
    }

    if (!newsData.hashId) {
        newsData.hashId = generateHashId(
            newsData.source,
            newsData.title,
            newsData.publishTime
        );
    }

    // 添加跨源哈希
    newsData.crossSourceHash = generateCrossSourceHash(
        newsData.title,
        newsData.publishTime
    );

    try {
        // 使用 upsert 避免并发插入问题
        const result = await NewsModel.findOneAndUpdate(
            { hashId: newsData.hashId },
            { $setOnInsert: newsData },
            { upsert: true, new: true, rawResult: true }
        );

        // 如果是新插入的文档
        if (result.lastErrorObject?.upserted) {
            return result.value;
        }

        // 已存在，返回 null
        return null;
    } catch (error) {
        // 处理并发 upsert 可能的 duplicate key 错误
        if (error.code === 11000) {
            return null;
        }
        throw error;
    }
}

/**
 * 批量安全插入
 * @param {mongoose.Model} NewsModel - News 模型
 * @param {Array<object>} newsItems - 新闻数据数组
 * @returns {Promise<{inserted: number, duplicates: number}>}
 */
async function safeBatchInsert(NewsModel, newsItems) {
    if (!newsItems || newsItems.length === 0) {
        return { inserted: 0, duplicates: 0 };
    }

    // 预生成所有 hashId
    const itemsWithHash = newsItems.map(item => {
        // 确保有发布时间
        const publishTime = item.publishTime || new Date();

        return {
            ...item,
            publishTime,
            hashId: item.hashId || generateHashId(
                item.source,
                item.title,
                publishTime
            ),
            crossSourceHash: generateCrossSourceHash(item.title, publishTime)
        };
    });

    // 过滤重复
    const uniqueItems = await filterDuplicates(NewsModel, itemsWithHash);
    const duplicateCount = itemsWithHash.length - uniqueItems.length;

    if (uniqueItems.length === 0) {
        return { inserted: 0, duplicates: duplicateCount };
    }

    // 批量插入
    try {
        const result = await NewsModel.insertMany(uniqueItems, { ordered: false });
        return {
            inserted: result.length,
            duplicates: duplicateCount
        };
    } catch (error) {
        // 处理部分插入成功的情况
        if (error.insertedDocs) {
            return {
                inserted: error.insertedDocs.length,
                duplicates: duplicateCount + (uniqueItems.length - error.insertedDocs.length)
            };
        }
        throw error;
    }
}

module.exports = {
    generateHashId,
    generateSimpleHash,
    generateCrossSourceHash,
    formatDateOnly,
    checkExistingHashes,
    checkCrossSourceDuplicate,
    filterDuplicates,
    safeInsert,
    safeBatchInsert
};
