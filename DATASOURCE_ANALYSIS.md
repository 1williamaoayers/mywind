# MyWind 信息源完整报告

## 一、信息源总览

### 信息源总数：**38 个**

| 类别 | 原有 | 新增 | 合计 |
|------|------|------|------|
| 国内资讯 | 7 | 5 | 12 |
| 官方信披 | 2 | 3 | 5 |
| 社交舆情 | 4 | 2 | 6 |
| 海外市场 | 4 | 3 | 7 |
| 研报采集 | 4 | 0 | 4 |
| 视觉采集 | 4 | 0 | 4 |

---

## 二、新增信息源详情

### Phase 1：国内核心（3个）

| 信息源 | 文件 | 功能 |
|--------|------|------|
| **同花顺** | [ths.js](file:///anti/mywind/services/scrapers/ths.js) | 7x24快讯、个股新闻 |
| **证券时报** | [stcn.js](file:///anti/mywind/services/scrapers/stcn.js) | 快讯、要闻 |
| **交易所互动** | [interactive.js](file:///anti/mywind/services/scrapers/interactive.js) | 上证e互动、深交所互动易 |

### Phase 2：海外增强（3个）

| 信息源 | 文件 | 功能 |
|--------|------|------|
| **SEC EDGAR** | [sec.js](file:///anti/mywind/services/scrapers/sec.js) | 美股10-K/8-K/13F公告 |
| **Yahoo Finance** | [yahoo.js](file:///anti/mywind/services/scrapers/yahoo.js) | 美股新闻、行情 |
| **Seeking Alpha** | [seekingalpha.js](file:///anti/mywind/services/scrapers/seekingalpha.js) | 美股研报、分析 |

### Phase 3：舆情增强（2个）

| 信息源 | 文件 | 功能 |
|--------|------|------|
| **微博财经** | [weibo.js](file:///anti/mywind/services/scrapers/weibo.js) | 热搜、大V、关键词搜索 |
| **淘股吧** | [taoguba.js](file:///anti/mywind/services/scrapers/taoguba.js) | 股民讨论、龙虎榜 |

---

## 三、完整信息源清单

### 按采集方式分类

```
HTTP API（16个）
├── 财联社、华尔街见闻、新浪财经、金十数据
├── 腾讯财经、格隆汇、36氪、国家统计局
├── 英为财情、集微网、富途牛牛
├── 同花顺（新）、证券时报（新）
├── Yahoo Finance（新）、SEC EDGAR（新）
└── 上证e互动/深交所互动易（新）

HTTP + Cookie（5个）
├── 雪球、东财股吧、东财研报
├── 微博财经（新）
└── 淘股吧（新）

Puppeteer（9个）
├── 搜狗微信、小红书、知乎
├── 发现报告、研报客
├── Seeking Alpha（新）
└── 全球媒体、行业垂直站

Puppeteer + OCR（4个）
├── 今日头条
├── 微信公众号
├── 雪球情绪分析
└── 行业垂直站

搜索引擎（2个）
├── 百度
└── Bing
```

### 按内容维度分类

| 维度 | 信息源数量 | 代表性数据源 |
|------|------------|--------------|
| 实时快讯 | 9 | 财联社、同花顺、金十、证券时报 |
| 官方信披 | 5 | 巨潮、披露易、SEC、互动平台 |
| 社交舆情 | 6 | 雪球、微博、淘股吧、知乎 |
| 深度研报 | 5 | 东财研报、Seeking Alpha、研报客 |
| 海外市场 | 4 | Yahoo Finance、英为财情、全球媒体 |
| 视觉采集 | 4 | 今日头条、微信、小红书 |

---

## 四、新增爬虫 API 文档

### 同花顺 (ths.js)

```javascript
const { scrapeTHSNews, scrapeTHSStockNews } = require('./scrapers/ths');

// 获取7x24快讯
const news = await scrapeTHSNews({ maxItems: 30 });

// 获取个股新闻
const stockNews = await scrapeTHSStockNews('600519', { maxItems: 20 });
```

### 证券时报 (stcn.js)

```javascript
const { scrapeSTCN, scrapeSTCNHeadlines } = require('./scrapers/stcn');

// 获取快讯
const news = await scrapeSTCN({ category: 'kuaixun' });

// 获取要闻
const headlines = await scrapeSTCNHeadlines();
```

### 交易所互动 (interactive.js)

```javascript
const { scrapeAllInteractive, searchStockQA } = require('./scrapers/interactive');

// 获取两所最新问答
const qa = await scrapeAllInteractive({ maxItems: 30 });

// 搜索特定股票
const stockQA = await searchStockQA('600519');
```

### SEC EDGAR (sec.js)

```javascript
const { scrapeSECFilings, scrapeSEC8K } = require('./scrapers/sec');

// 获取最新提交
const filings = await scrapeSECFilings({ maxItems: 50 });

// 获取8-K重大事件
const events = await scrapeSEC8K();
```

### Yahoo Finance (yahoo.js)

```javascript
const { scrapeYahooNews, scrapeYahooStockNews } = require('./scrapers/yahoo');

// 获取热门新闻
const news = await scrapeYahooNews();

// 获取个股新闻
const stockNews = await scrapeYahooStockNews('AAPL');
```

### Seeking Alpha (seekingalpha.js)

```javascript
const { scrapeSeekingAlpha, scrapeSeekingAlphaStock } = require('./scrapers/seekingalpha');

// 获取最新文章
const articles = await scrapeSeekingAlpha();

// 获取个股分析
const analysis = await scrapeSeekingAlphaStock('NVDA');
```

### 微博财经 (weibo.js)

```javascript
const { scrapeWeiboHot, scrapeWeiboKOL, searchWeibo } = require('./scrapers/weibo');

// 获取财经热搜
const hot = await scrapeWeiboHot();

// 获取财经大V微博
const kol = await scrapeWeiboKOL();

// 搜索关键词
const results = await searchWeibo('英伟达');
```

### 淘股吧 (taoguba.js)

```javascript
const { scrapeTaoguba, scrapeTaogubaStock } = require('./scrapers/taoguba');

// 获取热门帖子
const posts = await scrapeTaoguba();

// 获取个股讨论
const stockPosts = await scrapeTaogubaStock('600519');
```

---

## 五、与万得终端对比

| 功能 | 万得 | MyWind | 状态 |
|------|------|--------|------|
| 实时资讯 | ✅ | ✅ 9个源 | ✅ 覆盖 |
| A股信披 | ✅ | ✅ 巨潮+互动 | ✅ 覆盖 |
| 港股信披 | ✅ | ✅ 披露易 | ✅ 覆盖 |
| 美股信披 | ✅ | ✅ SEC EDGAR | ✅ 新增 |
| 机构研报 | ✅ | ✅ 5个源 | ✅ 覆盖 |
| 社交舆情 | ✅ | ✅ 6个源 | ✅ 新增 |
| 行业垂直 | ✅ | ⚠️ 1个源 | 需扩展 |
| 量化接口 | ✅ | ❌ | 待开发 |
| 数据分析 | ✅ | ❌ | 待开发 |

---

## 六、后续扩展建议

### 优先级高
- [ ] 将新爬虫注册到调度器
- [ ] 添加到 API 路由
- [ ] 编写单元测试

### 优先级中 ✅ 已完成
- [x] 第一财经 → [yicai.js](file:///anti/mywind/services/scrapers/yicai.js)
- [x] 界面新闻 → [jiemian.js](file:///anti/mywind/services/scrapers/jiemian.js)
- [x] 每日经济新闻 → [nbd.js](file:///anti/mywind/services/scrapers/nbd.js)

### 优先级低
- [ ] 抖音财经（OCR）
- [ ] B站财经区
- [ ] Reddit WSB

---

*报告生成时间：2025-12-27*
