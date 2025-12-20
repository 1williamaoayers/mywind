# 🚀 MyWind AI 投研助手 (全架构版)

> 你的私人"万得"终端。**自动抓取金融资讯** → **DeepSeek AI 深度分析** → **飞书彩色卡片实时预警**。

![支持架构](https://img.shields.io/badge/架构-amd64%20|%20arm64%20|%20armv7-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-green)

---

## 🛠️ 1. 一键启动 (支持 Windows/Mac/树莓派/玩客云)

只需安装 [Docker](https://docs.docker.com/get-docker/)，复制并运行这行命令（**记得替换你的 KEY**）：

```bash
docker run -d \
  --name mywind-ai \
  -p 8088:8088 \
  -e AI_API_KEY=你的DeepSeek_Key \
  -e FEISHU_WEBHOOK=你的飞书Webhook_地址 \
  --restart always \
  ghcr.io/1williamaoayers/mywind:latest
```

> **树莓派/玩客云用户**：建议添加内存限制 `--memory=512m`

启动后在浏览器打开：**http://localhost:8088** 即可看到控制台。

---

## 🧹 2. 一键彻底卸载 (不占硬盘 1KB 空间)

不想用了？运行下面这行命令，镜像、容器和缓存将全部抹除：

```bash
docker rm -f mywind-ai && docker rmi ghcr.io/1williamaoayers/mywind:latest && docker image prune -a -f
```

---

## 📋 3. 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AI_API_KEY` | ✅ | DeepSeek API Key |
| `FEISHU_WEBHOOK` | ✅ | 飞书 Flow Webhook 地址 |
| `AI_API_BASE` | ❌ | API 地址 (默认: https://api.deepseek.com/v1) |
| `AI_MODEL` | ❌ | 模型名称 (默认: deepseek-chat) |
| `MONGO_URI` | ❌ | MongoDB 地址 (默认: 内置) |

---

## 🐳 4. 带 MongoDB 的完整部署 (可选)

如需持久化数据，使用 docker-compose：

```yaml
# docker-compose.yml
version: '3.8'
services:
  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
  
  app:
    image: ghcr.io/1williamaoayers/mywind:latest
    ports:
      - "8088:8088"
    environment:
      - AI_API_KEY=你的Key
      - FEISHU_WEBHOOK=你的Webhook
      - MONGO_URI=mongodb://mongo:27017/private_wind
    depends_on:
      - mongo

volumes:
  mongo_data:
```

运行：`docker-compose up -d`

---

## 📱 5. 飞书推送效果

系统会向飞书群发送如下格式的消息：

- 🚨 **红色高危预警** - 立案/调查/退市等
- 📈 **绿色利好预警** - 重组/并购/涨停等
- 📢 **蓝色动向提醒** - 减持/异动/解禁等

---

## 🔧 6. 常见问题

**Q: 镜像拉取失败？**
```bash
# 登录 GitHub Container Registry
docker login ghcr.io -u 1williamaoayers
```

**Q: 端口被占用？**
```bash
# 换一个端口，如 9088
docker run -d -p 9088:8088 ...
```

**Q: 查看日志？**
```bash
docker logs -f mywind-ai
```

---

## 📄 License

MIT © 2024
