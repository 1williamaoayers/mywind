# 同花顺PDF批量采集经验总结

**日期**: 2026-01-02
**任务**: 下载京东2024-2025年所有业绩公告PDF

---

## 最终成果

| 公告 | 大小 | 状态 |
|-----|------|------|
| 2025年Q3业绩公告 | 842 KB | ✅ |
| 2025年Q2中期业绩公告 | 886 KB | ✅ |
| 2025年Q1业绩公告 | 795 KB | ✅ |
| 2024年度报告 | 3665 KB | ✅ |
| 2024年Q4全年业绩公告 | 820 KB | ✅ |
| 2024年Q3业绩公告 | 797 KB | ✅ |
| 2024年Q2中期业绩公告 | 881 KB | ✅ |
| 2024年Q1业绩公告 | 423 KB | ✅ |
| 2024年度股息公告 | 85 KB | ✅ |

---

## 犯过的错误

### 错误1: 无依据推理
- **表现**: 下载失败后说"同花顺有反爬机制"
- **事实**: 用户能在浏览器访问 = Puppeteer也能访问，问题在代码
- **教训**: 🔴 禁止说"反爬机制"除非有确凿证据

### 错误2: 过度复杂化
- **表现**: 尝试监听新窗口、CDP拦截等复杂方案
- **事实**: 简单的`goto + fetch`就能解决
- **教训**: 🔴 坚持用已验证的简单方法

### 错误3: 需求理解不完整
- **表现**: 只采集第一页5条公告就停止
- **事实**: 用户说"所有"是指翻完所有页面
- **教训**: 🔴 "所有" = 翻页采集完整列表

### 错误4: 没有智能重试
- **表现**: 2024年度报告首次下载失败，需要手动重试
- **事实**: 大文件需要更长等待时间
- **教训**: 🔴 采集必须有自动重试机制

### 错误5: 没有利用Puppeteer完整能力
- **表现**: 不知道用DOM分析翻页、监听新窗口
- **事实**: Puppeteer完全能做自动翻页采集
- **教训**: 🔴 充分利用浏览器自动化能力

---

## 正确的实现方式

### 1. PDF下载（核心代码）
```javascript
// 1. 访问PDF页面
await page.goto(pdfUrl, { waitUntil: 'domcontentloaded' });

// 2. 在页面上下文中用fetch获取PDF
const data = await page.evaluate(async () => {
    const r = await fetch(location.href, { credentials: 'include' });
    return Array.from(new Uint8Array(await r.arrayBuffer()));
});

// 3. 保存PDF
fs.writeFileSync(filePath, Buffer.from(data));
```

### 2. 自动翻页采集
```javascript
while (hasMore && pageNum <= 15) {
    // 获取当前页公告
    const links = await frame.evaluate(() => {...});
    allLinks.push(...links);
    
    // 点击下一页
    const nextClicked = await frame.evaluate(() => {
        const btn = document.querySelector('a:contains("下一页")');
        if (btn) { btn.click(); return true; }
        return false;
    });
    
    if (nextClicked) {
        pageNum++;
        await new Promise(r => setTimeout(r, 3000));
    } else {
        hasMore = false;
    }
}
```

### 3. 智能重试机制
```javascript
async function smartDownload(page, url, fileName, maxRetries = 3) {
    const waitTime = getWaitTime(fileName);  // 年报20s，季报10s
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await page.goto(url, { timeout: 60000 });
            await new Promise(r => setTimeout(r, waitTime));
            
            const data = await page.evaluate(...);
            if (validatePdf(data)) return { success: true, data };
            
        } catch (e) {
            const delay = attempt * 5000;  // 5s, 10s, 15s
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return { success: false };
}
```

### 4. 动态等待时间
```javascript
function getWaitTime(text) {
    if (text.includes('年度报告')) return 20000;  // 年报大，等20秒
    if (text.includes('中期')) return 15000;      // 半年报等15秒
    return 10000;                                  // 季报等10秒
}
```

---

## 永久规则

1. 🔴 **用户能访问 = Puppeteer能访问** - 问题在代码不在网站
2. 🔴 **"所有"意味着翻页采集** - 不是只看第一页
3. 🔴 **大文件需要更长等待** - 年报3MB需要20秒
4. 🔴 **必须有智能重试** - 失败后自动重试3次
5. 🔴 **先读TODO再开工** - 复用已有成功经验
6. ✅ **goto + fetch = 简单有效** - 不需要复杂方案
7. ✅ **DOM分析 + 点击翻页** - 充分利用Puppeteer能力

---

## 文件位置

- 下载脚本: `/anti/mywind/test-ths-pdf-download.js`
- PDF文件: `/anti/mywind/ths-downloads/`
- 反省书1: `/anti/mywind/反省书_20260102_无依据推理.md`
- 反省书2: `/anti/mywind/反省书_20260102_过度复杂化.md`
