// report.js - HTML report generation

function ratioHtml(r) {
  if (r === '—') return '<span style="color:#999">—</span>';
  try {
    const val = parseFloat(r.replace(':1',''));
    if (val <= 10) return `<span style="color:#27ae60;font-weight:600">${r}</span>`;
    if (val <= 30) return `<span style="color:#f39c12;font-weight:600">${r}</span>`;
    if (val <= 60) return `<span style="color:#e67e22;font-weight:600">${r}</span>`;
    return `<span style="color:#e74c3c;font-weight:600">${r}</span>`;
  } catch { return `<span style="color:#999">${r}</span>`; }
}

function findCandidateCategories(major, categories) {
  const cats = [];
  for (const [cat, majors] of Object.entries(categories)) {
    if (majors.includes(major)) cats.push(cat);
  }
  return cats;
}

function generateStrategies(candidate, stats, cats) {
  const cards = [];
  if (stats.aLatest > 0) {
    cards.push(['&#127919;', 'A档里面选主攻，别犹豫', `同学，你有<strong>${stats.aLatest}个A档岗位</strong>，这些岗位同时限了应届+专业对口，社会人员报不了，其他专业也报不了。说实话，这就是你的主战场。老师建议你把精力集中在A档，从里面挑2-3个心仪的重点准备。`, '#fdf2f0']);
  }
  cards.push(['&#9200;', '应届身份用一年少一年', `${candidate.gradYear}年毕业，按照政策你在择业期内（2年）还能以应届身份报考。但是注意：一旦签了劳动合同、交了社保，应届身份就没了。老师见过太多同学随便找个工作签了合同，第二年想考编发现应届身份没了，后悔莫及。`, '#fdf8ef']);
  const totalPro = stats.aTotal + stats.bTotal;
  if (totalPro > 0) {
    cards.push(['&#128176;', `你的专业选择面不小`, `${candidate.major}在盐城事业编里属于有需求的专业。从历年数据看，你能匹配到<strong>${totalPro}个专业对口岗位</strong>。${cats.length > 1 ? '你的专业同时属于' + cats.join('、') + '，匹配范围更广。' : ''}`, '#eff6ff']);
  }
  if (candidate.area === '不限') {
    cards.push(['&#128205;', '市区和县区都看看，机会不一样', '你选了全区域不限，这个策略很聪明。市区（亭湖/盐都）岗位多但竞争也大，县区（东台/建湖/射阳等）竞争相对小一些。老师建议你把市区和县区的A档岗位都过一遍，看看哪些单位的竞争比更友好。', '#f0fdf4']);
  }
  if (['硕士研究生','博士研究生'].includes(candidate.education)) {
    cards.push(['&#127891;', '研究生学历是杀手锏', '94%的岗位只要求本科，限研究生的岗位竞争面骤降。同时建议你关注人才引进通道，很多免笔试直接面试，还有安家补贴。', '#fff7ed']);
  }
  cards.push(['&#128218;', '报名前一定核实原文公告', '老师的匹配是基于历年数据做的筛选，具体到2026年的岗位以官方公告为准。报名前一定看完整公告，特别是"其他条件"里可能有隐藏限制。', '#f0fdf4']);
  return cards;
}

function generateReportHtml(candidate, result, recruitmentMatches, competition, categories) {
  const { matched, tiers } = result;
  // Dynamically determine the latest year in data
  const LATEST_YEAR = matched.length > 0 ? Math.max(...matched.map(p => p.year)) : 2026;
  const posLatest = matched.filter(p => p.year === LATEST_YEAR);
  const cats = findCandidateCategories(candidate.major, categories);
  const now = new Date();
  const nowStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const stats = {
    total: matched.length,
    totalLatest: posLatest.length,
    latestYear: LATEST_YEAR,
    aTotal: tiers.A.length,
    aLatest: tiers.A.filter(p => p.year === LATEST_YEAR).length,
    bTotal: tiers.B.length,
    bLatest: tiers.B.filter(p => p.year === LATEST_YEAR).length,
    cTotal: tiers.C.length,
    cLatest: tiers.C.filter(p => p.year === LATEST_YEAR).length,
    dTotal: tiers.D.length,
    dLatest: tiers.D.filter(p => p.year === LATEST_YEAR).length,
    historical: matched.length - posLatest.length,
  };

  // Competition distribution (use 2025 ratio for stats, fallback to 2024, 2023)
  const compStats = { low: 0, mid: 0, high: 0, vhigh: 0, unknown: 0 };
  for (const p of matched) {
    const bestRatio = p.ratio25 !== '—' ? p.ratio25 : (p.ratio24 !== '—' ? p.ratio24 : p.ratio23);
    if (bestRatio === '—') { compStats.unknown++; continue; }
    try {
      const v = parseFloat(bestRatio.replace(':1',''));
      if (v <= 10) compStats.low++;
      else if (v <= 30) compStats.mid++;
      else if (v <= 60) compStats.high++;
      else compStats.vhigh++;
    } catch { compStats.unknown++; }
  }

  // Trend data
  const trendUnits = new Set();
  [...tiers.A, ...tiers.B].filter(p => p.year === LATEST_YEAR).forEach(p => trendUnits.add(p.supervisor));
  const trendData = [];
  for (const unit of [...trendUnits].slice(0, 12)) {
    const r23 = getCompetitionRatio(unit, competition, 2023);
    const r24 = getCompetitionRatio(unit, competition, 2024);
    const r25 = getCompetitionRatio(unit, competition, 2025);
    if (r23 === '—' && r24 === '—' && r25 === '—') continue;
    const parse = r => { try { return parseFloat(r.replace(':1','')); } catch { return null; } };
    const vals = [parse(r23), parse(r24), parse(r25)].filter(v => v !== null);
    let trend = '—', trendClass = 'trend-flat';
    if (vals.length >= 2) {
      if (vals[vals.length-1] > vals[vals.length-2] * 1.1) { trend = '&uarr;'; trendClass = 'trend-up'; }
      else if (vals[vals.length-1] < vals[vals.length-2] * 0.9) { trend = '&darr;'; trendClass = 'trend-down'; }
      else { trend = '&rarr;'; trendClass = 'trend-flat'; }
    }
    trendData.push({ unit, r23, r24, r25, trend, trendClass });
  }

  const strategies = generateStrategies(candidate, stats, cats);
  const isGrad = candidate.gradYear >= 2024;
  const statusText = isGrad ? '应届/择业期内' : '社会人员';

  // Teacher assessment
  const assessment = `同学，老师帮你把盐城2023-2026年2360多个岗位逐一过了一遍。你的条件是<strong>${candidate.education}、${candidate.major}、${candidate.gradYear}年毕业</strong>，属于${statusText}。<br><br>` +
    (stats.aLatest > 0
      ? `你有<strong>${stats.aLatest}个A档岗位</strong>（应届+专业对口），这些是竞争面最窄的，你的主攻目标就在这里面选。另外还有${stats.bLatest}个B档作为备选。<br><br>下面我按优先级从高到低帮你排好了，你重点看A档和B档就行。`
      + (cats.length > 1 ? `<br><br>另外告诉你一个好消息：你的<strong>${candidate.major}</strong>同时属于<strong>${cats.join('、')}</strong>，所以能匹配到更多大类要求的岗位。` : '')
      : `说实话你的专业对口岗位不多，但老师帮你想了几个方向。重点看看不限专业的岗位，也可以关注人才引进通道。`);

  // Build tier tables with 3-year competition ratios
  function tierTable(tierKey, showMajor = true, maxRows = 30) {
    const positions = tiers[tierKey];
    if (positions.length === 0) return '<div class="tier-empty">该档位暂无匹配岗位</div>';
    const majorTh = showMajor ? '<th>专业要求</th>' : '';
    let html = `<table><thead><tr><th>年份</th><th>区域</th><th>单位</th><th>岗位</th><th>学历</th>${majorTh}<th>招录</th><th class="ratio-cell">23竞争比</th><th class="ratio-cell">24竞争比</th><th class="ratio-cell">25竞争比</th></tr></thead><tbody>`;
    for (const p of positions.slice(0, maxRows)) {
      const majorTd = showMajor ? `<td><code>${(p.major||'').substring(0,35)}</code></td>` : '';
      html += `<tr><td class="center">${p.year}</td><td>${p.district}</td><td class="unit-cell">${p.unitName}</td><td>${p.positionName}</td><td class="center">${p.education}</td>${majorTd}<td class="center">${p.recruitCount}</td><td class="ratio-cell">${ratioHtml(p.ratio23)}</td><td class="ratio-cell">${ratioHtml(p.ratio24)}</td><td class="ratio-cell">${ratioHtml(p.ratio25)}</td></tr>`;
    }
    html += '</tbody></table>';
    if (positions.length > maxRows) html += `<div style="padding:12px 24px;font-size:12px;color:var(--text-muted)">... 共${positions.length}个岗位，展示前${maxRows}个</div>`;
    return html;
  }

  // Recruitment section
  let recruitHtml = '';
  if (recruitmentMatches.length > 0) {
    recruitHtml = '<table style="width:100%;border-collapse:collapse;margin-top:12px"><thead><tr style="background:#fef5e7"><th style="padding:8px;text-align:left;border-bottom:2px solid #f9e79f;width:100px">发布时间</th><th style="padding:8px;text-align:left;border-bottom:2px solid #f9e79f">招聘标题</th><th style="padding:8px;text-align:center;border-bottom:2px solid #f9e79f;width:60px">查看</th></tr></thead><tbody>';
    for (const r of recruitmentMatches) {
      recruitHtml += `<tr><td style="padding:8px;border-bottom:1px solid #f9e79f;font-size:13px">${r.date}</td><td style="padding:8px;border-bottom:1px solid #f9e79f;font-size:13px">${r.title.substring(0,60)}</td><td style="padding:8px;border-bottom:1px solid #f9e79f;text-align:center"><a href="${r.link}" target="_blank" style="color:#e67e22;text-decoration:none;font-weight:500">详情</a></td></tr>`;
    }
    recruitHtml += '</tbody></table>';
  } else {
    recruitHtml = '<div style="padding:24px;text-align:center;color:#9ca3af;font-style:italic">暂无匹配的单招/人才引进信息，建议关注盐城市人社局官网获取最新动态</div>';
  }

  // Bar chart
  const maxComp = Math.max(compStats.low, compStats.mid, compStats.high, compStats.vhigh, 1);
  const barPct = v => Math.round(v / maxComp * 100);

  // Trend rows
  let trendRows = '';
  for (const t of trendData) {
    trendRows += `<tr><td style="font-weight:500">${t.unit}</td><td class="ratio-cell">${ratioHtml(t.r23)}</td><td class="ratio-cell">${ratioHtml(t.r24)}</td><td class="ratio-cell">${ratioHtml(t.r25)}</td><td class="center"><span class="${t.trendClass}">${t.trend}</span></td></tr>`;
  }

  // Strategy cards
  let strategyHtml = '';
  for (const [icon, title, content, bg] of strategies) {
    strategyHtml += `<div class="strategy-item"><div class="strategy-badge" style="background:${bg}">${icon}</div><div class="strategy-content"><h4>${title}</h4><p>${content}</p></div></div>`;
  }

  const tierConfigs = [
    ['A', '&#11088;', 'A档：应届 + 专业对口', '竞争面最窄，主攻目标',
     `这些岗位同时限定了"应届生"和专业对口两个条件，社会人员报不了，其他专业也报不了。竞争面最窄，你的主攻目标就在这里面选。`, true],
    ['B', '&#9989;', 'B档：不限对象 + 专业对口', '多了社会人员竞争',
     '不限应届还是社会人员，但仍然限了专业。比A档多了些竞争者，不过专业门槛还在，也是不错的选择。', true],
    ['C', '&#128203;', 'C档：应届 + 不限专业', '所有应届生都能报',
     '虽然限应届，但专业不限意味着什么专业都能报，竞争人数往往比较多。老师建议不要把这类作为首选。', false],
    ['D', '&#128206;', 'D档：不限对象 + 不限专业', '保底选项',
     '谁都能报，竞争最激烈。老师一般不建议优先选，除非你对某个单位有情结，或者作为保底。', false],
  ];

  let tiersHtml = '';
  for (const [key, icon, name, subtitle, desc, showMajor] of tierConfigs) {
    const posLatestCount = tiers[key].filter(p => p.year === LATEST_YEAR).length;
    const histCount = tiers[key].filter(p => p.year !== LATEST_YEAR).length;
    tiersHtml += `
    <div class="tier-card tier-${key.toLowerCase()}">
      <div class="tier-header"><div class="tier-left"><span class="tier-icon">${icon}</span><span class="tier-name">${name}</span></div><span class="tier-count">${posLatestCount} 个（${LATEST_YEAR}）+ ${histCount} 个（历年）</span></div>
      <div class="tier-desc">${desc}</div>
      <div class="tier-body">${tierTable(key, showMajor, key === 'C' || key === 'D' ? 20 : 30)}</div>
    </div>`;
  }

  return `
<style>
.watermark-layer{pointer-events:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;overflow:hidden;}
.watermark-layer div{position:absolute;top:-50%;left:-50%;width:200%;height:200%;display:grid;grid-template-columns:repeat(auto-fill,320px);grid-template-rows:repeat(auto-fill,120px);transform:rotate(-30deg);gap:0;}
.watermark-layer span{display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:rgba(0,0,0,0.06);letter-spacing:4px;white-space:nowrap;user-select:none;}
</style>
<div class="watermark-layer"><div id="watermark-grid"></div></div>
<div class="hero"><div class="hero-inner">
  <div class="hero-badge">盐城事业编 &middot; 选岗推荐</div>
  <h1>选岗推荐报告</h1>
  <div class="hero-sub">
    <button class="btn-back" onclick="goBack()">&#8592; 重新输入条件</button>
    <button class="btn-download" onclick="downloadReport()">&#11015; 下载报告</button>
    报告时间：${nowStr} ｜ 数据：2023-2026年盐城事业单位统招岗位表 + 竞争比对照表
  </div>
</div></div>

<div class="container">
<div class="summary-strip">
  <div class="summary-card"><div class="summary-num">${stats.totalLatest}</div><div class="summary-label">${stats.latestYear}年匹配岗位</div></div>
  <div class="summary-card"><div class="summary-num">${stats.aLatest}</div><div class="summary-label">A档 应届+对口</div></div>
  <div class="summary-card"><div class="summary-num">${stats.historical}</div><div class="summary-label">历年参考岗位</div></div>
  <div class="summary-card"><div class="summary-num">${recruitmentMatches.length}</div><div class="summary-label">单招/引进</div></div>
</div></div>

<div class="container">
<!-- Section 1 -->
<div class="section">
  <div class="section-header"><div class="section-num">1</div><div class="section-title">考生条件概览</div></div>
  <div class="profile-grid">
    <div class="profile-item"><div class="profile-key">学历</div><div class="profile-val"><strong>${candidate.education}</strong></div></div>
    <div class="profile-item"><div class="profile-key">专业</div><div class="profile-val">${candidate.major} &rarr; <strong>${cats.join('、') || '未匹配大类'}</strong></div></div>
    <div class="profile-item"><div class="profile-key">毕业年份</div><div class="profile-val">${candidate.gradYear}年（${statusText}）</div></div>
    <div class="profile-item"><div class="profile-key">意向区域</div><div class="profile-val"><strong>${candidate.area}</strong></div></div>
    <div class="profile-item"><div class="profile-key">政治面貌</div><div class="profile-val">${candidate.party}</div></div>
    <div class="profile-item"><div class="profile-key">工作经验</div><div class="profile-val">${candidate.experience}</div></div>
  </div>
  <div class="teacher-card">${assessment}</div>
</div>

<!-- Section 2 -->
<div class="section">
  <div class="section-header"><div class="section-num">2</div><div class="section-title">岗位推荐（按优先级排列）</div></div>
  <div class="teacher-card">我把你能报的岗位按竞争激烈程度从低到高分成了ABCD四个档次。道理很简单：岗位限制条件越多，能报的人就越少，你上岸的概率就越大。<strong>A档是你的主战场，B档是备选，CD两档是保底。</strong></div>
  ${tiersHtml}
</div>

<!-- Section 3 -->
<div class="section">
  <div class="section-header"><div class="section-num">3</div><div class="section-title">单招与人才引进信息</div></div>
  <div class="teacher-card gold">除了统招，你还可以关注一些单招和人才引进的信息。老师帮你筛了最近的相关信息，供你参考。</div>
  <div style="background:#fff8e1;border:1px solid #fde68a;border-radius:var(--radius);padding:20px 24px">
    <h4 style="font-size:14px;color:#92400e;margin-bottom:12px">近期单招/人才引进信息（${recruitmentMatches.length}条）</h4>
    ${recruitHtml}
    <p style="margin-top:16px;padding:12px;background:#fef5e7;border-radius:4px;font-size:13px;color:#856404">注意：单招信息多为劳务派遣、编外人员等非在编岗位。待遇和稳定性与事业编有差异，建议优先考虑统招岗位。</p>
  </div>
</div>

<!-- Section 4 -->
<div class="section">
  <div class="section-header"><div class="section-num">4</div><div class="section-title">竞争比分析</div></div>
  <div class="teacher-card">很多同学选岗只看单位名气，其实竞争比才是决定能不能上岸的关键数据。同样的分数，报30:1的可能落榜，报10:1的可能轻松上岸。</div>
  <div class="chart-card">
    <h4 style="font-family:'Noto Serif SC',serif;font-size:15px;font-weight:600;margin-bottom:20px">匹配岗位竞争档位分布</h4>
    <div class="bar-row"><div class="bar-label" style="color:#27ae60">&#8804;10:1 捡漏</div><div class="bar-track"><div class="bar-fill" style="width:${barPct(compStats.low)}%;background:#27ae60">${compStats.low}</div></div><div class="bar-value">${compStats.low}个</div></div>
    <div class="bar-row"><div class="bar-label" style="color:#f39c12">10-30:1 中等</div><div class="bar-track"><div class="bar-fill" style="width:${barPct(compStats.mid)}%;background:#f39c12">${compStats.mid}</div></div><div class="bar-value">${compStats.mid}个</div></div>
    <div class="bar-row"><div class="bar-label" style="color:#e67e22">30-60:1 较高</div><div class="bar-track"><div class="bar-fill" style="width:${barPct(compStats.high)}%;background:#e67e22">${compStats.high}</div></div><div class="bar-value">${compStats.high}个</div></div>
    <div class="bar-row"><div class="bar-label" style="color:#e74c3c">&gt;60:1 高竞争</div><div class="bar-track"><div class="bar-fill" style="width:${barPct(compStats.vhigh)}%;background:#e74c3c">${compStats.vhigh}</div></div><div class="bar-value">${compStats.vhigh}个</div></div>
  </div>
  ${trendData.length > 0 ? `<div class="chart-card"><h4 style="font-family:'Noto Serif SC',serif;font-size:15px;font-weight:600;margin-bottom:20px">重点单位三年竞争比趋势</h4><table><thead><tr><th>单位（主管部门）</th><th>2023年</th><th>2024年</th><th>2025年</th><th>趋势</th></tr></thead><tbody>${trendRows}</tbody></table></div>` : ''}
</div>

<!-- Section 5 -->
<div class="section">
  <div class="section-header"><div class="section-num">5</div><div class="section-title">老师给你的建议</div></div>
  <div class="strategy-list">${strategyHtml}</div>
</div>

<!-- Section 6 -->
<div class="section">
  <div class="section-header"><div class="section-num">6</div><div class="section-title">读报告前先看这里</div></div>
  <div class="notes-card">
    <h4>使用本报告请注意</h4>
    <ol class="notes-list">
      <li>历史数据不等于明年一定还招。2023-2026年有这个岗位，不代表2026年一定会开放，但大概率会有类似岗位。</li>
      <li>专业大类归属按照《江苏省2026年度考试录用公务员专业参考目录》匹配，个别岗位的认定以招聘单位为准，拿不准的建议打咨询电话问一下。</li>
      <li>竞争比是单位维度的整体数据，具体到每个岗位可能有差异。比如同一个单位的管理岗和专技岗竞争程度不同。</li>
      <li>"其他条件"里有隐藏限制。比如有的要求"取得相应学位""两年基层工作经历"等，报名前一定看原文公告。</li>
      <li>应届生身份保护：毕业后不签劳动合同、不交社保，可保留两年择业期应届身份。已经签了三方协议的，及时办理改派。</li>
    </ol>
  </div>
</div>

<div class="cta">
  <h3>还有疑问？老师帮你一对一分析</h3>
  <p>每个人的情况不一样，报告只能做初步筛选。<br>如果你对某个岗位拿不准、不知道怎么选，<br>欢迎来找老师做一对一深度咨询，帮你把选岗风险降到最低。</p>
  <button class="cta-btn" onclick="goBack()">&#8592; 返回修改条件重新匹配</button>
</div>
</div>

<div class="footer">
  由正图教育 AI 选岗系统生成 &middot; ${nowStr} &middot; 数据来源：盐城市2023-2026年事业单位公开招聘公告<br>
  专业分类依据：《江苏省2026年度考试录用公务员专业参考目录》
</div>`;
}
