---
description: 测试采集系统的正确方法
---

# 采集测试工作流

## ⚠️ 重要提醒

**本项目有两种采集方式，必须根据目的选择正确的方式！**

| 目的 | 正确方法 |
|------|----------|
| 测试订阅股票新闻采集 | **定向采集** |
| 测试爬虫成功率 | 全量采集 |

---

## 定向采集（推荐）

**用途**：测试订阅股票（京东、小米等）能否采集到相关新闻

**原理**：直接去每只股票的专属页面采集

// turbo
```bash
cd /anti/mywind
node -e "
const { scrapeForAllSubscriptions } = require('./services/stockNewsCollector');
async function test() {
    const results = await scrapeForAllSubscriptions();
    console.log('采集完成');
    console.log('成功源:', Object.keys(results.bySource).length);
    console.log('总采集:', results.totalCount);
    process.exit(0);
}
test();
"
```

**预期结果**：100% 匹配率（每只股票都有新闻）

---

## 全量采集

**用途**：测试爬虫成功率、过滤规则

**原理**：抓所有首页新闻，再过滤匹配

// turbo
```bash
cd /anti/mywind
node full-e2e-test.js
```

**注意**：匹配率低是正常的（依赖当天热点）

---

## 关键文件

| 文件 | 用途 |
|------|------|
| `services/stockNewsCollector.js` | 定向采集模块 |
| `full-e2e-test.js` | 全量测试脚本 |
| `data/subscriptions.json` | 订阅股票配置 |
