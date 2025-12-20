# =====================================================
# Private-Wind-Ultra / MyWind AI 投研助手
# 生产级多架构 Dockerfile
# 支持: linux/amd64, linux/arm64, linux/arm/v7
# =====================================================

FROM node:20-alpine

# 元信息
LABEL org.opencontainers.image.source="https://github.com/1williamaoayers/mywind"
LABEL org.opencontainers.image.description="MyWind AI 投研助手 - 全架构版"
LABEL org.opencontainers.image.licenses="MIT"

# 设置工作目录
WORKDIR /app

# 设置 npm 镜像加速 (可选，国内用户可取消注释)
# RUN npm config set registry https://registry.npmmirror.com

# 1. 先复制依赖文件 (利用 Docker 缓存层)
COPY package*.json ./

# 2. 安装生产依赖
RUN npm install --production --no-optional \
    && npm cache clean --force \
    && rm -rf /tmp/*

# 3. 复制源代码
COPY . .

# 4. 创建必要目录
RUN mkdir -p /app/logs

# 5. 设置环境变量默认值
ENV NODE_ENV=production \
    APP_PORT=8088 \
    MONGO_URI=mongodb://host.docker.internal:27017/private_wind

# 6. 暴露端口
EXPOSE 8088

# 7. 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8088/health || exit 1

# 8. 启动命令
CMD ["node", "server.js"]
