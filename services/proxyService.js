/**
 * 代理池服务
 * 
 * 功能：
 * 1. 代理池管理
 * 2. 代理健康检查
 * 3. 自动切换失败代理
 * 4. 支持敏感源自动使用代理
 */

const axios = require('axios');

// 代理池
const proxyPool = {
    proxies: [],           // 代理列表
    currentIndex: 0,       // 当前使用索引
    healthStatus: {},      // 健康状态
    lastCheck: null        // 上次检查时间
};

// 敏感源（需要代理的数据源）
const SENSITIVE_SOURCES = [
    'xueqiu',          // 雪球
    'toutiao',         // 今日头条
    'xiaohongshu',     // 小红书
    'weibo',           // 微博
    'seekingalpha',    // Seeking Alpha
    'guba'             // 东财股吧
];

/**
 * 添加代理
 */
function addProxy(proxy) {
    // proxy 格式: { host, port, protocol, username, password }
    const id = `${proxy.protocol || 'http'}://${proxy.host}:${proxy.port}`;

    if (!proxyPool.proxies.find(p => p.id === id)) {
        proxyPool.proxies.push({
            id,
            ...proxy,
            addTime: new Date(),
            usageCount: 0,
            failCount: 0,
            successCount: 0
        });
        proxyPool.healthStatus[id] = 'unknown';
        console.log(`[代理池] 添加代理: ${id}`);
    }

    return proxyPool.proxies.length;
}

/**
 * 批量添加代理
 */
function addProxies(proxies) {
    proxies.forEach(p => addProxy(p));
    return proxyPool.proxies.length;
}

/**
 * 从环境变量加载代理
 */
function loadProxiesFromEnv() {
    const proxyEnv = process.env.HTTP_PROXIES || process.env.PROXY_LIST;

    if (proxyEnv) {
        // 格式: host:port,host:port 或 protocol://host:port,...
        const proxyList = proxyEnv.split(',').map(p => p.trim());

        for (const proxyStr of proxyList) {
            try {
                const url = new URL(proxyStr.includes('://') ? proxyStr : `http://${proxyStr}`);
                addProxy({
                    protocol: url.protocol.replace(':', ''),
                    host: url.hostname,
                    port: parseInt(url.port) || 80,
                    username: url.username || undefined,
                    password: url.password || undefined
                });
            } catch (e) {
                console.error(`[代理池] 解析代理失败: ${proxyStr}`);
            }
        }
    }

    return proxyPool.proxies.length;
}

/**
 * 获取下一个可用代理
 */
function getNextProxy() {
    const healthyProxies = proxyPool.proxies.filter(p =>
        proxyPool.healthStatus[p.id] !== 'dead'
    );

    if (healthyProxies.length === 0) {
        return null;
    }

    // 轮询选择
    proxyPool.currentIndex = (proxyPool.currentIndex + 1) % healthyProxies.length;
    const proxy = healthyProxies[proxyPool.currentIndex];
    proxy.usageCount++;

    return proxy;
}

/**
 * 获取适合特定源的代理
 */
function getProxyForSource(source) {
    // 非敏感源不使用代理
    if (!SENSITIVE_SOURCES.includes(source)) {
        return null;
    }

    return getNextProxy();
}

/**
 * 标记代理成功
 */
function markProxySuccess(proxyId) {
    const proxy = proxyPool.proxies.find(p => p.id === proxyId);
    if (proxy) {
        proxy.successCount++;
        proxy.lastSuccess = new Date();
        proxyPool.healthStatus[proxyId] = 'healthy';
    }
}

/**
 * 标记代理失败
 */
function markProxyFail(proxyId) {
    const proxy = proxyPool.proxies.find(p => p.id === proxyId);
    if (proxy) {
        proxy.failCount++;
        proxy.lastFail = new Date();

        // 连续失败超过5次标记为死亡
        const recentFails = proxy.failCount - proxy.successCount;
        if (recentFails >= 5) {
            proxyPool.healthStatus[proxyId] = 'dead';
            console.warn(`[代理池] 代理标记为死亡: ${proxyId}`);
        } else if (recentFails >= 3) {
            proxyPool.healthStatus[proxyId] = 'unhealthy';
        }
    }
}

/**
 * 检查单个代理健康度
 */
async function checkProxyHealth(proxy) {
    try {
        const proxyConfig = {
            host: proxy.host,
            port: proxy.port,
            protocol: proxy.protocol
        };

        if (proxy.username && proxy.password) {
            proxyConfig.auth = {
                username: proxy.username,
                password: proxy.password
            };
        }

        const response = await axios.get('https://httpbin.org/ip', {
            proxy: proxyConfig,
            timeout: 10000
        });

        if (response.status === 200) {
            proxyPool.healthStatus[proxy.id] = 'healthy';
            return true;
        }
    } catch (error) {
        proxyPool.healthStatus[proxy.id] = 'unhealthy';
    }

    return false;
}

/**
 * 检查所有代理健康度
 */
async function checkAllProxies() {
    console.log(`[代理池] 开始健康检查, 共 ${proxyPool.proxies.length} 个代理`);
    proxyPool.lastCheck = new Date();

    const results = await Promise.allSettled(
        proxyPool.proxies.map(p => checkProxyHealth(p))
    );

    const healthy = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`[代理池] 健康检查完成: ${healthy}/${proxyPool.proxies.length} 可用`);

    return {
        total: proxyPool.proxies.length,
        healthy,
        unhealthy: proxyPool.proxies.length - healthy
    };
}

/**
 * 移除死亡代理
 */
function removeDeadProxies() {
    const before = proxyPool.proxies.length;
    proxyPool.proxies = proxyPool.proxies.filter(p =>
        proxyPool.healthStatus[p.id] !== 'dead'
    );
    const removed = before - proxyPool.proxies.length;

    if (removed > 0) {
        console.log(`[代理池] 移除 ${removed} 个死亡代理`);
    }

    return removed;
}

/**
 * 获取代理池状态
 */
function getProxyPoolStatus() {
    const statuses = {
        healthy: 0,
        unhealthy: 0,
        dead: 0,
        unknown: 0
    };

    for (const status of Object.values(proxyPool.healthStatus)) {
        statuses[status] = (statuses[status] || 0) + 1;
    }

    return {
        total: proxyPool.proxies.length,
        ...statuses,
        lastCheck: proxyPool.lastCheck?.toLocaleString('zh-CN'),
        sensitiveSources: SENSITIVE_SOURCES,
        proxies: proxyPool.proxies.map(p => ({
            id: p.id,
            status: proxyPool.healthStatus[p.id],
            usageCount: p.usageCount,
            successRate: p.usageCount > 0
                ? Math.round((p.successCount / p.usageCount) * 100) + '%'
                : 'N/A'
        }))
    };
}

/**
 * 创建带代理的 axios 实例
 */
function createProxiedAxios(source) {
    const proxy = getProxyForSource(source);

    if (!proxy) {
        return axios;
    }

    const proxyConfig = {
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol
    };

    if (proxy.username && proxy.password) {
        proxyConfig.auth = {
            username: proxy.username,
            password: proxy.password
        };
    }

    return axios.create({
        proxy: proxyConfig,
        timeout: 15000
    });
}

module.exports = {
    addProxy,
    addProxies,
    loadProxiesFromEnv,
    getNextProxy,
    getProxyForSource,
    markProxySuccess,
    markProxyFail,
    checkProxyHealth,
    checkAllProxies,
    removeDeadProxies,
    getProxyPoolStatus,
    createProxiedAxios,
    SENSITIVE_SOURCES
};
