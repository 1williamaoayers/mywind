#!/bin/bash

# MyWind + TradingAgents 一键启动脚本 (Linux/Mac)
# 作者: William Aoayers
# 日期: 2026-01-06

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  MyWind + TradingAgents 一键部署"
echo "=========================================="
echo ""

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到Docker"
    echo "请先安装Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查Docker Compose是否安装
if ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未检测到Docker Compose"
    echo "请先安装Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker环境检查通过"
echo ""

# 停止旧容器（如果存在）
echo "🧹 清理旧容器..."
docker compose down 2>/dev/null || true
echo ""

# 拉取最新镜像
echo "📥 拉取最新镜像..."
docker compose pull
echo ""

# 启动服务
echo "🚀 启动服务..."
docker compose up -d
echo ""

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker compose ps
echo ""

# 显示日志
echo "📋 最近日志:"
docker compose logs --tail=20
echo ""

# 成功提示
echo "=========================================="
echo "✅ 部署成功！"
echo "=========================================="
echo ""
echo "🌐 访问地址:"
echo "   TradingAgents: http://localhost:8501"
echo "   MyWind API:    http://localhost:8888"
echo "   API文档:       http://localhost:8888/docs"
echo ""
echo "📝 常用命令:"
echo "   查看日志: docker compose logs -f"
echo "   停止服务: docker compose stop"
echo "   重启服务: docker compose restart"
echo "   删除服务: docker compose down"
echo ""
echo "❓ 遇到问题？查看 README.md"
echo "=========================================="
