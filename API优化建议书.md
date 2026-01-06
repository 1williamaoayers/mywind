# MyWind API 优化建议书

**日期**: 2026-01-02

---

## 一、现有API结构

| 路由 | 功能 | 端点 |
|-----|------|------|
| `/api/news` | 新闻查询 | `GET /`, `GET /stats` |
| `/api/reports` | AI研报 | `GET /`, `GET /:id`, `POST /generate` |
| `/api/research` | 研报采集 | `GET /search`, `GET /latest`, `POST /scrape` |
| `/api/stocks` | 股票管理 | `GET /`, `POST /`, `GET /:code/finance` |

---

## 二、建议新增的API

### 2.1 财报/公告API（高优先级）

```
/api/announcements
├── GET /                    # 获取公告列表
├── GET /:stockCode          # 获取某股票公告
├── GET /:stockCode/:id/pdf  # 下载公告PDF
├── POST /scrape             # 触发公告采集
└── GET /stats               # 公告统计
```

**示例响应**:
```json
GET /api/announcements/09618

{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "title": "2024年度报告",
      "type": "年报",
      "publishDate": "2025-04-17",
      "pdfUrl": "/api/announcements/09618/abc123/pdf",
      "pdfSize": "3.6MB",
      "year": 2024,
      "quarter": null
    },
    {
      "id": "def456",
      "title": "2025年第三季度业绩公告",
      "type": "季报",
      "publishDate": "2025-11-13",
      "pdfUrl": "/api/announcements/09618/def456/pdf",
      "pdfSize": "842KB",
      "year": 2025,
      "quarter": "Q3"
    }
  ]
}
```

---

### 2.2 财务数据API（中优先级）

```
/api/finance
├── GET /:stockCode/summary   # 财务摘要
├── GET /:stockCode/income    # 利润表
├── GET /:stockCode/balance   # 资产负债表
├── GET /:stockCode/cashflow  # 现金流量表
└── GET /:stockCode/ratios    # 财务比率
```

**示例响应**:
```json
GET /api/finance/09618/summary

{
  "success": true,
  "data": {
    "stockCode": "09618",
    "stockName": "京东集团",
    "latestReport": "2025Q3",
    "metrics": {
      "revenue": { "value": 260.4, "unit": "亿", "yoy": "+6.8%" },
      "netProfit": { "value": 11.7, "unit": "亿", "yoy": "+48.6%" },
      "eps": { "value": 3.66, "unit": "元", "yoy": "+52.1%" }
    },
    "dataSource": "新浪财经",
    "updateTime": "2026-01-02T20:00:00Z"
  }
}
```

---

### 2.3 统一搜索API（低优先级）

```
/api/search
├── GET /?q=关键词&type=all   # 全类型搜索
└── GET /?q=关键词&type=news,announcements  # 指定类型
```

**返回三类信息的聚合结果**

---

## 三、API设计原则

### 3.1 统一响应格式

```javascript
// 成功响应
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "limit": 20 },
  "meta": { "source": "同花顺", "updateTime": "..." }
}

// 错误响应
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

### 3.2 RESTful URL设计

| 资源 | 端点 | 说明 |
|-----|------|------|
| 新闻 | `/api/news` | 已有 ✅ |
| 公告 | `/api/announcements` | 待新增 |
| 研报 | `/api/research` | 已有 ✅ |
| 财务 | `/api/finance` | 需扩展 |
| 股票 | `/api/stocks` | 已有 ✅ |

### 3.3 筛选参数标准化

| 参数 | 说明 | 示例 |
|-----|------|------|
| `stockCode` | 股票代码 | `09618` |
| `year` | 年份 | `2024` |
| `quarter` | 季度 | `Q1`, `Q2`, `Q3`, `Q4` |
| `type` | 类型 | `年报`, `季报`, `公告` |
| `startDate` | 开始日期 | `2024-01-01` |
| `endDate` | 结束日期 | `2024-12-31` |
| `limit` | 每页数量 | `20` |
| `page` | 页码 | `1` |

---

## 四、实施建议

### 阶段1: 新建公告API（优先级最高）

1. 创建 `routes/announcements.js`
2. 创建 `models/Announcement.js`
3. 集成PDF下载服务
4. 定时采集任务

### 阶段2: 扩展财务API

1. 扩展 `routes/stocks.js` 的 `/finance` 端点
2. 完善 `financialDataService.js`
3. 添加更多财务指标

### 阶段3: 研报PDF下载

1. 修改 `routes/research.js` 添加PDF下载端点
2. 修改采集模块下载研报PDF

---

## 五、总结

| 类别 | 现有API | 建议新增 |
|-----|---------|---------|
| **新闻** | `GET /api/news` ✅ | - |
| **财报/公告** | ❌ 无 | `GET /api/announcements/:stockCode` |
| **研报** | `GET /api/research/latest` ✅ | `GET /api/research/:id/pdf` |
| **财务数据** | `GET /api/stocks/:code/finance` ⚠️ | 扩展更多指标 |
