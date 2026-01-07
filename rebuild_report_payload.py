import akshare as ak
import json
import pandas as pd
from datetime import date, datetime

def json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)

def get_latest(df, n=3):
    if df is None or df.empty: return []
    # Identify date column
    date_cols = [c for c in df.columns if any(x in c for x in ['日期', 'date', '报告', '公告', 'Time', 'time'])]
    if date_cols:
        col = date_cols[0]
        try:
            df[col] = pd.to_datetime(df[col], errors='ignore')
            df = df.sort_values(by=col, ascending=True)
        except: pass
    return df.tail(n).to_dict(orient='records')

results = {}

print("Fetching Batch 1-8 Latest Data...")

# 2. HK Hist
try: results['2_hk_hist'] = get_latest(ak.stock_hk_hist(symbol="01810", period="daily", adjust=""))
except: pass

# 7. US Daily
try: results['7_us_daily'] = get_latest(ak.stock_us_daily(symbol="TSLA", adjust=""))
except: pass

# 12. CN Index
try: results['12_sh_index'] = get_latest(ak.stock_zh_index_daily(symbol="sh000001"))
except: pass

# 18. PMI
try: results['18_pmi'] = get_latest(ak.index_pmi_com_cx())
except: pass

# 21. Equity Pledge
try: results['21_gpzy'] = get_latest(ak.stock_gpzy_profile_em())
except: pass

# 30/37. HK Profile & Indicators
try: results['30_hk_profile'] = ak.stock_individual_basic_info_hk_xq(symbol="01810").to_dict(orient='records')[:15]
except: pass
try: results['37_hk_indicator'] = get_latest(ak.stock_hk_financial_indicator_em(symbol="01810"), 3)
except: pass

# 40. Sina Report
try: results['40_sina_report'] = get_latest(ak.stock_financial_report_sina(stock="600519", symbol="现金流量表"), 3)
except: pass

print("--- PAYLOAD START ---")
print(json.dumps(results, default=json_serial, ensure_ascii=False, indent=2))
print("--- PAYLOAD END ---")
