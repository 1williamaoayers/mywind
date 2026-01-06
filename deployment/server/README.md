# MyWind Server 服务端部署

> MyWind数据中心服务端部署包，提供AkShare数据API服务

## 🚀 快速部署

### 前置要求
- ✅ VPS/云服务器 (推荐配置: 2核2G以上)
- ✅ 已安装Docker和Docker Compose
- ✅ 开放8888端口

### 一键安装

```bash
chmod +x install.sh
./install.sh
```

### 手动安装

```bash
# 1. 启动服务
docker compose up -d

# 2. 检查状态
docker compose ps

# 3. 查看日志
docker compose logs -f
```

---

## 🔧 配置防火墙

### Ubuntu/Debian
```bash
sudo ufw allow 8888
sudo ufw reload
```

### CentOS/RHEL
```bash
sudo firewall-cmd --add-port=8888/tcp --permanent
sudo firewall-cmd --reload
```

---

## 🌐 访问服务

部署成功后，访问以下地址：

- **API文档**: http://YOUR_IP:8888/docs
- **健康检查**: http://YOUR_IP:8888/

### 测试API
```bash
# 测试港股实时行情
curl http://YOUR_IP:8888/api/public/stock_hk_spot_em

# 测试A股历史数据
curl "http://YOUR_IP:8888/api/public/stock_zh_a_hist?symbol=600000"
```

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

## 🔗 下一步

服务端部署成功后，在客户端部署TradingAgents：

1. 下载客户端部署包
2. 使用服务端API地址: `http://YOUR_IP:8888/api/public`
3. 运行客户端安装脚本

---

## ❓ 常见问题

### Q: 无法访问8888端口？

**A**: 检查以下项目：
1. 防火墙是否开放8888端口
2. 云服务商安全组是否允许8888端口
3. 服务是否正常运行: `docker compose ps`

### Q: 如何查看API文档？

**A**: 访问 `http://YOUR_IP:8888/docs`

### Q: 如何监控服务状态？

**A**: 
```bash
# 查看容器状态
docker compose ps

# 查看资源使用
docker stats mywind

# 查看日志
docker compose logs --tail=100
```

---

## 📊 性能优化

### 添加Nginx缓存层（可选）

如果有大量客户端并发访问，建议添加Nginx作为缓存层：

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - mywind
```

---

## 🆘 获取帮助

- 📚 [完整文档](https://github.com/1williamaoayers/mywind)
- 🐛 [报告问题](https://github.com/1williamaoayers/mywind/issues)
