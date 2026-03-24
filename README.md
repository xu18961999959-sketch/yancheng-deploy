# 盐城选岗推荐系统 - 网页版

每天自动从 Notion 同步最新招聘数据并部署。

## 一次性配置（10 分钟）

### 第一步：创建 GitHub 仓库

1. 打开 https://github.com/new
2. 仓库名称填 `yancheng-matcher`，选 **Private**（私有）
3. 点击 Create repository

### 第二步：上传本项目文件

把 `yancheng-matcher-web/` 目录内所有文件上传到仓库根目录。

```bash
cd yancheng-matcher-web
git init
git remote add origin https://github.com/你的用户名/yancheng-matcher.git
git add .
git commit -m "init"
git push -u origin main
```

### 第三步：配置 Notion Token（密钥）

1. 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. Name 填 `NOTION_TOKEN`
4. Secret 填你的 Notion Token（在 Notion → Settings → Connections → Develop or manage integrations 里找）
5. 点击 Add secret

### 第四步：开启 GitHub Pages

1. 进入仓库 **Settings** → **Pages**
2. Source 选 **Deploy from a branch**
3. Branch 选 `main`，Folder 选 `/webapp`
4. 点击 Save

等 1-2 分钟，访问地址：`https://你的用户名.github.io/yancheng-matcher/`

---

## 自动同步说明

每天北京时间 **06:00**，GitHub Actions 自动执行：

```
Notion 拉取最新数据
    ↓
生成 webapp/data/recruitment.js（单招）
生成 webapp/data/soe.js（央国企）
    ↓
提交推送到 GitHub
    ↓
GitHub Pages 自动更新网页
```

也可以手动触发：仓库 → **Actions** → **Daily Notion Sync & Deploy** → **Run workflow**

---

## 文件说明

```
├── .github/workflows/daily-sync.yml  # 自动同步任务
├── scripts/
│   ├── sync_notion.py                # Notion → CSV
│   └── build_js_data.py              # CSV → JS 数据文件
├── data/                             # 中间 CSV（自动生成，不需要手动编辑）
└── webapp/
    ├── index.html / app.js / ...     # 网页主体（不需要修改）
    └── data/
        ├── positions.js              # 统招历史（静态，手动更新）
        ├── competition.js            # 竞争比（静态，手动更新）
        ├── recruitment.js            # 单招信息（每日自动更新）
        └── soe.js                    # 央国企信息（每日自动更新）
```
