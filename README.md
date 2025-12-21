# 🚀 MyWind AI 投研助手

> 你的私人"万得"终端。**全网矩阵式采集** → **DeepSeek AI 深度分析** → **飞书彩色卡片实时预警**。

![架构](https://img.shields.io/badge/架构-amd64%20|%20arm64-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-green)
![Chrome](https://img.shields.io/badge/Chrome-预装-orange)

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📰 **多源深度采集** | 东方财富、新浪财经、同花顺等主流财经网站 |
| 👁️ **视觉采集 (OCR)** | Puppeteer + Tesseract.js 识别今日头条推荐流 |
| 🔍 **搜索引擎增强** | 百度/Bing 搜索采集，绕过直接访问限制 |
| 🔐 **账号保险箱** | AES-256 加密托管第三方平台账号 |
| 🤖 **AI 研报生成** | DeepSeek/GPT 自动生成投资研报 |
| 📱 **飞书推送** | 三级预警彩色卡片实时通知 |
| ⏰ **定时调度** | 可配置的自动采集、研报生成任务 |
| 🖥️ **Web 控制台** | 可视化管理界面 |

---

## 💻 最低配置

| 项目 | 要求 |
|------|------|
| CPU | 1 核 |
| 内存 | 1G + 2G Swap |
| 架构 | amd64 或 arm64 |
| Docker | 20.10+ |

> 💡 1核1G 机器可以运行所有功能，视觉采集会稍慢

---

## ⚡ 快速部署

### 方式一：体验版（不保存数据）

```bash
docker run -d --name mywind-ai -p 8088:8088 \
  -e AI_API_KEY=你的DeepSeek_Key \
  -e FEISHU_WEBHOOK=你的飞书Webhook \
  --restart always \
  ghcr.io/1williamaoayers/mywind:latest
```

### 方式二：正式版（推荐）

```bash
mkdir -p ~/mywind && cd ~/mywind && cat > docker-compose.yml << 'EOF'
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
      - MONGO_URI=mongodb://mongo:27017/private_wind
      - AI_API_KEY=你的DeepSeek_Key
      - AI_API_BASE=https://api.deepseek.com/v1
      - FEISHU_WEBHOOK=你的飞书Webhook
    depends_on:
      - mongo

volumes:
  mongo_data:
EOF

docker compose up -d && echo "✅ 启动成功！打开 http://localhost:8088"
```

---

## 🌐 访问控制台

启动后打开：**http://服务器IP:8088**

控制台功能：
- 📊 数据可视化图表
- 🔐 账号保险箱管理
- 👁️ 视觉采集监控
- ⏰ 调度任务配置
- 📨 飞书推送测试

---

## 📋 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AI_API_KEY` | ✅ | DeepSeek API Key |
| `FEISHU_WEBHOOK` | ✅ | 飞书 Flow Webhook 地址 |
| `AI_API_BASE` | ❌ | API 地址 (默认: deepseek) |
| `AI_MODEL` | ❌ | 模型名称 (默认: deepseek-chat) |
| `ENCRYPTION_KEY` | ❌ | 账号加密密钥 (可选) |

---

## 🔧 定时任务

| 任务 | 频率 | 说明 |
|------|------|------|
| 实时采集 | 每 5 分钟 | 抓取最新资讯 |
| 深度采集 | 每 30 分钟 | 深度内容挖掘 |
| 搜索引擎 | 每 30 分钟 | 百度/Bing 增强 |
| 视觉采集 | 每天 4 次 | 今日头条 OCR (06:00/12:00/18:00/00:00) |
| AI 研报 | 每天 08:30 | 自动生成研报 |
| 预警推送 | 每 2 分钟 | 处理待推送预警 |

---

## 🛠️ API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/news` | 获取新闻列表 |
| `GET /api/stocks` | 获取股票列表 |
| `POST /api/visual/toutiao` | 触发视觉采集 |
| `GET /api/accounts` | 获取托管账号 |
| `GET /health` | 健康检查 |

完整 API 文档请访问控制台。

---

## 🧹 卸载

```bash
cd ~/mywind
docker compose down -v
docker rmi ghcr.io/1williamaoayers/mywind:latest mongo:7
```

---

## ❓ 常见问题

**Q: 端口被占用？**
```bash
# 改用其他端口，如 9088
ports:
  - "9088:8088"
```

**Q: 查看日志？**
```bash
docker logs -f mywind-app
```

**Q: 视觉采集很慢？**
> 1核1G 机器视觉采集需要 2-3 分钟，这是正常的

**Q: 更新到最新版？**
```bash
docker compose pull && docker compose up -d
```

---

## 📄 License

MIT © 2024
