# CSS选择器自动修复方法

**创建时间**: 2025-12-27  
**用途**: 快速修复Puppeteer爬虫的CSS选择器问题

---

## 方法概述

使用Puppeteer自动打开目标网站，分析页面DOM结构，找到正确的CSS选择器，然后更新爬虫代码。

---

## 第一步：分析网站DOM

运行分析脚本：

```bash
cd /anti/mywind
node analyze-sites.js
```

脚本会输出：
- 可能的新闻链接和父元素class
- 相关的class名列表

---

## 第二步：解读分析结果

### 示例输出

```
=== 界面新闻 ===
可能的新闻链接:
  - 博洛尼广佛经销商被指卷款千万跑路
    父class: reports_item
  - 伊丽莎白雅顿："两杯奶茶钱"可买全套产品
    父class: reports_item

相关class: reports_item, jm-i-article, news-msg
```

### 解读方法

1. **父class** = 包含新闻的容器元素
2. **相关class** = 可能有用的CSS类名
3. 选择最独特、出现最多的class作为选择器

---

## 第三步：更新爬虫代码

### 修改选择器

**旧代码**:
```javascript
page.$$eval('.article-item, .news-item', els => ...)
```

**新代码**:
```javascript
page.$$eval('.reports_item, .jm-i-article, [class*="news"] a', els => ...)
```

### 关键技巧

1. **使用多个选择器**：用逗号分隔，增加匹配概率
2. **使用属性选择器**：`[class*="news"]` 匹配class名包含"news"的元素
3. **直接选择链接**：如果容器不好找，直接用 `a[href*="/article/"]` 选择链接

---

## 第四步：测试验证

```bash
node -e "
const { scrapeXxx } = require('./services/scrapers/xxx');
const puppeteer = require('./utils/puppeteerBase');

async function test() {
    const result = await scrapeXxx({ maxItems: 3 });
    console.log('结果:', result.length, '条');
    result.forEach(r => console.log('-', r.title?.substring(0,40)));
    await puppeteer.closeBrowser();
}
test();
"
```

---

## 分析脚本模板

```javascript
// analyze-sites.js
const puppeteer = require('./utils/puppeteerBase');

const SITES = [
    { name: '网站名', url: 'https://...' },
];

async function analyzeSite(name, url) {
    const page = await puppeteer.createPage({ timeout: 60000 });
    
    try {
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);
        
        const result = await page.evaluate(() => {
            // 找新闻链接
            const links = Array.from(document.querySelectorAll('a'))
                .filter(a => {
                    const text = a.textContent?.trim() || '';
                    return text.length > 10 && text.length < 100;
                })
                .slice(0, 5)
                .map(a => ({
                    text: a.textContent?.trim(),
                    parentClass: a.parentElement?.className
                }));
            
            // 找相关class
            const classes = new Set();
            document.querySelectorAll('[class]').forEach(el => {
                el.className.split(' ').forEach(c => {
                    if (c.includes('news') || c.includes('article') || c.includes('list')) {
                        classes.add(c);
                    }
                });
            });
            
            return { links, classes: Array.from(classes) };
        });
        
        console.log(`\n=== ${name} ===`);
        result.links.forEach(l => console.log(`  - ${l.text} (父: ${l.parentClass})`));
        console.log('相关class:', result.classes.join(', '));
        
    } finally {
        await puppeteer.closePage(page);
    }
}

async function main() {
    for (const site of SITES) {
        await analyzeSite(site.name, site.url);
    }
    await puppeteer.closeBrowser();
}

main();
```

---

## 常见选择器模式

| 网站类型 | 典型选择器 |
|----------|------------|
| 新闻列表 | `.news-list a`, `.article-item a` |
| 通用匹配 | `[class*="article"]`, `[class*="news"]` |
| 按链接筛选 | `a[href*="/news/"]`, `a[href*="/article/"]` |
| 快讯类 | `.flash-item`, `.live-item` |

---

## 成功案例

| 网站 | 原选择器 | 修复后选择器 |
|------|----------|--------------|
| 格隆汇 | `.article-item` | `[class*="article"]` |
| 界面新闻 | `.news-list li` | `.reports_item, .jm-i-article` |
| 证券时报 | `.article-item` | `.index-quick-news-list a` |
| 第一财经 | `.m-list li` | `.m-list a, .textlist a` |

---

*文档版本: 1.0*
