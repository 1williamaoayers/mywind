"""
MyWind API通用请求方法
用于TradingAgents连接外部MyWind API
"""
import asyncio
import logging
from typing import Dict, Any, Optional
import pandas as pd

logger = logging.getLogger(__name__)


async def _get_from_mywind_api(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    """
    从MyWind API获取数据的通用方法
    
    Args:
        endpoint: API端点名称（如 'stock_bid_ask_em'）
        params: 请求参数字典
        
   Returns:
        响应数据（通常是DataFrame的JSON格式）
    """
    try:
        url = f"{self.mywind_api_url}/{endpoint}"
        logger.debug(f"📡 请求MyWind API: {url}, 参数: {params}")
        
        # 异步执行HTTP请求
        response = await asyncio.to_thread(
            self.http_session.get,
            url,
            params=params or {},
            timeout=15
        )
        
        response.raise_for_status()
        data = response.json()
        
        # AKTools返回的是DataFrame转换的JSON格式
        # 需要转换回DataFrame或字典
        return self._parse_aktools_response(data, endpoint)
        
    except Exception as e:
        logger.error(f"❌ MyWind API请求失败 [{endpoint}]: {e}")
        return None


def _parse_aktools_response(self, data: Any, endpoint: str) -> Any:
    """
    解析AKTools API响应
    
    Args:
        data: API响应的JSON数据
        endpoint: 端点名称
        
    Returns:
        解析后的数据（通常转换为DataFrame）
    """
    try:
        # AKTools返回格式通常是：
        # - DataFrame.to_dict('records') 格式
        # - 或者直接是dict/list
        
        if isinstance(data, list):
            # 列表格式，转换为DataFrame
            return pd.DataFrame(data)
        elif isinstance(data, dict):
            # 可能是单条记录或DataFrame字典格式
            if 'data' in data:
                # 如果有data字段，提取它
                return pd.DataFrame(data['data'])
            else:
                # 直接转换
                return pd.DataFrame([data])
        else:
            logger.warning(f"⚠️ 未知的响应格式: {type(data)}")
            return data
            
    except Exception as e:
        logger.error(f"❌ 解析AKTools响应失败: {e}")
        return None
