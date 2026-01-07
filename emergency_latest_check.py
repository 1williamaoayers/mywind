import akshare as ak
import json
import pandas as pd
from datetime import date, datetime

def json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)

def get_latest_rows(df, n=5):
    if df is None or df.empty:
        return []
    
    # Try to find a date column to ensure we get the latest
    date_cols = [c for c in df.columns if '日期' in c or 'date' in c or '报告期' in c or '报告日' in c]
    if date_cols:
        # Convert to datetime for sorting
        col = date_cols[0]
        try:
            df[col] = pd.to_datetime(df[col], errors='ignore')
            df = df.sort_values(by=col, ascending=True) # Ascending so latest is at the bottom
        except:
            pass
    
    return df.tail(n).to_dict(orient='records')

print("=== EMERGENCY RE-VERIFICATION: LATEST DATA 2026/2025 ===")

# Batch 8: Financials 01810
print("\n>>> 37. stock_hk_financial_indicator_em (01810) - LATEST")
try:
    df = ak.stock_hk_financial_indicator_em(symbol="01810")
    print(json.dumps(get_latest_rows(df, 3), default=json_serial, ensure_ascii=False, indent=2))
except Exception as e: print(f"Error: {e}")

# Batch 8: Sina 600519
print("\n>>> 40. stock_financial_report_sina (600519) - LATEST")
try:
    # Sina returns descending. We need the latest.
    df = ak.stock_financial_report_sina(stock="600519", symbol="现金流量表")
    print(json.dumps(get_latest_rows(df, 3), default=json_serial, ensure_ascii=False, indent=2))
except Exception as e: print(f"Error: {e}")

# Batch 7: GDHS 01810 (Check if supported or need alternative)
print("\n>>> 31. stock_zh_a_gdhs (01810) - LATEST")
try:
    df = ak.stock_zh_a_gdhs(symbol="01810")
    print(json.dumps(get_latest_rows(df, 1), default=json_serial, ensure_ascii=False, indent=2))
except Exception as e: print(f"Error: {e}")

# Batch 1 & 2 refresher for 2026 check
print("\n>>> 2. stock_hk_hist (01810) - LATEST 5 DAYS")
try:
    df = ak.stock_hk_hist(symbol="01810", period="daily", adjust="")
    print(json.dumps(get_latest_rows(df, 5), default=json_serial, ensure_ascii=False, indent=2))
except Exception as e: print(f"Error: {e}")
