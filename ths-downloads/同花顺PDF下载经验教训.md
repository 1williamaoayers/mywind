# 同花顺PDF下载经验教训

**日期**: 2026-01-02

---

## 问题描述

尝试下载同花顺的京东2025Q3业绩公告PDF，多次失败后错误地归结为"网站有反爬机制"。

## 错误做法

| 方法 | 结果 | 错误原因 |
|-----|------|---------|
| curl直接访问 | 403 Forbidden | 没有会话cookies |
| axios带cookies | 503 | cookies不完整 |
| Puppeteer CDP拦截 | 超时 | 方法过于复杂 |

**最大错误**: 多次失败后说"同花顺有反爬机制"，推卸责任。

---

## 正确做法

**核心原则**: 用户能访问 = Puppeteer也能访问，问题在代码设置

**正确方法**: 在页面上下文中使用fetch获取PDF

```javascript
// 1. 先访问PDF页面建立会话
await page.goto(pdfUrl, { waitUntil: 'domcontentloaded' });

// 2. 在页面上下文中用fetch获取PDF（关键！）
const pdfData = await page.evaluate(async () => {
    const response = await fetch(window.location.href, { 
        credentials: 'include'  // 带上cookies
    });
    const arrayBuffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(arrayBuffer));
});

// 3. 保存PDF
const buffer = Buffer.from(pdfData);
fs.writeFileSync('output.pdf', buffer);
```

---

## 测试结果

- ✅ 京东2025Q3业绩公告.pdf
- ✅ 841 KB (26页)
- ✅ 有效PDF文件

---

## 永久教训

1. 🔴 **禁止说"反爬机制"** - 除非有确凿证据
2. 🔴 **用户能访问 = 代码也能访问** - 问题在代码不在网站
3. ✅ **页面上下文中的fetch** - 可以携带完整会话信息
4. ✅ **不要用axios/curl** - 用Puppeteer建立会话后在页面内获取

---

## 文件位置

- 反省书: `/anti/mywind/反省书_20260102_无依据推理.md`
- PDF文件: `/anti/mywind/ths-downloads/JD_2025Q3_业绩公告.pdf`
- 下载脚本: `/anti/mywind/test-ths-pdf-download.js`
