# MyWind 快速开始指南

> 5分钟让MyWind + TradingAgents运行起来！

---

## 📋 前置要求

- ✅ Docker Desktop (Windows/Mac) 或 Docker Engine (Linux)
- ✅ 4GB+ 内存
- ✅ 网络连接

---

## 🚀 方式一：单机部署（推荐新手）

### 1. 下载部署包

```bash
git clone https://github.com/1williamaoayers/mywind.git
cd mywind/deployment/all-in-one
```

### 2. 一键启动

**Linux/Mac**:
```bash
chmod +x start.sh
./start.sh
```

**Windows**:
双击 `start.bat`

### 3. 访问应用

- **TradingAgents**: http://localhost:8501
- **API文档**: http://localhost:8080/docs

---

## 🔧 方式二：分离部署

适用于VPS服务器 + 多个客户端

### 服务端（VPS）
```bash
cd deployment/server
./install.sh
# 记下API地址: http://YOUR_IP:8080
```

### 客户端（本地PC）
```bash
cd deployment/client
./install.sh
# 输入服务端IP
```

---

## ❓ 常见问题

### 端口被占用？
```bash
# 查看占用
lsof -i :8080

# 修改端口
vi docker-compose.yml
# 改 "8080:8080" 为 "新端口:8080"
```

### 拉取镜像慢？
使用国内镜像加速器

### 容器启动失败？
```bash
docker compose logs
```

---

## 📚 更多文档

- [完整README](../README.md)
- [All-in-One部署](all-in-one/README.md)
- [服务端部署](server/README.md)
- [客户端部署](client/README.md)

---

**Made with ❤️ by William Aoayers**
