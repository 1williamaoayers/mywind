# Puppeteer 采集优化建议书

**生成时间**: 2025-12-27 18:58 (北京时间)  
**适用项目**: MyWind AI 投研助手  
**当前版本**: Puppeteer + Chrome 121

---

## 一、当前问题诊断

### 1.1 性能问题

| 问题 | 影响 | 当前表现 |
|------|------|----------|
| 加载时间长 | 采集效率低 | 部分网站 >20s |
| 资源消耗大 | 内存占用高 | 未优化资源拦截 |
| 串行执行 | 吞吐量低 | 单线程逐个采集 |

### 1.2 稳定性问题

| 问题 | 影响 | 表现 |
|------|------|------|
| 超时处理不当 | 采集中断 | 20s 超时过短 |
| 浏览器崩溃 | 任务失败 | 长时间运行不稳定 |
| 反爬检测 | 被封禁 | User-Agent 单一 |

---

## 二、配置优化建议

### 2.1 超时配置

```javascript
// 推荐配置（根据网站类型分级）
const TIMEOUT_CONFIG = {
    fast: 15000,      // 快速网站：百度、36氪、SEC
    normal: 30000,    // 普通网站：大多数财经媒体
    slow: 45000,      // 慢速网站：同花顺、披露易
    heavy: 60000      // 重型网站：视觉采集、OCR处理
};

// 按网站分类设置
const SITE_TIMEOUT = {
    'stockpage.10jqka.com.cn': 45000,  // 同花顺
    'hkexnews.hk': 45000,               // 披露易
    'www.etnet.com.hk': 30000,          // 经济通
    // 其他默认 30000
};
```

### 2.2 浏览器启动参数

```javascript
const BROWSER_CONFIG = {
    headless: 'new',  // 使用新版无头模式
    args: [
        // === 必需参数 ===
        '--no-sandbox',
        '--disable-setuid-sandbox',
        
        // === 性能优化 ===
        '--disable-dev-shm-usage',      // 避免共享内存问题
        '--disable-gpu',                 // 禁用 GPU（无头模式不需要）
        '--disable-software-rasterizer',
        '--disable-extensions',          // 禁用扩展
        
        // === 内存优化 ===
        '--js-flags=--max-old-space-size=512',  // 限制 JS 堆内存
        '--single-process',              // 单进程模式（降低内存）
        
        // === 网络配置 ===
        '--proxy-server=http://127.0.0.1:20171',
        '--ignore-certificate-errors',   // 忽略证书错误
        
        // === 反检测 ===
        '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1920, height: 1080 }
};
```

### 2.3 资源拦截策略

```javascript
// 完整的资源拦截配置
async function setupResourceBlocking(page, options = {}) {
    const { loadImages = false, loadFonts = false, loadMedia = false } = options;
    
    await page.setRequestInterception(true);
    
    page.on('request', req => {
        const type = req.resourceType();
        const url = req.url();
        
        // 阻止的资源类型
        const blockedTypes = [];
        if (!loadImages) blockedTypes.push('image');
        if (!loadFonts) blockedTypes.push('font');
        if (!loadMedia) blockedTypes.push('media');
        blockedTypes.push('stylesheet');  // CSS 通常不需要
        
        // 阻止的域名（广告、统计）
        const blockedDomains = [
            'google-analytics.com',
            'googletagmanager.com',
            'facebook.com',
            'doubleclick.net',
            'cnzz.com',
            'baidu.com/hm.js',
            'umeng.com'
        ];
        
        const shouldBlock = 
            blockedTypes.includes(type) ||
            blockedDomains.some(d => url.includes(d));
        
        if (shouldBlock) {
            req.abort();
        } else {
            req.continue();
        }
    });
}
```

---

## 三、架构优化建议

### 3.1 浏览器池管理

```javascript
/**
 * 浏览器池 - 复用浏览器实例
 * 
 * 好处：
 * 1. 避免频繁启动浏览器的开销（每次启动约 1-2 秒）
 * 2. 复用页面资源，减少内存占用
 * 3. 支持并发采集
 */
class BrowserPool {
    constructor(poolSize = 3) {
        this.poolSize = poolSize;
        this.browsers = [];
        this.available = [];
    }
    
    async init() {
        for (let i = 0; i < this.poolSize; i++) {
            const browser = await puppeteer.launch(BROWSER_CONFIG);
            this.browsers.push(browser);
            this.available.push(browser);
        }
    }
    
    async acquire() {
        // 等待可用浏览器
        while (this.available.length === 0) {
            await new Promise(r => setTimeout(r, 100));
        }
        return this.available.pop();
    }
    
    release(browser) {
        this.available.push(browser);
    }
    
    async closeAll() {
        for (const browser of this.browsers) {
            await browser.close();
        }
    }
}

// 使用示例
const pool = new BrowserPool(3);
await pool.init();

const browser = await pool.acquire();
try {
    const page = await browser.newPage();
    // ... 采集逻辑
    await page.close();
} finally {
    pool.release(browser);
}
```

### 3.2 并发控制

```javascript
/**
 * 并发采集控制器
 * 
 * 限制同时运行的采集任务数，避免资源耗尽
 */
async function concurrentScrape(sites, concurrency = 3) {
    const results = [];
    const queue = [...sites];
    
    async function worker() {
        while (queue.length > 0) {
            const site = queue.shift();
            try {
                const result = await scrapeSite(site);
                results.push(result);
            } catch (error) {
                results.push({ site, error: error.message });
            }
        }
    }
    
    // 启动指定数量的工作者
    const workers = Array(concurrency).fill().map(() => worker());
    await Promise.all(workers);
    
    return results;
}
```

### 3.3 重试机制

```javascript
/**
 * 智能重试
 * 
 * 针对不同错误类型采取不同策略
 */
async function scrapeWithRetry(url, options = {}) {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await scrape(url, options);
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            
            // 根据错误类型决定是否重试
            if (error.message.includes('net::ERR_CONNECTION_RESET')) {
                // 网络问题：等待后重试
                if (!isLastAttempt) {
                    await sleep(baseDelay * attempt);
                    continue;
                }
            }
            
            if (error.message.includes('timeout') && !isLastAttempt) {
                // 超时：增加超时时间重试
                options.timeout = (options.timeout || 30000) * 1.5;
                continue;
            }
            
            throw error;
        }
    }
}
```

---

## 四、反爬对抗策略

### 4.1 User-Agent 轮换

```javascript
const USER_AGENTS = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    // Firefox
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    // Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

function getRandomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

### 4.2 指纹伪装

```javascript
async function setupStealthMode(page) {
    // 隐藏 webdriver 标记
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        
        // 伪装 plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });
        
        // 伪装 languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en']
        });
    });
    
    // 设置真实的 viewport
    await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100)
    });
}
```

### 4.3 人性化操作

```javascript
// 随机延迟
function randomDelay(min = 500, max = 2000) {
    return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

// 模拟鼠标移动
async function humanLikeScroll(page) {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentPosition = 0;
    
    while (currentPosition < scrollHeight * 0.8) {
        const scrollStep = 100 + Math.random() * 300;
        currentPosition += scrollStep;
        
        await page.evaluate(y => window.scrollTo(0, y), currentPosition);
        await randomDelay(200, 500);
    }
}
```

---

## 五、网站专项优化

### 5.1 同花顺

```javascript
// 同花顺特殊处理
async function scrapeThs(keyword) {
    const page = await createPage({
        timeout: 45000,  // 加长超时
        loadImages: false
    });
    
    // 搜索关键词
    await page.goto(`https://stockpage.10jqka.com.cn/?keyword=${encodeURIComponent(keyword)}`);
    
    // 等待搜索结果
    await page.waitForSelector('.search-result', { timeout: 10000 });
    
    // ... 提取数据
}
```

### 5.2 披露易

```javascript
// 披露易中文版直接访问
async function scrapeHkexNews() {
    const page = await createPage({ timeout: 45000 });
    
    // 使用中文版入口
    await page.goto('https://www.hkexnews.hk/index_c.htm');
    
    // 等待公告列表
    await page.waitForSelector('.announcement-list', { timeout: 15000 });
    
    // ... 提取公告
}
```

### 5.3 雪球（需要 Cookie）

```javascript
async function scrapeXueqiu() {
    const page = await createPage();
    
    // 设置 Cookie
    await page.setCookie({
        name: 'xq_a_token',
        value: 'YOUR_TOKEN',
        domain: '.xueqiu.com'
    });
    
    await page.goto('https://xueqiu.com/');
    // ...
}
```

---

## 六、监控与告警

### 6.1 采集成功率监控

```javascript
class ScrapeMonitor {
    constructor() {
        this.stats = {};
    }
    
    record(source, success, duration) {
        if (!this.stats[source]) {
            this.stats[source] = { success: 0, fail: 0, durations: [] };
        }
        
        if (success) {
            this.stats[source].success++;
        } else {
            this.stats[source].fail++;
        }
        this.stats[source].durations.push(duration);
    }
    
    getReport() {
        return Object.entries(this.stats).map(([source, data]) => ({
            source,
            successRate: (data.success / (data.success + data.fail) * 100).toFixed(1) + '%',
            avgDuration: (data.durations.reduce((a, b) => a + b, 0) / data.durations.length).toFixed(0) + 'ms'
        }));
    }
}
```

### 6.2 告警阈值

| 指标 | 告警阈值 | 处理方式 |
|------|----------|----------|
| 成功率 | < 80% | 检查网站结构是否变化 |
| 平均耗时 | > 30s | 优化等待策略 |
| 连续失败 | >= 3 次 | 暂停采集，人工检查 |
| 内存占用 | > 1GB | 重启浏览器池 |

---

## 七、实施优先级

| 优先级 | 优化项 | 预期收益 | 实施难度 |
|--------|--------|----------|----------|
| 🔴 高 | 超时配置分级 | 成功率提升 10% | 低 |
| 🔴 高 | 资源拦截优化 | 速度提升 30% | 低 |
| 🟡 中 | 浏览器池 | 并发能力提升 | 中 |
| 🟡 中 | URL 配置修正 | 3个源恢复正常 | 低 |
| 🟢 低 | 反爬对抗 | 长期稳定性 | 中 |
| 🟢 低 | 监控告警 | 及时发现问题 | 中 |

---

## 八、快速修复清单

### 立即可做（5分钟内）

1. **修正 URL 配置**
   - 同花顺: `stockpage.10jqka.com.cn`
   - 披露易: `hkexnews.hk/index_c.htm`
   - 集微网: `jiwei.com`

2. **调整超时时间**
   ```javascript
   // puppeteerBase.js 中修改
   page.setDefaultTimeout(30000);  // 改为 30 秒
   page.setDefaultNavigationTimeout(45000);  // 导航改为 45 秒
   ```

3. **启用资源拦截**
   - 默认拦截 image, stylesheet, font, media

---

*建议书生成时间: 2025-12-27*
