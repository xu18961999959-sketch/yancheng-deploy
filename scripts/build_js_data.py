#!/usr/bin/env python3
"""
Step 2: Convert CSV data files to JavaScript data files for the webapp.

  data/recruitment_package.csv → webapp/data/recruitment.js  (DATA_RECRUITMENT)
  data/soe_positions.csv       → webapp/data/soe.js          (DATA_SOE)
"""

import csv
import json
import os

ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
WEB_DATA = os.path.join(ROOT, "webapp", "data")
os.makedirs(WEB_DATA, exist_ok=True)


def write_js(var_name, records, out_path):
    payload = json.dumps(records, ensure_ascii=False, separators=(',', ':'))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"var {var_name} = {payload};")
    print(f"  {os.path.basename(out_path):30s}  {len(records)} records")


# ── recruitment_package.csv → recruitment.js ─────────────────────────────────

def build_recruitment():
    src = os.path.join(DATA_DIR, "recruitment_package.csv")
    if not os.path.exists(src):
        print(f"  [skip] {src} not found")
        return
    records = []
    with open(src, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            records.append({
                "title":    row.get("职位名称", ""),
                "link":     row.get("原文链接", ""),
                "date":     row.get("发布日期", ""),
                "location": row.get("工作地点", ""),
                "unit":     row.get("招聘单位", ""),
                "source":   row.get("来源网站", ""),
                "status":   row.get("状态", ""),
                "desc":     row.get("职位描述", ""),
                "salary":   row.get("薪资范围", ""),
            })
    write_js("DATA_RECRUITMENT", records, os.path.join(WEB_DATA, "recruitment.js"))


# ── soe_positions.csv → soe.js ───────────────────────────────────────────────

def build_soe():
    src = os.path.join(DATA_DIR, "soe_positions.csv")
    if not os.path.exists(src):
        print(f"  [skip] {src} not found")
        return
    records = []
    with open(src, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            records.append({
                "company":      row.get("company", ""),
                "type":         row.get("type", ""),
                "positions":    row.get("positions", ""),
                "education":    row.get("education", ""),
                "locations":    row.get("locations", ""),
                "salary":       row.get("salary", ""),
                "year":         row.get("year", ""),
                "season":       row.get("season", ""),
                "deadline":     row.get("deadline", ""),
                "source":       row.get("source", ""),
                "has_yancheng": row.get("has_yancheng", "否"),
            })
    write_js("DATA_SOE", records, os.path.join(WEB_DATA, "soe.js"))


if __name__ == "__main__":
    print("Building JS data files...")
    build_recruitment()
    build_soe()
    print("Done.")
