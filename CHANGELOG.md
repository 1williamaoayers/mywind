# 更新日志

## [1.0.0] - 2026-01-06

### 🎉 首次发布

#### 新增功能
- **MyWind数据中心**: 基于AKTools的AkShare HTTP API服务
  - 支持253个金融数据接口
  - 自动跟随AkShare更新
  
- **TradingAgents集成**: 通过MYWIND_API_URL环境变量连接
  - 支持双模式：本地AkShare / 外部MyWind API
  - 向后兼容
  
- **三套部署方案**:
  - All-in-One: 单机一键部署
  - Server: VPS服务端部署
  - Client: 客户端部署

#### 技术细节
- Docker镜像: `ghcr.io/1williamaoayers/mywind-aktools:latest`
- AKTools版本: 0.0.91
- AkShare版本: 1.18.8
- 端口: 8080

#### 文档
- README.md: 项目介绍
- QUICKSTART.md: 快速开始
- 各部署包README

---

## 开发计划

### [1.1.0] - 计划中
- [ ] 添加Nginx缓存层
- [ ] 支持HTTPS
- [ ] 添加认证机制
- [ ] Web管理界面
