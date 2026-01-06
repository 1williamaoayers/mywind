/**
 * Vector Index Service - 向量索引服务
 * 
 * 负责将采集到的新闻/公告同步到 ChromaDB 向量库
 * 调用 OCR 服务的 /index API
 */

const axios = require('axios');

// OCR 服务地址（包含 RAG 向量库 API）
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:9000';

// 创建 axios 实例，禁用代理 (避免系统代理干扰本地服务调用)
const httpClient = axios.create({
    baseURL: OCR_SERVICE_URL,
    timeout: 30000,
    proxy: false  // 🔴 禁用代理，直连本地服务
});

// 索引统计
const indexStats = {
    totalIndexed: 0,
    totalFailed: 0,
    lastIndexTime: null,
    bySource: {},
    errors: []
};

/**
 * 索引单条文档到向量库
 * 
 * @param {Object} doc - 文档对象
 * @param {string} doc.title - 标题
 * @param {string} doc.content - 内容
 * @param {string} doc.source - 来源
 * @param {string} doc.url - 链接
 * @param {string} docType - 文档类型 (news, announcement, report)
 * @returns {Object} - { success, chunks_indexed, error }
 */
async function indexDocument(doc, docType = 'news') {
    // 跳过没有内容的文档
    const content = doc.content || doc.summary || doc.title || '';
    if (!content || content.length < 20) {
        return { success: false, error: '内容太短，跳过索引' };
    }

    try {
        const response = await httpClient.post('/index', {
            content: content,
            source: doc.source || 'unknown',
            doc_type: docType,
            metadata: {
                title: doc.title || '',
                url: doc.url || '',
                publishTime: doc.publishTime ? doc.publishTime.toISOString?.() || String(doc.publishTime) : '',
                // ChromaDB metadata 不支持数组，转换为逗号分隔的字符串
                relatedStocks: Array.isArray(doc.relatedStocks) ? doc.relatedStocks.join(',') : ''
            }
        }, {
            timeout: 30000,  // 30秒超时
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.success) {
            // 更新统计
            indexStats.totalIndexed++;
            indexStats.lastIndexTime = new Date().toISOString();
            indexStats.bySource[doc.source] = (indexStats.bySource[doc.source] || 0) + 1;

            return {
                success: true,
                chunks_indexed: response.data.chunks_indexed || 1
            };
        } else {
            throw new Error(response.data?.error || '未知错误');
        }
    } catch (error) {
        indexStats.totalFailed++;
        const errorMsg = error.response?.data?.detail || error.message;

        // 记录最近10个错误
        if (indexStats.errors.length >= 10) {
            indexStats.errors.shift();
        }
        indexStats.errors.push({
            time: new Date().toISOString(),
            source: doc.source,
            error: errorMsg
        });

        return { success: false, error: errorMsg };
    }
}

/**
 * 批量索引文档到向量库
 * 
 * @param {Array} docs - 文档数组
 * @param {string} docType - 文档类型
 * @returns {Object} - { success, indexed, failed }
 */
async function indexBatch(docs, docType = 'news') {
    if (!Array.isArray(docs) || docs.length === 0) {
        return { success: true, indexed: 0, failed: 0 };
    }

    console.log(`[向量索引] 开始索引 ${docs.length} 条${docType}...`);

    let indexed = 0;
    let failed = 0;

    for (const doc of docs) {
        const result = await indexDocument(doc, docType);
        if (result.success) {
            indexed++;
        } else {
            failed++;
            // 只在第一个失败时打印警告
            if (failed === 1) {
                console.warn(`[向量索引] 索引失败: ${result.error}`);
            }
        }

        // 避免请求过快，每条间隔 100ms
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[向量索引] 完成: 成功 ${indexed} / 失败 ${failed}`);

    return { success: true, indexed, failed };
}

/**
 * 检查向量库服务是否可用
 * 
 * @returns {Object} - { available, stats }
 */
async function checkVectorService() {
    try {
        const response = await httpClient.get('/rag/stats', {
            timeout: 5000
        });

        return {
            available: true,
            stats: response.data
        };
    } catch (error) {
        return {
            available: false,
            error: error.message
        };
    }
}

/**
 * 获取索引统计信息
 * 
 * @returns {Object} - 统计信息
 */
function getIndexStats() {
    return { ...indexStats };
}

/**
 * 语义搜索
 * 
 * @param {string} query - 查询文本
 * @param {number} topK - 返回数量
 * @param {Object} filters - 过滤条件
 * @returns {Array} - 搜索结果
 */
async function searchVector(query, topK = 5, filters = {}) {
    try {
        const response = await httpClient.post('/search', {
            query: query,
            top_k: topK,
            filter_source: filters.source,
            filter_type: filters.docType
        }, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });

        return response.data || [];
    } catch (error) {
        console.error(`[向量索引] 搜索失败: ${error.message}`);
        return [];
    }
}

module.exports = {
    indexDocument,
    indexBatch,
    checkVectorService,
    getIndexStats,
    searchVector,

    // 导出 URL 配置
    OCR_SERVICE_URL
};
