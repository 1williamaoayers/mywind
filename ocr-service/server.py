"""
OCR Service - 高精度中文OCR服务
使用 RapidOCR + RapidTable 实现 PDF/图片 内容提取

API:
- POST /ocr/image - 图片OCR
- POST /ocr/pdf - PDF OCR (多页)
- GET /health - 健康检查
"""

import os
import io
import gc
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

# RapidOCR 初始化 (全局单例，节省内存)
from rapidocr_onnxruntime import RapidOCR

# 尝试导入 RapidTable (可选)
try:
    from rapid_table import RapidTable
    TABLE_ENGINE = RapidTable()
    HAS_TABLE = True
except ImportError:
    HAS_TABLE = False
    print("[警告] RapidTable 未安装，表格识别功能不可用")

# PDF转图片
try:
    from pdf2image import convert_from_bytes
    HAS_PDF2IMAGE = True
except ImportError:
    HAS_PDF2IMAGE = False
    print("[警告] pdf2image 未安装，PDF处理功能不可用")

from PIL import Image

# ========== 初始化 ==========
app = FastAPI(
    title="OCR Service",
    description="高精度中文OCR服务 - RapidOCR + RapidTable",
    version="1.0.0"
)

# OCR引擎 (全局单例)
OCR_ENGINE = RapidOCR()

# ========== 工具函数 ==========

def image_to_bytes(image: Image.Image) -> bytes:
    """将PIL Image转换为bytes"""
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


def ocr_image_content(image_bytes: bytes) -> dict:
    """
    对单张图片进行OCR识别
    返回: {"text": "识别文本", "confidence": 置信度, "boxes": 文本框列表}
    """
    # RapidOCR 识别
    result, elapse = OCR_ENGINE(image_bytes)
    
    if result is None or len(result) == 0:
        return {"text": "", "confidence": 0, "boxes": []}
    
    # 提取文本和置信度
    texts = []
    confidences = []
    boxes = []
    
    for item in result:
        # item 格式: [box, text, confidence]
        box, text, conf = item
        texts.append(text)
        confidences.append(conf)
        boxes.append(box)
    
    # 计算平均置信度
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    return {
        "text": "\n".join(texts),
        "confidence": round(avg_confidence * 100, 1),  # 转为百分比
        "boxes": boxes,
        "elapse": elapse
    }


def ocr_pdf_content(pdf_bytes: bytes, max_pages: int = 20) -> dict:
    """
    对PDF进行OCR识别 (逐页处理，控制内存)
    返回: {"text": "全文", "confidence": 平均置信度, "pages": 页数}
    """
    if not HAS_PDF2IMAGE:
        raise HTTPException(status_code=500, detail="pdf2image 未安装")
    
    all_texts = []
    all_confidences = []
    page_count = 0
    
    # 逐页转换+识别 (流式处理，节省内存)
    try:
        # 转换PDF为图片列表
        images = convert_from_bytes(
            pdf_bytes,
            dpi=150,  # 平衡质量和速度
            first_page=1,
            last_page=max_pages
        )
        
        for i, image in enumerate(images):
            page_count += 1
            
            # 转为bytes进行OCR
            img_bytes = image_to_bytes(image)
            result = ocr_image_content(img_bytes)
            
            if result["text"]:
                all_texts.append(f"--- 第{page_count}页 ---\n{result['text']}")
                all_confidences.append(result["confidence"])
            
            # 立即释放图片内存
            del image
            del img_bytes
            
            # 每5页强制GC
            if page_count % 5 == 0:
                gc.collect()
        
        # 释放图片列表
        del images
        gc.collect()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF转换失败: {str(e)}")
    
    # 计算平均置信度
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0
    
    return {
        "text": "\n\n".join(all_texts),
        "confidence": round(avg_confidence, 1),
        "pages": page_count
    }


# ========== API路由 ==========

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "ocr_engine": "RapidOCR",
        "table_support": HAS_TABLE,
        "pdf_support": HAS_PDF2IMAGE
    }


@app.post("/ocr/image")
async def ocr_image(file: UploadFile = File(...)):
    """
    图片OCR接口
    
    请求: multipart/form-data, file=图片文件
    响应: {"text": "识别文本", "confidence": 置信度}
    """
    # 验证文件类型
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    
    # 读取文件
    content = await file.read()
    
    # OCR识别
    result = ocr_image_content(content)
    
    return JSONResponse(content={
        "success": True,
        "text": result["text"],
        "confidence": result["confidence"],
        "elapse": result.get("elapse", 0)
    })


@app.post("/ocr/pdf")
async def ocr_pdf(
    file: UploadFile = File(...),
    max_pages: Optional[int] = 20
):
    """
    PDF OCR接口
    
    请求: multipart/form-data, file=PDF文件
    参数: max_pages=最大处理页数(默认20)
    响应: {"text": "全文", "confidence": 置信度, "pages": 页数}
    """
    # 验证文件类型
    if not file.content_type == "application/pdf" and not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="请上传PDF文件")
    
    # 读取文件
    content = await file.read()
    
    # OCR识别
    result = ocr_pdf_content(content, max_pages=max_pages)
    
    return JSONResponse(content={
        "success": True,
        "text": result["text"],
        "confidence": result["confidence"],
        "pages": result["pages"]
    })


@app.post("/ocr/table")
async def ocr_table(file: UploadFile = File(...)):
    """
    表格识别接口 (需要安装 rapid-table)
    
    请求: multipart/form-data, file=图片文件
    响应: {"markdown": "表格markdown", "html": "表格HTML"}
    """
    if not HAS_TABLE:
        raise HTTPException(status_code=501, detail="RapidTable 未安装")
    
    # 读取文件
    content = await file.read()
    
    try:
        # 表格识别
        result, elapse = TABLE_ENGINE(content)
        
        return JSONResponse(content={
            "success": True,
            "markdown": result.get("markdown", ""),
            "html": result.get("html", ""),
            "elapse": elapse
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"表格识别失败: {str(e)}")


# ========== RAG 向量检索 ==========

# 导入RAG服务
try:
    from rag_service import get_rag_service, HAS_CHROMADB, HAS_EMBEDDING
    RAG_AVAILABLE = HAS_CHROMADB and HAS_EMBEDDING
except ImportError:
    RAG_AVAILABLE = False
    HAS_CHROMADB = False
    HAS_EMBEDDING = False
    print("[警告] RAG服务模块未找到")

from pydantic import BaseModel
from typing import Optional, Dict, Any

class IndexRequest(BaseModel):
    content: str
    source: str = "unknown"
    doc_type: str = "news"
    metadata: Optional[Dict[str, Any]] = None

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filter_source: Optional[str] = None
    filter_type: Optional[str] = None


@app.post("/index")
async def index_document(request: IndexRequest):
    """
    索引文档到向量库
    
    请求: {"content": "文档内容", "source": "来源", "doc_type": "类型"}
    响应: {"success": True, "chunks_indexed": N}
    """
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=501, detail="RAG服务不可用")
    
    rag = get_rag_service()
    if rag is None:
        raise HTTPException(status_code=500, detail="RAG服务初始化失败")
    
    result = rag.index_document(
        content=request.content,
        source=request.source,
        doc_type=request.doc_type,
        metadata=request.metadata
    )
    
    return JSONResponse(content=result)


@app.post("/search")
async def search_documents(request: SearchRequest):
    """
    语义检索
    
    请求: {"query": "搜索词", "top_k": 5}
    响应: [{"content": "...", "score": 0.85, "metadata": {...}}, ...]
    """
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=501, detail="RAG服务不可用")
    
    rag = get_rag_service()
    if rag is None:
        raise HTTPException(status_code=500, detail="RAG服务初始化失败")
    
    results = rag.search(
        query=request.query,
        top_k=request.top_k,
        filter_source=request.filter_source,
        filter_type=request.filter_type
    )
    
    return JSONResponse(content={
        "success": True,
        "query": request.query,
        "results": results,
        "count": len(results)
    })


@app.get("/rag/stats")
async def rag_stats():
    """获取RAG向量库统计"""
    if not RAG_AVAILABLE:
        return JSONResponse(content={
            "error": "RAG服务不可用",
            "chromadb_installed": HAS_CHROMADB,
            "embedding_installed": HAS_EMBEDDING
        })
    
    rag = get_rag_service()
    if rag is None:
        return JSONResponse(content={"error": "RAG服务初始化失败"})
    
    return JSONResponse(content=rag.get_stats())


# ========== 启动 ==========

if __name__ == "__main__":
    # 获取端口 (默认9000)
    port = int(os.environ.get("OCR_PORT", 9000))
    
    print(f"[OCR服务] 启动中... 端口: {port}")
    print(f"[OCR服务] 表格支持: {HAS_TABLE}")
    print(f"[OCR服务] PDF支持: {HAS_PDF2IMAGE}")
    print(f"[OCR服务] RAG支持: {RAG_AVAILABLE}")
    
    # 预加载RAG服务
    if RAG_AVAILABLE:
        print("[OCR服务] 初始化RAG服务...")
        get_rag_service()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

