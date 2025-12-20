# 🚀 MyWind AI 投研助手

> 你的私人"万得"终端。**自动抓取金融资讯** → **DeepSeek AI 深度分析** → **飞书彩色卡片实时预警**。

![支持架构](https://img.shields.io/badge/架构-amd64%20|%20arm64%20|%20armv7-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-green)

---

## 🛠️ 部署方式对比

| 方式 | 数据持久化 | 适合场景 | 命令复杂度 |
|------|-----------|---------|-----------|
| **方式一：体验版** | ❌ 容器删除后丢失 | 快速体验、临时测试 | 一行命令 |
| **方式二：正式版** | ✅ 永久保存 | 正式使用、长期运行 | 一键脚本 |

---

## ⚡ 方式一：体验版（不保存数据）

```bash
docker run -d --name mywind-ai -p 8088:8088 \
  -e AI_API_KEY=你的DeepSeek_Key \
  -e FEISHU_WEBHOOK=你的飞书Webhook \
  --restart always \
  ghcr.io/1williamaoayers/mywind:latest
```

> ⚠️ 容器删除后，股票列表、研报等数据会丢失

---

## 🏆 方式二：正式版（带 MongoDB，推荐）

**SSH 终端直接复制运行：**

```bash
mkdir -p ~/mywind && cd ~/mywind && cat > docker-compose.yml << 'COMPOSE'
version: '3.8'
services:
  mongo:
    image: mongo:7
    container_name: mywind-mongo
    restart: always
    volumes:
      - mongo_data:/data/db

  app:
    image: ghcr.io/1williamaoayers/mywind:latest
    container_name: mywind-app
    restart: always
    ports:
      - "8088:8088"
    environment:
      - NODE_ENV=production
      - APP_PORT=8088
      - MONGO_URI=mongodb://mongo:27017/private_wind
      - AI_API_KEY=你的DeepSeek_Key
      - AI_API_BASE=https://api.deepseek.com/v1
      - AI_MODEL=deepseek-chat
      - FEISHU_WEBHOOK=你的飞书Webhook
    depends_on:
      - mongo

volumes:
  mongo_data:
COMPOSE

docker-compose up -d && echo "✅ 启动成功！打开 http://localhost:8088"
```

---

## 🌐 访问控制台

启动后打开浏览器：**http://localhost:8088**

如果是服务器部署：**http://服务器IP:8088**

---

## 🧹 一键卸载

```bash
# 停止并删除容器
docker-compose -f ~/mywind/docker-compose.yml down -v

# 删除镜像（可选）
docker rmi ghcr.io/1williamaoayers/mywind:latest mongo:7
```

---

## 📋 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AI_API_KEY` | ✅ | DeepSeek API Key |
| `FEISHU_WEBHOOK` | ✅ | 飞书 Flow Webhook 地址 |
| `AI_API_BASE` | ❌ | API 地址 (默认: https://api.deepseek.com/v1) |
| `AI_MODEL` | ❌ | 模型名称 (默认: deepseek-chat) |

---

## 🔧 常见问题

**Q: 端口被占用？**
```bash
# 改用其他端口，如 9088
-p 9088:8088
```

**Q: 查看日志？**
```bash
docker logs -f mywind-app
```

**Q: 拉取镜像失败？**
```bash
docker login ghcr.io
```

---

## 📄 License

MIT © 2024
