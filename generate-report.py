#!/usr/bin/env python3
"""生成采集内容报告"""

import json
import sys

with open('targeted-scrape-result.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('# 披露易公告采集内容报告')
print()
print(f'采集时间: {data["time"]}')
print(f'总条数: {data["totalResults"]}')
print()

for r in data['results']:
    print('---')
    print()
    print(f'## {r.get("stockName", "未知")} ({r.get("stockCode", "")})')
    print()
    print(f'**标题**: {r.get("title", "无")}')
    print()
    print(f'**URL**: {r.get("url", "无")}')
    print()
    confidence = r.get('ocrConfidence')
    if confidence:
        print(f'**OCR置信度**: {confidence}%')
        print()
    content = r.get('content', '')
    if content:
        print(f'**内容长度**: {len(content)} 字符')
        print()
        print('**完整内容**:')
        print()
        print('```')
        print(content)
        print('```')
    else:
        print('**内容**: (无法提取或非PDF)')
    print()
