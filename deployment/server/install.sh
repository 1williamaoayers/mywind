#!/bin/bash

# MyWind 服务端一键部署脚本
# 适用于: VPS/云服务器

set -e

echo "=========================================="
echo "  MyWind 数据中心 - 服务端部署"
echo "=========================================="
echo ""

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到Docker"
    echo "请先安装Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未检测到Docker Compose"
    exit 1
fi

echo "✅ Docker环境检查通过"
echo ""

# 停止旧容器
echo "🧹 清理旧容器..."
docker compose down 2>/dev/null || true
echo ""

# 拉取最新镜像
echo "📥 拉取最新镜像..."
docker compose pull
echo ""

# 启动服务
echo "🚀 启动MyWind服务..."
docker compose up -d
echo ""

# 等待启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查状态
echo "📊 服务状态:"
docker compose ps
echo ""

# 获取公网IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "未知")

# 成功提示
echo "=========================================="
echo "✅ MyWind服务端部署成功！"
echo "=========================================="
echo ""
echo "🌐 API地址:"
echo "   本地访问: http://localhost:8888"
echo "   公网访问: http://${PUBLIC_IP}:8888"
echo "   API文档:  http://${PUBLIC_IP}:8888/docs"
echo ""
echo "⚠️  重要: 请确保防火墙已开放8888端口"
echo "   Ubuntu/Debian: sudo ufw allow 8888"
echo "   CentOS/RHEL:   sudo firewall-cmd --add-port=8888/tcp --permanent"
echo ""
echo "📝 常用命令:"
echo "   查看日志: docker compose logs -f"
echo "   停止服务: docker compose stop"
echo "   重启服务: docker compose restart"
echo ""
echo "🔗 下一步: 在客户端部署TradingAgents"
echo "   使用API地址: http://${PUBLIC_IP}:8888/api/public"
echo "=========================================="
