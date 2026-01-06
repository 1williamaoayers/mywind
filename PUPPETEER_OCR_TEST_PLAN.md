# Puppeteer + OCR 采集测试计划

**项目**: MyWind AI 投研助手
**日期**: 2025-12-27
**目的**: 验证 Puppeteer 和 OCR 采集能力

---

## 测试执行结果 ✅

| 测试项 | 状态 | 结果 |
|--------|------|------|
| **Puppeteer 启动** | ✅ 通过 | 浏览器正常启动 |
| **页面访问** | ✅ 通过 | 百度页面加载成功 |
| **截图功能** | ✅ 通过 | 保存到 /tmp/puppeteer-test.png |
| **OCR 中文识别** | ✅ 通过 | 置信度 53%，识别出"百度热搜" |
| **今日头条采集** | ⚠️ 需调试 | 导航冲突需修复 |
| **搜索引擎采集** | ⚠️ 超时 | 需优化等待逻辑 |

### 环境配置 ✅

- Node.js v20.19.6
- Puppeteer + Chrome 121.0.6167.85
- Tesseract.js (chi_sim+eng)
- 代理: 127.0.0.1:20171
- 系统库: libnss3, libatk 等 59 个已安装

---

## 一、现有 Puppeteer/OCR 模块

### 核心服务文件

| 文件 | 功能 | 采集方式 |
|------|------|----------|
| `services/visualScraper.js` | 视觉采集引擎 | Puppeteer + Tesseract OCR |
| `services/searchEngineScraper.js` | 搜索引擎采集 | Puppeteer |

### visualScraper.js 功能清单

| 函数 | 目标 | 技术 |
|------|------|------|
| `scrapeToutiao` | 今日头条推荐流 | Puppeteer + OCR |
| `scrapeWechat` | 微信公众号(搜狗) | Puppeteer + OCR |
| `scrapeXiaohongshu` | 小红书 | Puppeteer + OCR |
| `scrapeXueqiuSentiment` | 雪球情绪分析 | Puppeteer + OCR + AI |
| `scrapeVertical` | 行业垂直网站 | Puppeteer + OCR |

### searchEngineScraper.js 功能清单

| 函数 | 目标 | 技术 |
|------|------|------|
| `searchBaidu` | 百度搜索 | Puppeteer |
| `searchBing` | Bing搜索 | Puppeteer |
| `puppeteerSearch` | 智能翻页搜索 | Puppeteer |
| `shadowScrape` | 影子抓取(企查查等) | Puppeteer |

---

## 二、测试环境要求

### 必需组件

| 组件 | 要求 | 状态 |
|------|------|------|
| Node.js | v18+ | ✅ v20.19.6 |
| Puppeteer | 已安装 | ✅ |
| Tesseract.js | OCR引擎 | ✅ |
| Chrome/Chromium | 无头浏览器 | 待验证 |
| 中文字体 | OCR识别 | 待验证 |
| 代理 | 127.0.0.1:20171 | ✅ |

### Docker 环境检查

```bash
# 检查 Chrome 是否可用
node -e "require('puppeteer').launch().then(b => { console.log('Puppeteer OK'); b.close(); })"

# 检查 Tesseract
node -e "require('tesseract.js').recognize('test.png').then(r => console.log('OCR OK'))"
```

---

## 三、测试计划

### Phase 1: 环境验证

| 测试项 | 命令 | 预期结果 |
|--------|------|----------|
| Puppeteer 启动 | 启动浏览器实例 | 成功启动 |
| 截图功能 | 截取测试页面 | 保存图片 |
| OCR 识别 | 识别中文文本 | 准确率>80% |

### Phase 2: 视觉采集测试

| 测试项 | 函数 | 预期 |
|--------|------|------|
| 今日头条 | `scrapeToutiao` | 获取5+条新闻 |
| 搜狗微信 | `scrapeWechat` | 获取公众号文章 |
| 小红书 | `scrapeXiaohongshu` | 获取财经笔记 |
| 雪球情绪 | `scrapeXueqiuSentiment` | 获取情绪分析 |

### Phase 3: 搜索引擎测试

| 测试项 | 函数 | 预期 |
|--------|------|------|
| 百度搜索 | `searchBaidu` | 返回搜索结果 |
| Bing搜索 | `searchBing` | 返回搜索结果 |
| 深度搜索 | `puppeteerSearch` | 多页结果 |

### Phase 4: 端到端测试

| 场景 | 流程 | 验证点 |
|------|------|--------|
| 股票舆情监测 | 关键词→搜索→OCR→结果 | 完整链路 |
| 新股IPO追踪 | 页面→截图→OCR→提取 | 数据准确性 |

---

## 四、测试脚本

### 4.1 Puppeteer 基础测试

```javascript
// test-puppeteer.js
const puppeteer = require('puppeteer');

async function testPuppeteer() {
    console.log('=== Puppeteer 基础测试 ===');
    
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('✅ 浏览器启动成功');
        
        const page = await browser.newPage();
        await page.goto('https://www.baidu.com');
        console.log('✅ 页面访问成功');
        
        await page.screenshot({ path: '/tmp/test-screenshot.png' });
        console.log('✅ 截图保存成功');
        
        await browser.close();
        return true;
    } catch (error) {
        console.log('❌ 失败:', error.message);
        return false;
    }
}

testPuppeteer();
```

### 4.2 OCR 测试

```javascript
// test-ocr.js
const Tesseract = require('tesseract.js');
const fs = require('fs');

async function testOCR(imagePath) {
    console.log('=== OCR 识别测试 ===');
    
    try {
        const result = await Tesseract.recognize(imagePath, 'chi_sim+eng');
        console.log('✅ OCR识别成功');
        console.log('识别文本:', result.data.text.substring(0, 200));
        console.log('置信度:', result.data.confidence + '%');
        return true;
    } catch (error) {
        console.log('❌ OCR失败:', error.message);
        return false;
    }
}

// 使用截图测试
testOCR('/tmp/test-screenshot.png');
```

### 4.3 视觉采集测试

```javascript
// test-visual.js
const visualScraper = require('./services/visualScraper');

async function testVisualScraper() {
    console.log('=== 视觉采集测试 ===');
    
    // 测试今日头条
    console.log('\n1. 今日头条:');
    const toutiao = await visualScraper.scrapeToutiao({ maxItems: 3 });
    console.log('结果:', toutiao.length, '条');
    
    // 测试搜狗微信
    console.log('\n2. 搜狗微信:');
    const wechat = await visualScraper.scrapeWechat('财经', { maxItems: 3 });
    console.log('结果:', wechat.length, '条');
    
    // 测试状态
    console.log('\n采集状态:', visualScraper.getVisualStatus());
}

testVisualScraper();
```

---

## 五、预期问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Chrome 启动失败 | 缺少依赖 | 安装 libx11, libnss3 等 |
| OCR 中文乱码 | 缺少字体 | 安装中文字体包 |
| 页面加载超时 | 网络问题 | 配置代理 |
| 反爬检测 | 被识别为爬虫 | 添加 User-Agent, 延时 |
| 动态内容缺失 | JS未执行完 | 增加等待时间 |

---

## 六、执行顺序

```
1. 环境检查
   └── Chrome/Puppeteer 是否可用
   └── Tesseract 是否正常
   └── 代理是否配置

2. 基础功能测试
   └── 浏览器启动
   └── 页面访问
   └── 截图保存
   └── OCR识别

3. 采集功能测试
   └── visualScraper 各函数
   └── searchEngineScraper 各函数

4. 性能测试
   └── 采集速度
   └── 资源占用
   └── 并发能力

5. 稳定性测试
   └── 长时间运行
   └── 错误恢复
```

---

## 七、验收标准

| 指标 | 达标值 |
|------|--------|
| Puppeteer 启动成功率 | 100% |
| OCR 中文识别准确率 | >80% |
| 视觉采集成功率 | >60% |
| 搜索引擎采集成功率 | >70% |
| 单次采集耗时 | <30秒 |

---

*报告生成时间: 2025-12-27*
