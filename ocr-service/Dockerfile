# OCR Service Dockerfile
# 基于 Python 3.11 slim 镜像 (内存优化)

FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖 (poppler用于PDF转图片)
# 注意: Debian trixie 使用 libgl1 替代 libgl1-mesa-glx
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY server.py .
COPY rag_service.py .

# 创建向量数据库目录
RUN mkdir -p /app/vector_db

# 暴露端口
EXPOSE 9000

# 环境变量
ENV OCR_PORT=9000
ENV EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2

# 内存限制相关
ENV MALLOC_TRIM_THRESHOLD_=100000

# 启动命令
CMD ["python", "server.py"]

