# PDF采集集成与API优化实施计划

**日期**: 2026-01-03
**版本**: v1.0

---

## 一、项目背景

### 1.1 当前状态
- ✅ 测试脚本成功采集22个PDF（京东9/小米8/联塑4/禾赛1）
- ✅ 掌握了正确的采集方法（宽松等待+智能重试+翻页采集）
- ❌ 尚未集成到正式项目

### 1.2 采集信息分类
| 类别 | 内容 | API现状 |
|-----|------|---------|
| 新闻 | 实时资讯、个股动态 | ✅ 已有 `/api/news` |
| 财报/公告 | 业绩公告、年报、季报 | ❌ 待新建 |
| 研报 | 券商研究报告 | ✅ 已有 `/api/research` |

---

## 二、实施目标

1. **创建公告采集服务** - 将测试脚本集成为正式服务
2. **新建公告API** - 提供RESTful接口查询和下载公告PDF
3. **优化Puppeteer配置** - 统一使用宽松等待策略
4. **完善调度任务** - 定时采集公告

---

## 三、实施计划

### 阶段1: 创建公告采集服务（2小时）

#### 任务1.1: 新建PDF采集服务
```
services/
└── announcementCollector.js (新建)
```

**功能清单**:
- [ ] `collectAnnouncements(stockCode, options)` - 采集单只股票公告
- [ ] `downloadPdf(page, url, filePath)` - 下载单个PDF
- [ ] `validatePdf(buffer)` - 验证PDF有效性
- [ ] `collectAllSubscribed()` - 采集所有订阅股票

**关键代码迁移**:
- 从 `test-ths-pdf-download.js` 提取核心逻辑
- 集成宽松等待策略
- 集成智能重试机制

#### 任务1.2: 数据模型
```
models/
└── Announcement.js (新建)
```

**字段设计**:
```javascript
{
  stockCode: String,      // 股票代码
  stockName: String,      // 股票名称
  title: String,          // 公告标题
  type: String,           // 类型：年报/季报/中期/公告
  year: Number,           // 年份
  quarter: String,        // 季度：Q1/Q2/Q3/Q4
  publishDate: Date,      // 发布日期
  source: String,         // 来源：ths/hkex
  pdfPath: String,        // PDF本地路径
  pdfSize: Number,        // PDF大小(bytes)
  pdfUrl: String,         // 原始PDF URL
  status: String,         // downloaded/failed/pending
  crawlTime: Date         // 采集时间
}
```

---

### 阶段2: 新建公告API（1.5小时）

#### 任务2.1: 路由文件
```
routes/
└── announcements.js (新建)
```

**端点设计**:
| 方法 | 端点 | 功能 |
|-----|------|------|
| GET | `/api/announcements` | 公告列表（支持筛选） |
| GET | `/api/announcements/:stockCode` | 某股票公告 |
| GET | `/api/announcements/:stockCode/:id/pdf` | 下载PDF |
| POST | `/api/announcements/scrape` | 触发采集 |
| GET | `/api/announcements/stats` | 统计信息 |

#### 任务2.2: 集成到app.js
```javascript
const announcementsRouter = require('./routes/announcements');
app.use('/api/announcements', announcementsRouter);
```

---

### 阶段3: 优化Puppeteer配置（1小时）

#### 任务3.1: 修改puppeteerBase.js
- [ ] 新增 `gotoWithLooseWait(page, url)` 方法
- [ ] 统一超时处理策略
- [ ] 添加调试截图功能

#### 任务3.2: 修改现有爬虫
- [ ] `stockNewsCollector.js` - 使用宽松等待
- [ ] `scrapers/ths.js` - 添加公告采集入口

---

### 阶段4: 调度与测试（1.5小时）

#### 任务4.1: 定时任务
修改 `schedulerService.js`:
- [ ] 添加公告采集定时任务（每日2次）
- [ ] 添加重试失败任务（每日1次）

#### 任务4.2: 测试验证
- [ ] 单元测试：PDF下载函数
- [ ] 集成测试：完整采集流程
- [ ] API测试：所有端点

---

## 四、文件清单

| 操作 | 文件 | 说明 |
|-----|------|------|
| **新建** | `services/announcementCollector.js` | 公告采集服务 |
| **新建** | `models/Announcement.js` | 公告数据模型 |
| **新建** | `routes/announcements.js` | 公告API路由 |
| **修改** | `utils/puppeteerBase.js` | 添加宽松等待方法 |
| **修改** | `services/schedulerService.js` | 添加定时任务 |
| **修改** | `app.js` | 注册新路由 |

---

## 五、时间估算

| 阶段 | 任务 | 时间 |
|------|------|------|
| 阶段1 | 创建公告采集服务 | 2小时 |
| 阶段2 | 新建公告API | 1.5小时 |
| 阶段3 | 优化Puppeteer配置 | 1小时 |
| 阶段4 | 调度与测试 | 1.5小时 |
| **总计** | | **6小时** |

---

## 六、验收标准

### 阶段1验收
- [ ] `announcementCollector.collectAnnouncements('09618')` 返回公告列表
- [ ] PDF文件正确保存到 `/data/announcements/{stockCode}/`
- [ ] MongoDB中有公告记录

### 阶段2验收
- [ ] `GET /api/announcements/09618` 返回京东公告列表
- [ ] `GET /api/announcements/09618/{id}/pdf` 可下载PDF
- [ ] `POST /api/announcements/scrape` 触发采集成功

### 阶段3验收
- [ ] 所有Puppeteer爬虫使用统一等待策略
- [ ] 同花顺页面不再超时

### 阶段4验收
- [ ] 4只订阅股票全部采集成功
- [ ] 定时任务正常执行
- [ ] 错误自动重试

---

## 七、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|-----|------|------|---------|
| 同花顺页面结构变化 | 中 | 高 | 监控采集成功率，及时修复选择器 |
| PDF下载超时 | 中 | 中 | 智能重试+动态等待时间 |
| 磁盘空间不足 | 低 | 高 | 设置清理策略，保留最近N个月 |

---

## 八、后续规划

完成本次集成后，下一步工作：

1. **研报PDF下载** - 复用公告采集逻辑
2. **财务数据API扩展** - 从PDF提取关键数据
3. **AI分析集成** - 自动分析公告内容
