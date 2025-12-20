#!/bin/bash
# Private-Wind-Ultra 本地快速启动脚本
# 用法: ./start.sh [your-github-username]

set -e

GITHUB_USER="${1:-your-username}"
IMAGE="ghcr.io/${GITHUB_USER}/mywind:latest"

echo "🚀 Private-Wind-Ultra 启动脚本"
echo "================================"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从模板创建..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置 API Key 等信息"
fi

# 拉取最新镜像
echo ""
echo "📦 拉取镜像: ${IMAGE}"
docker pull ${IMAGE} || {
    echo "❌ 拉取镜像失败，请检查:"
    echo "   1. 镜像名称是否正确"
    echo "   2. 是否需要登录: docker login ghcr.io"
    exit 1
}

# 设置环境变量
export GITHUB_USER=${GITHUB_USER}

# 启动服务
echo ""
echo "🐳 启动服务..."
docker-compose up -d

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
if curl -s http://localhost:8088/health > /dev/null; then
    echo ""
    echo "✅ 服务启动成功！"
    echo ""
    echo "🌐 控制台地址: http://localhost:8088"
    echo "📊 健康检查: http://localhost:8088/health"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker-compose logs -f app"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"
else
    echo ""
    echo "⚠️  服务可能未完全启动，请查看日志:"
    echo "  docker-compose logs -f"
fi
