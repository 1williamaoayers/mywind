# =====================================================
# Private-Wind-Ultra / MyWind AI 投研助手
# 基于 zenika/alpine-chrome 预装 Chrome 环境
# 支持: linux/amd64, linux/arm64
# =====================================================

FROM zenika/alpine-chrome:with-node

# 元信息
LABEL org.opencontainers.image.source="https://github.com/1williamaoayers/mywind"
LABEL org.opencontainers.image.description="MyWind AI 投研助手 - 全架构版"
LABEL org.opencontainers.image.licenses="MIT"

# 切换到 root 用户安装依赖
USER root

# 安装中文字体（OCR 识别需要）
RUN apk add --no-cache font-noto-cjk \
    && rm -rf /var/cache/apk/*

# 设置工作目录
WORKDIR /app

# 设置 Puppeteer 使用预装的 Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

# 1. 先复制依赖文件 (利用 Docker 缓存层)
COPY package*.json ./

# 2. 安装生产依赖
RUN npm install --production --no-optional \
    && npm cache clean --force \
    && rm -rf /tmp/*

# 3. 复制源代码
COPY . .

# 4. 创建必要目录并设置权限
RUN mkdir -p /app/logs /tmp/puppeteer-cookies \
    && chown -R chrome:chrome /app /tmp/puppeteer-cookies

# 5. 切换回 chrome 用户（安全最佳实践）
USER chrome

# 6. 设置环境变量默认值
ENV NODE_ENV=production \
    APP_PORT=8088 \
    MONGO_URI=mongodb://host.docker.internal:27017/private_wind

# 7. 暴露端口
EXPOSE 8088

# 8. 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8088/health || exit 1

# 9. 启动命令
CMD ["node", "server.js"]
