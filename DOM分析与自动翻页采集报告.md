# DOM分析与自动翻页采集报告

**日期**: 2026-01-02

---

## 问题分析

用户问：能不能分析DOM，让Puppeteer点击翻页找完所有2024年的业绩公告？

**答案**：完全可以，Puppeteer有这个能力，是我没有正确使用。

---

## 当前问题

从用户截图可以看到，同花顺公告列表底部有分页按钮（1, 2, 3, 4, 5, ..., 11, 下一页）。

**我之前做的**：只获取了第一页的5条公告就停止了

**应该做的**：
1. 分析DOM找到分页组件
2. 点击"下一页"或页码按钮
3. 等待新内容加载
4. 提取该页公告
5. 重复直到最后一页

---

## 正确实现方式

### 1. 分析分页DOM

```javascript
// 查找分页组件
const pagination = await frame.evaluate(() => {
    // 常见的分页选择器
    const selectors = [
        '.pagination', '.pager', '.page-nav',
        '[class*="page"]', 'a:contains("下一页")'
    ];
    
    // 找到包含页码的元素
    const pageLinks = document.querySelectorAll('a');
    const pages = Array.from(pageLinks).filter(a => /^\d+$/.test(a.textContent?.trim()));
    
    return {
        totalPages: pages.length > 0 ? Math.max(...pages.map(p => parseInt(p.textContent))) : 1,
        hasNextPage: !!document.querySelector('a:contains("下一页"), .next, [class*="next"]')
    };
});
```

### 2. 自动翻页采集

```javascript
async function collectAllAnnouncements(frame) {
    const allAnnouncements = [];
    let currentPage = 1;
    let hasMore = true;
    
    while (hasMore) {
        console.log(`采集第 ${currentPage} 页...`);
        
        // 获取当前页公告
        const pageAnnouncements = await frame.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .filter(a => a.textContent?.includes('2024'))
                .map(a => ({ text: a.textContent.trim(), href: a.href }));
        });
        
        allAnnouncements.push(...pageAnnouncements);
        console.log(`  找到 ${pageAnnouncements.length} 条`);
        
        // 查找并点击下一页
        const nextClicked = await frame.evaluate(() => {
            const nextBtn = document.querySelector('a.next, a:contains("下一页"), [class*="next"]');
            if (nextBtn && !nextBtn.classList.contains('disabled')) {
                nextBtn.click();
                return true;
            }
            return false;
        });
        
        if (nextClicked) {
            await new Promise(r => setTimeout(r, 3000));  // 等待加载
            currentPage++;
        } else {
            hasMore = false;
        }
        
        // 安全限制
        if (currentPage > 20) {
            console.log('达到最大页数限制');
            break;
        }
    }
    
    return allAnnouncements;
}
```

### 3. 过滤特定年份

```javascript
function filterByYear(announcements, year) {
    return announcements.filter(a => 
        a.text.includes(year.toString()) || 
        a.text.includes(`${year}年`)
    );
}

// 使用
const all2024 = filterByYear(allAnnouncements, 2024);
console.log(`2024年公告总数: ${all2024.length}`);
```

---

## 完整流程

```
┌─────────────────────────────────────────┐
│  访问公告列表页面                        │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│  进入iframe                              │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│  提取当前页所有公告链接                  │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│  是否有"下一页"按钮且未禁用？            │
│  ├─ 是 → 点击下一页 → 等待加载 → 回到上一步
│  └─ 否 → 采集完成
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│  过滤出2024年的公告                      │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│  逐个下载PDF（带智能重试）               │
└─────────────────────────────────────────┘
```

---

## 我的问题

| 能力 | 我做了吗 | 应该做 |
|-----|---------|--------|
| 分析分页DOM | ❌ 没做 | ✅ 查找分页组件 |
| 点击翻页按钮 | ❌ 没做 | ✅ 自动点击"下一页" |
| 循环采集所有页 | ❌ 没做 | ✅ while循环直到最后一页 |
| 过滤特定年份 | ❌ 没做 | ✅ 按年份筛选 |

**结论**：Puppeteer完全有这个能力，是我代码写得不够完整。

---

## 待实施

1. 在下载脚本中加入自动翻页逻辑
2. 结合智能重试机制
3. 支持按年份/类型筛选
