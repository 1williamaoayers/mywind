# MyWind 项目全面分析报告

**分析日期**: 2026-01-03
**项目版本**: v2.0.0

---

## 一、项目概述

### 1.1 项目定位
**MyWind** 是一个**私人万得终端**——面向个人投资者的全网矩阵式投研系统。

**核心理念**: 人人都买得起的万得终端

**目标用户**: 个人投资者、散户、投资爱好者

### 1.2 核心价值
```
全网矩阵式采集 → DeepSeek AI 深度分析 → 飞书彩色卡片实时预警
```

| 功能 | 说明 |
|------|------|
| 📰 多源深度采集 | 东财、新浪、同花顺等32个信息源 |
| 👁️ 视觉采集(OCR) | Puppeteer + Tesseract.js 识别推荐流 |
| 🔍 搜索引擎增强 | 百度/Bing 搜索采集 |
| 🤖 AI研报生成 | DeepSeek/GPT 自动生成投资研报 |
| 📱 飞书推送 | 三级预警彩色卡片实时通知 |
| ⏰ 定时调度 | 可配置的自动采集任务 |

---

## 二、技术架构

### 2.1 技术栈
```
┌─────────────────────────────────────────────────────────────┐
│                      MyWind 技术栈                           │
├─────────────────────────────────────────────────────────────┤
│  前端: Vite + Vue.js                                        │
│  后端: Node.js + Express.js                                  │
│  数据库: MongoDB (Mongoose ODM)                               │
│  爬虫: Puppeteer + Puppeteer-Extra + Stealth                  │
│  OCR: Tesseract.js                                           │
│  AI: DeepSeek API                                            │
│  定时任务: node-cron                                          │
│  通知: 飞书 Webhook                                           │
│  部署: Docker + Docker Compose                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 依赖包(package.json)
| 类别 | 依赖 | 用途 |
|------|------|------|
| Web框架 | express, cors | REST API服务 |
| 数据库 | mongoose | MongoDB ODM |
| 爬虫 | puppeteer, puppeteer-extra, stealth | 浏览器自动化 |
| HTTP | axios, https-proxy-agent | HTTP请求 |
| 解析 | cheerio | HTML解析 |
| OCR | tesseract.js | 文字识别 |
| PDF | pdf-parse, pdf-table-extractor | PDF解析 |
| 图像 | sharp, jimp, canvas | 图像处理 |
| 定时 | node-cron | 定时任务 |
| 日志 | winston | 日志管理 |

---

## 三、项目结构

### 3.1 目录结构
```
/anti/mywind/
├── server.js              # 主入口文件(Express服务器)
├── package.json           # 依赖配置
├── docker-compose.yml     # Docker部署配置
│
├── models/                # 数据模型 (8个)
│   ├── Account.js         # 账号托管
│   ├── AlertRecord.js     # 预警记录
│   ├── Announcement.js    # 公告模型 ← 新增
│   ├── MarketStats.js     # 市场统计
│   ├── News.js            # 新闻模型
│   ├── Report.js          # AI研报
│   ├── ResearchReport.js  # 研究报告
│   └── Stock.js           # 股票信息
│
├── routes/                # API路由 (13个)
│   ├── announcements.js   # 公告API ← 新增
│   ├── news.js            # 新闻API
│   ├── reports.js         # 研报API
│   ├── research.js        # 研报采集API
│   ├── stocks.js          # 股票API
│   ├── accounts.js        # 账号API
│   ├── alerts.js          # 预警API
│   ├── scraper.js         # 爬虫API
│   ├── scheduler.js       # 调度API
│   ├── visual.js          # 视觉采集API
│   ├── hk.js              # 港股专用API
│   ├── config.js          # 配置API
│   └── api.js             # 通用API
│
├── services/              # 服务层 (27个服务 + 32个爬虫)
│   ├── scraperService.js       # 爬虫调度服务
│   ├── stockNewsCollector.js   # 股票新闻采集 (2519行, 51函数)
│   ├── announcementCollector.js# 公告采集 ← 新增
│   ├── aiService.js            # AI服务
│   ├── deepseekService.js      # DeepSeek API
│   ├── schedulerService.js     # 定时任务
│   ├── notificationService.js  # 飞书通知
│   ├── financialDataService.js # 财务数据
│   ├── marketDataService.js    # 行情数据
│   ├── visualScraper.js        # 视觉采集(OCR)
│   ├── searchEngineScraper.js  # 搜索引擎采集
│   ├── subscriptionManager.js  # 订阅管理
│   └── scrapers/               # 32个信息源爬虫
│       ├── ths.js              # 同花顺
│       ├── hkex.js             # 港交所
│       ├── sinaFinance.js      # 新浪财经
│       ├── futu.js             # 富途
│       ├── gelonghui.js        # 格隆汇
│       └── ... (27个更多)
│
├── utils/                 # 工具模块 (20个)
│   ├── puppeteerBase.js   # Puppeteer基础封装
│   ├── browserPool.js     # 浏览器池
│   ├── antiDetect.js      # 反检测
│   ├── pdfExtractor.js    # PDF提取
│   ├── pdfOcrExtractor.js # PDF OCR
│   ├── httpClient.js      # HTTP客户端
│   └── ...
│
├── frontend/              # 前端 (Vite + Vue)
│   ├── src/
│   ├── vite.config.js
│   └── package.json
│
├── data/                  # 数据目录
│   ├── subscriptions.json # 订阅股票配置
│   └── announcements/     # PDF存储
│
└── config/                # 配置文件
```

### 3.2 代码规模统计
| 模块 | 文件数 | 主要功能 |
|------|--------|---------|
| services | 27 | 核心业务逻辑 |
| scrapers | 32 | 信息源爬虫 |
| routes | 13 | API端点 |
| models | 8 | 数据模型 |
| utils | 20 | 工具函数 |
| **总计** | **100+** | - |

---

## 四、采集信息分类

项目采集的信息分为**三大类**：

### 4.1 新闻类
| 来源 | 类型 | 方式 |
|------|------|------|
| 同花顺7x24 | 实时快讯 | HTTP API |
| 富途 | 个股新闻 | Puppeteer |
| 格隆汇 | 港股资讯 | Puppeteer |
| 智通财经 | 港美股新闻 | Puppeteer |
| 微博/知乎 | 社交舆情 | Puppeteer |

**现状**: ✅ 已实现，32个爬虫覆盖

### 4.2 财报/公告类
| 来源 | 内容 | 格式 |
|------|------|------|
| 同花顺 | 业绩公告、年报 | PDF |
| 港交所HKEX | 法定公告 | PDF |
| 新浪财经 | 财务数据 | HTML/DOM |

**现状**: ✅ 已实现PDF下载，API已部署

### 4.3 研报类
| 来源 | 内容 | 格式 |
|------|------|------|
| 东财研报 | 券商研报 | PDF链接 |
| 研报客 | 综合研报 | PDF链接 |
| 发现报告 | 行业研报 | PDF链接 |

**现状**: ✅ 已采集链接，PDF下载待完善

---

## 五、API接口设计

### 5.1 已实现的API

#### 新闻API
```
GET  /api/v1/news                    # 新闻列表
GET  /api/v1/news/stats              # 新闻统计
```

#### 公告API（新增）
```
GET  /api/v1/announcements           # 公告列表
GET  /api/v1/announcements/:stockCode # 某股票公告
GET  /api/v1/announcements/:code/:id/pdf  # 下载PDF
POST /api/v1/announcements/scrape    # 触发采集
```

#### 研报API
```
GET  /api/v1/research/latest         # 最新研报
GET  /api/v1/research/search         # 搜索研报
```

#### 其他API
```
GET  /api/v1/subscriptions           # 订阅列表
GET  /api/v1/stocks/:code/news       # 股票新闻
GET  /api/v1/financial/:code/summary # 财务摘要
GET  /api/v1/market/indices          # 指数行情
POST /api/v1/ai/chat                 # AI对话
```

---

## 六、数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         MyWind 数据流                            │
└─────────────────────────────────────────────────────────────────┘

    ┌───────────────┐
    │  订阅股票配置  │  (subscriptions.json)
    │  京东/小米/...  │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────────────────────────────┐
    │              采集调度层                    │
    │  schedulerService.js + node-cron          │
    │  (每5分钟/30分钟/每日)                     │
    └───────────────────┬───────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  新闻采集   │ │  公告采集   │ │  研报采集   │
│ 32个爬虫    │ │ PDF下载     │ │ 链接采集    │
│ Puppeteer   │ │ gotoLoose   │ │ HTTP/爬虫   │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       └───────────────┴───────────────┘
                       │
                       ▼
               ┌─────────────┐
               │   MongoDB   │
               │ (8个模型)   │
               └──────┬──────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  AI分析     │ │  预警推送   │ │  API查询    │
│ DeepSeek    │ │ 飞书Webhook │ │ REST API    │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## 七、订阅股票配置

当前订阅的4只港股：

| 代码 | 名称 | 关键词 |
|------|------|--------|
| 09618 | 京东集团 | 京东, JD.com, JD |
| 01810 | 小米集团 | 小米 |
| 02128 | 中国联塑 | 中国联塑 |
| 02525 | 禾赛 | 禾赛 |

**订阅选项**:
- news: 新闻采集
- reports: 研报采集
- financials: 财务数据
- announcements: 公告采集
- sentiment: 情绪分析
- flow: 资金流向

---

## 八、爬虫模块详解

### 8.1 32个信息源
| 分类 | 来源 | 文件 |
|------|------|------|
| **港股** | AAStocks | aastocks.js |
| | 富途 | futu.js |
| | 格隆汇 | gelonghui.js |
| | 智通财经 | zhitong.js |
| | 港交所 | hkex.js |
| | 经济通 | etnet.js |
| | 香港经济日报 | hket.js |
| | 信报财经 | hkej.js |
| **A股** | 同花顺 | ths.js |
| | 东方财富 | eastmoneyReport.js |
| | 新浪财经 | sinaFinance.js |
| | 证券时报 | stcn.js |
| | 每经新闻 | nbd.js |
| | 第一财经 | yicai.js |
| | 界面新闻 | jiemian.js |
| | 36氪 | kr36.js |
| | 金十数据 | jin10.js |
| **美股** | Yahoo Finance | yahoo.js |
| | SeekingAlpha | seekingalpha.js |
| | SEC | sec.js |
| **社交** | 微博 | weibo.js |
| | 知乎 | zhihu.js |
| | 微信搜索 | wechatSearch.js |
| | 东财股吧 | taoguba.js |
| **研报** | 研报客 | yanbaoke.js |
| | 发现报告 | fxbaogao.js |
| **其他** | 北向资金 | northbound.js |
| | 腾讯财经 | tencent.js |
| | 全球媒体 | globalMedia.js |

### 8.2 采集技术
| 方法 | 适用场景 | 实现 |
|------|---------|------|
| HTTP API | 有接口的网站 | axios + cheerio |
| Puppeteer | 动态渲染页面 | puppeteer-extra + stealth |
| OCR | 图片内容提取 | tesseract.js |
| PDF解析 | PDF内容提取 | pdf-parse + poppler |

---

## 九、关键服务模块

### 9.1 stockNewsCollector.js
**规模**: 2519行, 51个采集函数

**功能**: 针对订阅股票的定向采集
- 各信息源定向搜索
- 关键词匹配
- 去重和过滤

### 9.2 announcementCollector.js（新增）
**功能**: 业绩公告PDF采集
- 自动翻页采集
- 智能重试机制
- 动态等待时间
- PDF有效性验证

### 9.3 schedulerService.js
**功能**: 定时任务调度
| 任务 | 频率 |
|------|------|
| 实时采集 | 每5分钟 |
| 深度采集 | 每30分钟 |
| 视觉采集 | 每天4次 |
| AI研报 | 每天08:30 |
| 预警推送 | 每2分钟 |

### 9.4 aiService.js
**功能**: AI研报生成
- DeepSeek API集成
- 自动分析新闻
- 生成投资建议

---

## 十、待办事项

根据当前TODO.md，待完成的任务：

### 高优先级
- [ ] 阶段4: 调度与测试
  - 添加公告采集定时任务（每日2次）
  - 添加重试失败任务（每日1次）
  - 4只股票完整采集测试
  - API端点测试验证

### 中优先级
- [ ] 研报PDF下载功能
- [ ] 财务数据API扩展
- [ ] AI自动分析公告内容

### 低优先级
- [ ] 前端界面优化
- [ ] 统一搜索API
- [ ] 性能监控

---

## 十一、总结

### 11.1 项目优势
1. **全面的信息源覆盖** - 32个信息源，覆盖港股/A股/美股
2. **成熟的技术栈** - Node.js + Puppeteer + MongoDB
3. **模块化设计** - 服务层/路由层/模型层分离
4. **AI能力集成** - DeepSeek API自动生成研报
5. **灵活的订阅机制** - 按股票定向采集

### 11.2 项目规模
| 指标 | 数量 |
|------|------|
| 总文件数 | 200+ |
| 服务模块 | 27 |
| 爬虫模块 | 32 |
| 数据模型 | 8 |
| API路由 | 13 |
| 代码行数 | 约5万行 |

### 11.3 最新完成
- ✅ PDF公告采集服务
- ✅ 公告API接口
- ✅ 宽松等待策略(gotoLoose)
- ✅ 22个PDF成功采集测试
