# MyWind - AkShare Data API Service

> 基于AKTools的AkShare数据HTTP API服务，为TradingAgents提供253个金融数据接口

[![Build MyWind](https://github.com/1williamaoayers/mywind/actions/workflows/build-mywind.yml/badge.svg)](https://github.com/1williamaoayers/mywind/actions/workflows/build-mywind.yml)
[![Docker Image](https://ghcr-badge.egpl.dev/1williamaoayers/mywind-aktools/latest_tag?trim=major&label=latest)](https://github.com/1williamaoayers/mywind/pkgs/container/mywind-aktools)

---

## 🎯 项目简介

MyWind是一个**零代码封装**的AkShare数据服务，通过官方AKTools工具提供HTTP API访问253个AkShare金融数据接口。

### 核心优势

- ✅ **零维护成本** - 使用官方AKTools，自动跟随AkShare更新
- ✅ **开箱即用** - Docker一键部署，5分钟启动
- ✅ **253个接口** - 覆盖A股、港股、美股、宏观数据
- ✅ **生产就绪** - 健康检查、自动重启、日志管理

---

## 🚀 快速开始

### 单机部署（推荐）

适合个人使用、快速体验：

```bash
# 1. 下载部署包
cd deployment/all-in-one

# 2. 启动服务
./start.sh  # Linux/Mac
# 或
start.bat   # Windows

# 3. 访问服务
# TradingAgents: http://localhost:8501
# API文档: http://localhost:8888/docs
```

### 分离部署

适合VPS/云服务器 + 多客户端场景：

**服务端（VPS）**:
```bash
cd deployment/server
./install.sh
```

**客户端（本地/NAS）**:
```bash
cd deployment/client
./install.sh
```

详细文档：[部署指南](deployment/)

---

## 📦 部署方案

| 方案 | 适用场景 | 文档 |
|------|---------|------|
| All-in-One | 个人PC、单台VPS | [README](deployment/all-in-one/README.md) |
| Server | VPS/云服务器 | [README](deployment/server/README.md) |
| Client | 本地PC/NAS/树莓派 | [README](deployment/client/README.md) |

---

## 🏗️ 架构说明

### All-in-One架构
```
┌─────────────────────────────┐
│  Single Machine             │
│  ┌───────────────────────┐  │
│  │  TradingAgents        │  │
│  │  (AI Investment)      │  │
│  └──────────┬────────────┘  │
│             │ HTTP          │
│             ▼               │
│  ┌───────────────────────┐  │
│  │  MyWind (AKTools)     │  │
│  │  253 Data APIs        │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 分离架构
```
┌──────────────┐    ┌──────────────┐
│  Client 1    │    │  Client 2    │
│ TradingAgent │    │ TradingAgent │
└──────┬───────┘    └──────┬───────┘
       │ HTTP              │ HTTP
       └───────┬───────────┘
               ▼
    ┌──────────────────┐
    │  MyWind Server   │
    │  (VPS/Cloud)     │
    │  Public API      │
    └──────────────────┘
```

---

## 📊 数据接口

MyWind提供的253个接口涵盖：

| 类别 | 接口数量 | 说明 |
|------|---------|------|
| 市场行情 | 60 | 实时行情、历史数据、指数 |
| 新闻资讯 | 37 | 快讯、公告、研报 |
| 基本面 | 60 | 财报、估值、分红 |
| 社交媒体 | 10 | 舆情、热度 |
| 风险宏观 | 86 | 宏观数据、风险指标 |

完整接口列表：[API文档](http://localhost:8888/docs)（启动后访问）

---

## 🔧 技术栈

- **核心**: AKTools 0.0.90 + AkShare 1.18.7
- **Web框架**: FastAPI + Uvicorn
- **容器**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **镜像仓库**: GitHub Container Registry (ghcr.io)

---

## 📚 相关项目

- **TradingAgents** - AI多智能体投资决策系统
  - 仓库: [TradingAgents-arm32](https://github.com/1williamaoayers/TradingAgents-arm32)
  - 说明: MyWind的主要客户端，提供5个AI分析师

- **AKTools** - 官方HTTP API工具
  - 仓库: [akfamily/aktools](https://github.com/akfamily/aktools)
  - 说明: MyWind基于此工具构建

- **AkShare** - 开源金融数据接口库
  - 仓库: [akfamily/akshare](https://github.com/akfamily/akshare)
  - 说明: 数据源

---

## 🤝 贡献指南

欢迎贡献！请查看 [贡献指南](CONTRIBUTING.md)

**常见贡献方式**:
- 🐛 报告bug
- 💡 提出新功能建议
- 📖 改进文档
- 🔧 提交代码

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🆘 获取帮助

- 📚 [完整文档](docs/)
- 🐛 [报告问题](https://github.com/1williamaoayers/mywind/issues)
- 💬 [讨论区](https://github.com/1williamaoayers/mywind/discussions)

---

## ⭐ Star History

如果这个项目对你有帮助，请给个Star！

[![Star History Chart](https://api.star-history.com/svg?repos=1williamaoayers/mywind&type=Date)](https://star-history.com/#1williamaoayers/mywind&Date)

---

**Made with ❤️ by William Aoayers**
