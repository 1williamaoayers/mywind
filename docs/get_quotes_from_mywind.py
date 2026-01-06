    async def _get_quotes_from_mywind(self, code: str) -> Optional[Dict[str, Any]]:
        """
        从MyWind API获取股票实时行情
        
        Args:
            code: 股票代码
            
        Returns:
            标准化的行情数据
        """
        try:
            logger.debug(f"📈 从MyWind API获取 {code} 实时行情...")
            
            # 调用MyWind的stock_bid_ask_em接口
            df = await self._get_from_mywind_api('stock_bid_ask_em', {'symbol': code})
            
            if df is None or df.empty:
                logger.warning(f"⚠️ MyWind API未返回{code}的行情数据")
                return None
            
            # 将DataFrame转换为字典格式
            # 假设AKTools返回的格式与本地AKShare一致
            data_dict = dict(zip(df['item'], df['value']))
            
            # 转换为标准化格式（与本地AKShare保持一致）
            from datetime import datetime, timezone, timedelta
            cn_tz = timezone(timedelta(hours=8))
            now_cn = datetime.now(cn_tz)
            trade_date = now_cn.strftime("%Y-%m-%d")
            
            volume_in_lots = int(data_dict.get("总手", 0))
            volume_in_shares = volume_in_lots * 100
            
            quotes = {
                "code": code,
                "symbol": code,
                "name": f"股票{code}",
                "price": float(data_dict.get("最新", 0)),
                "close": float(data_dict.get("最新", 0)),
                "current_price": float(data_dict.get("最新", 0)),
                "change": float(data_dict.get("涨跌", 0)),
                "change_percent": float(data_dict.get("涨幅", 0)),
                "pct_chg": float(data_dict.get("涨幅", 0)),
                "volume": volume_in_shares,
                "amount": float(data_dict.get("金额", 0)),
                "open": float(data_dict.get("今开", 0)),
                "high": float(data_dict.get("最高", 0)),
                "low": float(data_dict.get("最低", 0)),
                "pre_close": float(data_dict.get("昨收", 0)),
                "turnover_rate": float(data_dict.get("换手", 0)),
                "volume_ratio": float(data_dict.get("量比", 0)),
                "trade_date": trade_date,
                "updated_at": now_cn.isoformat(),
                "full_symbol": self._get_full_symbol(code),
                "market_info": self._get_market_info(code),
                "data_source": "mywind",
                "last_sync": datetime.now(timezone.utc),
                "sync_status": "success"
            }
            
            logger.info(f"✅ {code} MyWind API获取成功: 价格={quotes['price']}, 涨跌幅={quotes['change_percent']}%")
            return quotes
            
        except Exception as e:
            logger.error(f"❌ MyWind API获取{code}失败: {e}", exc_info=True)
            return None
