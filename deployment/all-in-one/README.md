# MyWind + TradingAgents All-in-One 部署包

> 一键部署MyWind数据中心和TradingAgents交易助手

## 🚀 快速开始

### 前置要求
- ✅ 已安装Docker Desktop (Windows/Mac) 或 Docker Engine (Linux)
- ✅ 已安装Docker Compose
- ✅ 系统内存 ≥ 4GB

### 一键启动

**Linux/Mac**:
```bash
chmod +x start.sh
./start.sh
```

**Windows**:
双击 `start.bat` 或在命令行运行：
```cmd
start.bat
```

### 访问应用

启动成功后，浏览器访问：
- **TradingAgents**: http://localhost:8501
- **MyWind API文档**: http://localhost:8888/docs

---

## 📦 包含的服务

### MyWind (数据中心)
- **端口**: 8888
- **功能**: 提供253个AkShare接口的HTTP API
- **镜像**: ghcr.io/1williamaoayers/mywind-aktools:latest

### TradingAgents (交易助手)
- **端口**: 8501
- **功能**: AI多智能体投资决策系统
- **镜像**: ghcr.io/1williamaoayers/tradingagents-arm32:latest

---

## 🔧 常用操作

### 查看服务状态
```bash
docker compose ps
```

### 查看实时日志
```bash
# 所有服务
docker compose logs -f

# 单个服务
docker compose logs -f mywind
docker compose logs -f tradingagents
```

### 重启服务
```bash
# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart mywind
```

### 停止服务
```bash
docker compose stop
```

### 完全删除服务
```bash
docker compose down
```

### 更新到最新版本
```bash
docker compose pull
docker compose up -d
```

---

## ❓ 常见问题

### Q: 启动失败怎么办？

**A**: 按以下步骤排查：

1. **检查端口占用**
   ```bash
   # Linux/Mac
   lsof -i :8888
   lsof -i :8501
   
   # Windows
   netstat -ano | findstr 8888
   netstat -ano | findstr 8501
   ```

2. **查看详细错误**
   ```bash
   docker compose logs
   ```

3. **清理并重启**
   ```bash
   docker compose down
   docker compose up -d
   ```

### Q: 如何更新到最新版本？

**A**: 
```bash
docker compose pull
docker compose down
docker compose up -d
```

### Q: 数据会丢失吗？

**A**: 不会。容器删除后，TradingAgents的数据会保留在本地卷中。

### Q: 如何修改端口？

**A**: 编辑`docker-compose.yml`，修改ports配置：
```yaml
ports:
  - "新端口:8888"  # MyWind
  - "新端口:8501"  # TradingAgents
```

### Q: 如何查看MyWind API？

**A**: 启动后访问 http://localhost:8888/docs 查看完整API文档。

---

## 🏗️ 架构说明

```
┌─────────────────────────────────────────┐
│         TradingAgents (8501)            │
│  ┌────────────────────────────────┐     │
│  │  5个AI分析师                    │     │
│  │  - Market Analyst              │     │
│  │  - News Analyst                │     │
│  │  - Fundamental Analyst         │     │
│  │  - Social Media Analyst        │     │
│  │  - Risk & Macro Analyst        │     │
│  └────────────┬───────────────────┘     │
└───────────────┼─────────────────────────┘
                │ HTTP Request
                │ (MYWIND_API_URL)
                ▼
┌─────────────────────────────────────────┐
│           MyWind (8888)                 │
│  ┌────────────────────────────────┐     │
│  │  AKTools HTTP API              │     │
│  │  253个AkShare接口              │     │
│  │  └── AkShare Library           │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

---

## 📝 版本信息

- **MyWind版本**: 1.0.0
- **TradingAgents版本**: 2.0.0-mywind
- **AKTools版本**: 0.0.90
- **AkShare版本**: 1.18.7

---

## 🆘 获取帮助

- 📚 [完整文档](https://github.com/1williamaoayers/mywind)
- 🐛 [报告问题](https://github.com/1williamaoayers/mywind/issues)
- 💬 [讨论区](https://github.com/1williamaoayers/mywind/discussions)

---

## 📄 许可证

MIT License - 查看 [LICENSE](../../LICENSE) 文件
