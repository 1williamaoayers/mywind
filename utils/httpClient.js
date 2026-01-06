/**
 * 统一 HTTP 客户端
 * 
 * 自动检测并使用系统代理
 * 所有爬虫应使用此模块发起请求
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

// 默认代理配置
const PROXY_URL = process.env.https_proxy ||
    process.env.http_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    'http://127.0.0.1:20171';  // 默认本地代理

// 检测是否需要代理
const USE_PROXY = !!PROXY_URL;

// 创建代理 Agent
let httpsAgent = null;
let httpAgent = null;

if (USE_PROXY) {
    try {
        httpsAgent = new HttpsProxyAgent(PROXY_URL);
        httpAgent = new HttpProxyAgent(PROXY_URL);
        console.log(`[HTTP] 使用代理: ${PROXY_URL}`);
    } catch (e) {
        console.error('[HTTP] 代理初始化失败:', e.message);
    }
}

// 默认 User-Agent 列表
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

/**
 * 获取随机 User-Agent
 */
function getRandomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * 创建带代理的 axios 实例
 */
function createHttpClient(options = {}) {
    const config = {
        timeout: options.timeout || 15000,
        headers: {
            'User-Agent': options.userAgent || getRandomUA(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            ...options.headers
        }
    };

    // 添加代理
    if (USE_PROXY && httpsAgent) {
        config.httpsAgent = httpsAgent;
        config.httpAgent = httpAgent;
        config.proxy = false;  // 禁用 axios 内置代理，使用 agent
    }

    return axios.create(config);
}

/**
 * 默认 HTTP 客户端实例
 */
const httpClient = createHttpClient();

/**
 * GET 请求
 */
async function get(url, options = {}) {
    const client = options.newClient ? createHttpClient(options) : httpClient;

    try {
        const response = await client.get(url, {
            headers: options.headers,
            params: options.params,
            timeout: options.timeout
        });
        return response;
    } catch (error) {
        // 重试一次
        if (options.retry !== false && !options._retried) {
            await sleep(1000);
            return get(url, { ...options, _retried: true });
        }
        throw error;
    }
}

/**
 * POST 请求
 */
async function post(url, data, options = {}) {
    const client = options.newClient ? createHttpClient(options) : httpClient;

    try {
        const response = await client.post(url, data, {
            headers: options.headers,
            timeout: options.timeout
        });
        return response;
    } catch (error) {
        if (options.retry !== false && !options._retried) {
            await sleep(1000);
            return post(url, data, { ...options, _retried: true });
        }
        throw error;
    }
}

/**
 * 延时
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取代理状态
 */
function getProxyStatus() {
    return {
        enabled: USE_PROXY,
        url: PROXY_URL,
        working: !!httpsAgent
    };
}

/**
 * 测试代理连通性
 */
async function testProxy() {
    try {
        const response = await get('https://www.baidu.com', { timeout: 10000 });
        return {
            success: response.status === 200,
            status: response.status
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    httpClient,
    createHttpClient,
    get,
    post,
    getRandomUA,
    getProxyStatus,
    testProxy,
    sleep,
    USE_PROXY,
    PROXY_URL
};
