# 前端重构说明

## 现状

当前前端是单文件 `public/index.html`（约 1731 行），包含：
- HTML 结构
- 内联 CSS 样式
- 内联 JavaScript 逻辑

## 建议方案

由于现有前端已经功能完整且可用，建议采用**渐进式重构**策略：

### 短期（当前）
保留现有 `index.html`，主要优化后端架构。

### 中期（后续独立任务）
创建 Vue3 项目进行组件化重构：

```bash
# 在项目根目录创建前端项目
cd /anti/mywind
npm create vite@latest frontend -- --template vue

# 安装依赖
cd frontend
npm install

# 安装 UI 组件库
npm install @arco-design/web-vue
```

### 长期
- 完全替换 `public/index.html`
- 使用 Vite 构建生产版本
- 配置 Express 静态文件服务

## 组件化结构（参考）

```
frontend/
├── src/
│   ├── components/
│   │   ├── StatusCard.vue        # 系统状态卡片
│   │   ├── StockManager.vue      # 股票管理
│   │   ├── NewsViewer.vue        # 新闻查询
│   │   ├── AlertPanel.vue        # 预警推送
│   │   ├── ReportGenerator.vue   # AI研报
│   │   ├── AccountVault.vue      # 账号保险箱
│   │   ├── VisualScraper.vue     # 视觉采集
│   │   └── SchedulerConfig.vue   # 调度配置
│   ├── views/
│   │   └── Dashboard.vue         # 主控制台
│   ├── api/
│   │   └── index.js              # API 封装
│   ├── App.vue
│   └── main.js
├── package.json
└── vite.config.js
```

## 为什么不立即重构

1. **时间成本高**：完整迁移需要 2-3 天
2. **风险**：可能引入新 bug
3. **现有方案可用**：当前 index.html 功能完整

## 结论

本次优化重点放在**后端架构**，前端组件化作为后续独立任务处理。
