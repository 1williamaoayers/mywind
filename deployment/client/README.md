# TradingAgents Client 客户端部署

> TradingAgents AI交易助手客户端部署包，连接远程MyWind数据中心

## 🚀 快速部署

### 前置要求
- ✅ 本地Docker环境 (PC/Mac/NAS/树莓派)
- ✅ 可访问的MyWind服务器地址

### 一键安装

```bash
chmod +x install.sh
./install.sh
```

安装脚本会：
1. 询问MyWind服务器IP
2. 测试连接
3. 自动配置并启动TradingAgents

### 手动安装

```bash
# 1. 编辑配置
vi docker-compose.yml
# 将 YOUR_MYWIND_IP 替换为实际IP

# 2. 启动服务
docker compose up -d

# 3. 检查状态
docker compose ps
```

---

## 🔗 连接MyWind服务器

### 获取MyWind服务器地址

向你的MyWind服务提供者获取：
- **IP地址**: 例如 `123.45.67.89`
- **端口**: 默认 `8888`
- **API路径**: `/api/public`

完整地址示例: `http://123.45.67.89:8888/api/public`

### 测试连接

```bash
# 测试MyWind服务器
curl http://YOUR_MYWIND_IP:8888/

# 测试API
curl http://YOUR_MYWIND_IP:8888/api/public/stock_hk_spot_em
```

---

## 🌐 访问TradingAgents

部署成功后，浏览器访问：

- **Web界面**: http://localhost:8501

### 使用指南

1. 打开浏览器访问 `http://localhost:8501`
2. 输入要分析的股票代码
3. AI分析师自动获取数据并生成报告
4. 查看5个分析师的专业意见

---

## 📝 常用命令

### 查看日志
```bash
docker compose logs -f
```

### 重启服务
```bash
docker compose restart
```

### 停止服务
```bash
docker compose stop
```

### 更新到最新版本
```bash
docker compose pull
docker compose up -d
```

---

## ❓ 常见问题

### Q: 无法获取股票数据？

**A**: 按以下步骤排查：

1. **检查MyWind服务器连接**
   ```bash
   curl http://YOUR_MYWIND_IP:8888/
   ```

2. **查看TradingAgents日志**
   ```bash
   docker compose logs tradingagents | grep -i error
   ```

3. **确认环境变量配置**
   ```bash
   docker compose config | grep MYWIND_API_URL
   ```

### Q: 如何切换MyWind服务器？

**A**: 
1. 编辑 `docker-compose.yml`
2. 修改 `MYWIND_API_URL` 的值
3. 重启服务: `docker compose restart`

### Q: 本地模式 vs 外部MyWind模式？

**A**: 
- **本地模式**: 不设置`MYWIND_API_URL`，使用本地AkShare库
- **外部模式**: 设置`MYWIND_API_URL`，连接远程MyWind服务器

### Q: 性能慢怎么办？

**A**: 
1. 检查网络延迟: `ping YOUR_MYWIND_IP`
2. 考虑部署到离MyWind服务器更近的位置
3. 联系MyWind服务提供者确认服务状态

---

## 🏗️ 架构说明

```
┌──────────────────────┐
│  TradingAgents      │
│  (localhost:8501)   │
└─────────┬────────────┘
          │ HTTP Request
          │ MYWIND_API_URL
          ▼
┌──────────────────────┐
│  MyWind Server      │
│  (远程VPS/云服务器)   │
│  YOUR_IP:8888       │
└──────────────────────┘
```

---

## 🔧 高级配置

### 多实例部署

同时运行多个TradingAgents实例：

```bash
# 实例1
docker compose -p trading1 up -d

# 实例2（使用不同端口）
# 编辑docker-compose.yml，修改端口为8502
docker compose -p trading2 up -d
```

### 自定义配置

在`docker-compose.yml`中添加环境变量：

```yaml
environment:
  - MYWIND_API_URL=http://YOUR_IP:8888/api/public
  - TZ=Asia/Shanghai
  - LOG_LEVEL=INFO  # 日志级别
```

---

## 🆘 获取帮助

- 📚 [完整文档](https://github.com/1williamaoayers/TradingAgents-arm32)
- 🐛 [报告问题](https://github.com/1williamaoayers/TradingAgents-arm32/issues)
- 💬 [讨论区](https://github.com/1williamaoayers/TradingAgents-arm32/discussions)
