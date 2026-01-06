"""
RAG Service - 向量检索服务
使用 ChromaDB + Sentence-Transformers 实现语义检索

功能:
- 文档索引 (存入向量库)
- 语义检索 (返回Top-K相关文档)
- 与 DeepSeek 结合实现 RAG
"""

import os
from typing import List, Optional, Dict, Any
from datetime import datetime
import hashlib

# 尝试导入 ChromaDB
try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False
    print("[警告] ChromaDB 未安装，向量检索功能不可用")

# 尝试导入 Sentence Transformers
try:
    from sentence_transformers import SentenceTransformer
    HAS_EMBEDDING = True
except ImportError:
    HAS_EMBEDDING = False
    print("[警告] sentence-transformers 未安装，语义嵌入功能不可用")


class RAGService:
    """RAG 服务类"""
    
    def __init__(self, persist_directory: str = "/app/vector_db"):
        """
        初始化 RAG 服务
        
        Args:
            persist_directory: 向量数据库持久化目录
        """
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.embedding_model = None
        
        # 初始化 ChromaDB
        if HAS_CHROMADB:
            os.makedirs(persist_directory, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(anonymized_telemetry=False)
            )
            # 获取或创建集合
            self.collection = self.client.get_or_create_collection(
                name="mywind_documents",
                metadata={"description": "MyWind 文档向量库"}
            )
            print(f"[RAG] ChromaDB 初始化完成，集合: mywind_documents")
        
        # 初始化嵌入模型 (使用轻量级中文模型)
        if HAS_EMBEDDING:
            # 使用 paraphrase-multilingual-MiniLM-L12-v2 (较轻量，支持中文)
            model_name = os.environ.get(
                "EMBEDDING_MODEL",
                "paraphrase-multilingual-MiniLM-L12-v2"
            )
            print(f"[RAG] 加载嵌入模型: {model_name} ...")
            self.embedding_model = SentenceTransformer(model_name)
            print(f"[RAG] 嵌入模型加载完成")
    
    def _generate_id(self, content: str) -> str:
        """基于内容生成唯一ID"""
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        将长文本分割为小块
        
        Args:
            text: 原始文本
            chunk_size: 每块大小
            overlap: 块之间重叠
        """
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
        
        return chunks
    
    def index_document(
        self,
        content: str,
        source: str = "unknown",
        doc_type: str = "news",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        索引单个文档
        
        Args:
            content: 文档内容
            source: 来源 (如 hkexnews, gelonghui)
            doc_type: 类型 (news, announcement, report)
            metadata: 额外元数据
        
        Returns:
            {"success": True, "chunks_indexed": N}
        """
        if not HAS_CHROMADB or self.collection is None:
            return {"success": False, "error": "ChromaDB 未初始化"}
        
        if not HAS_EMBEDDING or self.embedding_model is None:
            return {"success": False, "error": "嵌入模型未初始化"}
        
        if not content or len(content.strip()) < 10:
            return {"success": False, "error": "内容太短"}
        
        # 分块
        chunks = self._chunk_text(content)
        
        # 生成嵌入
        embeddings = self.embedding_model.encode(chunks).tolist()
        
        # 准备元数据
        base_metadata = {
            "source": source,
            "doc_type": doc_type,
            "indexed_at": datetime.now().isoformat(),
            **(metadata or {})
        }
        
        # 插入向量库
        ids = []
        metadatas = []
        for i, chunk in enumerate(chunks):
            doc_id = f"{self._generate_id(content)}_{i}"
            ids.append(doc_id)
            metadatas.append({**base_metadata, "chunk_index": i})
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas
        )
        
        return {
            "success": True,
            "chunks_indexed": len(chunks),
            "total_chars": len(content)
        }
    
    def search(
        self,
        query: str,
        top_k: int = 5,
        filter_source: Optional[str] = None,
        filter_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        语义检索
        
        Args:
            query: 查询文本
            top_k: 返回结果数量
            filter_source: 过滤来源
            filter_type: 过滤类型
        
        Returns:
            [{content, source, score, metadata}, ...]
        """
        if not HAS_CHROMADB or self.collection is None:
            return []
        
        if not HAS_EMBEDDING or self.embedding_model is None:
            return []
        
        # 生成查询嵌入
        query_embedding = self.embedding_model.encode([query]).tolist()[0]
        
        # 构建过滤条件
        where = {}
        if filter_source:
            where["source"] = filter_source
        if filter_type:
            where["doc_type"] = filter_type
        
        # 查询
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where if where else None
        )
        
        # 格式化结果
        formatted = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                formatted.append({
                    "content": doc,
                    "score": 1 - results["distances"][0][i] if results["distances"] else 0,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {}
                })
        
        return formatted
    
    def get_stats(self) -> Dict[str, Any]:
        """获取向量库统计信息"""
        if not HAS_CHROMADB or self.collection is None:
            return {"error": "ChromaDB 未初始化"}
        
        count = self.collection.count()
        return {
            "total_documents": count,
            "persist_directory": self.persist_directory,
            "chromadb_available": True,
            "embedding_available": HAS_EMBEDDING
        }


# 全局实例 (在server.py中使用)
rag_service = None

def get_rag_service() -> Optional[RAGService]:
    """获取全局RAG服务实例"""
    global rag_service
    if rag_service is None and HAS_CHROMADB and HAS_EMBEDDING:
        rag_service = RAGService()
    return rag_service
