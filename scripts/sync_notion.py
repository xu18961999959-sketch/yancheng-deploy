#!/usr/bin/env python3
"""
Step 1: Pull latest data from Notion databases to CSV files.

  盐城综合库  → data/recruitment_package.csv
  央国企专项库 → data/soe_positions.csv
"""

import urllib.request
import json
import csv
import time
import re
import os
import sys

TOKEN          = os.environ.get("NOTION_TOKEN", "")
NOTION_VERSION = "2022-06-28"
DB_ZONGHE      = "2f97d626-c84e-81a5-b792-dc7157e664ac"
DB_YANGGUO     = "32c7d626-c84e-809c-8338-c75ac416ca92"

ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
os.makedirs(DATA_DIR, exist_ok=True)

if not TOKEN:
    print("ERROR: NOTION_TOKEN env var not set", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}

YANCHENG_CITIES = {
    '盐城', '亭湖', '盐都', '大丰', '东台', '建湖', '射阳', '阜宁', '滨海', '响水',
}


def api_query(db_id):
    url     = f"https://api.notion.com/v1/databases/{db_id}/query"
    payload = {"page_size": 100}
    while True:
        data = json.dumps(payload).encode()
        req  = urllib.request.Request(url, data=data, headers=HEADERS, method="POST")
        with urllib.request.urlopen(req, timeout=30) as r:
            res = json.loads(r.read())
        for page in res.get("results", []):
            yield page["properties"]
        if not res.get("has_more"):
            break
        payload["start_cursor"] = res["next_cursor"]
        time.sleep(0.25)


def gp(props, name):
    p = props.get(name)
    if not p:
        return ""
    t = p.get("type", "")
    if t == "title":
        return "".join(x.get("plain_text", "") for x in p.get("title", []))
    if t == "rich_text":
        return "".join(x.get("plain_text", "") for x in p.get("rich_text", []))
    if t == "select":
        s = p.get("select")
        return s["name"] if s else ""
    if t == "url":
        return p.get("url") or ""
    if t == "date":
        d = p.get("date")
        return d["start"] if d else ""
    return ""


# ── 盐城综合库 → recruitment_package.csv ─────────────────────────────────────

RECRUIT_FIELDS = [
    "职位名称", "原文链接", "发布日期", "工作地点",
    "招聘单位", "来源网站", "状态", "职位描述", "薪资范围",
]

def sync_zonghe():
    out  = os.path.join(DATA_DIR, "recruitment_package.csv")
    rows = []
    for props in api_query(DB_ZONGHE):
        rows.append({
            "职位名称": gp(props, "职位名称"),
            "原文链接": gp(props, "原文链接"),
            "发布日期": gp(props, "发布日期"),
            "工作地点": gp(props, "工作地点"),
            "招聘单位": gp(props, "招聘单位"),
            "来源网站": gp(props, "来源网站"),
            "状态":     gp(props, "状态"),
            "职位描述": gp(props, "职位描述"),
            "薪资范围": gp(props, "薪资范围"),
        })
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        csv.DictWriter(f, fieldnames=RECRUIT_FIELDS).writeheader()
        csv.DictWriter(f, fieldnames=RECRUIT_FIELDS).writerows(rows)
    print(f"  recruitment_package.csv  {len(rows)} rows")
    return len(rows)


# ── 央国企专项库 → soe_positions.csv ─────────────────────────────────────────

SOE_FIELDS = [
    "company", "type", "industry", "positions", "majors",
    "education", "locations", "salary", "year", "season",
    "deadline", "source", "has_yancheng",
]

def _has_yancheng(loc):
    return "是" if ("全国" in loc or any(c in loc for c in YANCHENG_CITIES)) else "否"

def _clean(text):
    return re.sub(r'[\s>]+', '', text).strip()

def sync_yangguo():
    out  = os.path.join(DATA_DIR, "soe_positions.csv")
    rows = []
    for props in api_query(DB_YANGGUO):
        title    = gp(props, "职位名称")
        target   = gp(props, "招聘对象")
        loc      = gp(props, "工作地点")
        m        = re.search(r'20\d\d', target)
        rows.append({
            "company":      gp(props, "招聘单位"),
            "type":         _clean(gp(props, "公司类型")) or "央国企",
            "industry":     "",
            "positions":    title,
            "majors":       "",
            "education":    target[:200],
            "locations":    loc,
            "salary":       gp(props, "薪资范围"),
            "year":         m.group() if m else "2026",
            "season":       "春招" if "春招" in title + target else ("秋招" if "秋招" in title + target else ""),
            "deadline":     gp(props, "投递截止"),
            "source":       gp(props, "来源网站"),
            "has_yancheng": _has_yancheng(loc),
        })
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SOE_FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"  soe_positions.csv        {len(rows)} rows")
    return len(rows)


if __name__ == "__main__":
    print("Pulling from Notion...")
    n1 = sync_zonghe()
    n2 = sync_yangguo()
    print(f"Done. {n1} 单招 + {n2} 央国企 records.")
