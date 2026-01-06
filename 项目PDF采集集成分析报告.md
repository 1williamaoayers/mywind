# 项目PDF采集集成分析报告

**日期**: 2026-01-02 22:50
**任务**: 将测试脚本的成功经验集成到正式项目

---

## 一、项目现状分析

### 1.1 采集模块架构

```
services/
├── stockNewsCollector.js (2519行, 51个函数)  ← 主采集模块
├── scraperService.js (22KB)                  ← 调度服务
└── scrapers/ (32个爬虫)
    ├── ths.js        ← 同花顺新闻API
    ├── hkex.js       ← 港交所新闻
    ├── sinaFinance.js← 新浪财务数据
    └── ...
```

### 1.2 关键发现

| 模块 | 当前功能 | 缺失功能 |
|-----|---------|---------|
| `scrapeTHSForStock()` | 搜索新闻标题+URL | ❌ 不下载PDF公告 |
| `scrapeHKEXForStock()` | 获取公告标题+URL | ❌ 不下载PDF内容 |
| `ths.js` | HTTP API获取快讯 | ❌ 无业绩公告采集 |

### 1.3 核心问题

现有采集模块**只采集标题和URL**，不下载实际PDF内容。

```javascript
// 当前做法（stockNewsCollector.js:842-847）
results.push({
    title: item.title,
    url: item.url,  // ← 只保存URL，不下载PDF
    source: 'ths',
    ...
});
```

---

## 二、需要修正的模块

### 2.1 高优先级（直接影响业绩公告采集）

| 文件 | 函数 | 修正内容 |
|-----|------|---------|
| `stockNewsCollector.js` | `scrapeTHSForStock()` | 新增业绩公告翻页采集+PDF下载 |
| `stockNewsCollector.js` | `scrapeHKEXForStock()` | 添加PDF下载功能 |
| `scrapers/ths.js` | `scrapeTHSStockNews()` | 添加公告PDF下载 |

### 2.2 中优先级（优化现有爬虫）

| 文件 | 问题 | 修正内容 |
|-----|------|---------|
| 全部Puppeteer爬虫 | 超时设置过严 | 改用宽松等待策略 |
| 全部Puppeteer爬虫 | 无重试机制 | 添加智能重试 |

---

## 三、建议的集成方案

### 3.1 新建PDF下载服务

创建专门的PDF采集服务，集中管理PDF下载逻辑：

```
services/
└── pdfCollector.js (新建)
    ├── downloadPdf(url, outputPath)
    ├── downloadThsAnnouncements(stockCode, outputDir)
    ├── downloadHkexAnnouncements(stockCode, outputDir)
    └── validatePdf(buffer)
```

### 3.2 关键代码（从测试脚本提取）

```javascript
// services/pdfCollector.js
const puppeteer = require('../utils/puppeteerBase');
const fs = require('fs');

async function downloadPdf(page, url, filePath) {
    try {
        // 宽松等待策略
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        } catch (e) { /* 超时继续 */ }
        
        await new Promise(r => setTimeout(r, 15000));
        
        // 页面内fetch获取PDF
        const data = await page.evaluate(async () => {
            const r = await fetch(location.href, { credentials: 'include' });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return Array.from(new Uint8Array(await r.arrayBuffer()));
        });
        
        const buffer = Buffer.from(data);
        
        // 验证PDF
        if (buffer.length < 10240 || buffer.slice(0,5).toString() !== '%PDF-') {
            throw new Error('无效PDF');
        }
        
        fs.writeFileSync(filePath, buffer);
        return { success: true, size: buffer.length };
        
    } catch (e) {
        return { success: false, error: e.message };
    }
}
```

### 3.3 修改现有模块

#### stockNewsCollector.js 修改点

```javascript
// 1. 新增import
const pdfCollector = require('./pdfCollector');

// 2. 修改scrapeTHSForStock函数
async function scrapeTHSForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15, downloadPdf = false } = options; // 新增选项
    // ... 现有采集代码 ...
    
    // 如果需要下载PDF
    if (downloadPdf && results.length > 0) {
        const outputDir = `/data/pdfs/${stockCode}`;
        for (const item of results.filter(r => r.type === 'announcement')) {
            await pdfCollector.downloadPdf(page, item.url, outputDir);
        }
    }
}
```

---

## 四、实施步骤（优先级排序）

### 阶段1: 创建PDF下载服务（1-2小时）
1. 创建 `services/pdfCollector.js`
2. 实现核心函数: `downloadPdf`, `validatePdf`
3. 测试单个PDF下载

### 阶段2: 修改同花顺采集（2-3小时）
1. 修改 `scrapeTHSForStock` 添加翻页采集
2. 修改 `scrapers/ths.js` 添加公告采集API
3. 集成PDF下载到采集流程

### 阶段3: 修改HKEX采集（1-2小时）
1. 修改 `scrapeHKEXForStock` 添加PDF下载
2. 测试港交所公告下载

### 阶段4: 优化所有Puppeteer爬虫（2-3小时）
1. 统一使用宽松等待策略
2. 添加智能重试机制
3. 测试所有32个爬虫

---

## 五、测试计划

| 阶段 | 测试内容 | 验收标准 |
|-----|---------|---------|
| 阶段1 | 单个PDF下载 | 成功下载并验证PDF有效 |
| 阶段2 | 同花顺4只股票 | 京东/小米/联塑/禾赛全部成功 |
| 阶段3 | HKEX公告下载 | 4只股票公告全部下载 |
| 阶段4 | 全部爬虫测试 | 成功率>80% |

---

## 六、文件清单

| 操作 | 文件 | 说明 |
|-----|------|------|
| **新建** | `services/pdfCollector.js` | PDF下载服务 |
| **修改** | `services/stockNewsCollector.js` | 添加PDF下载选项 |
| **修改** | `services/scrapers/ths.js` | 添加公告采集 |
| **修改** | `utils/puppeteerBase.js` | 添加宽松等待策略 |
