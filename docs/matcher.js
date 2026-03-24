// matcher.js - Core matching logic (ported from Python)

const DISTRICT_MAP = {
  '全市':'市区','/':'市区','市属':'市区','':'市区',
  '盐都':'盐都','亭湖':'亭湖',
  '东台':'东台','建湖':'建湖','射阳':'射阳',
  '阜宁':'阜宁','滨海':'滨海','响水':'响水','大丰':'大丰',
};

const AREA_GROUPS = {
  '市区':['市区','盐都','亭湖'],
  '亭湖':['市区','盐都','亭湖'],
  '盐都':['市区','盐都','亭湖'],
  '经开区':['市区'],
  '盐南':['市区'],
  '东台':['东台'],'建湖':['建湖'],'射阳':['射阳'],
  '阜宁':['阜宁'],'滨海':['滨海'],'响水':['响水'],'大丰':['大丰'],
  '不限':['市区','盐都','亭湖','东台','建湖','射阳','阜宁','滨海','响水','大丰'],
};

const EDU_LEVELS = {
  '大专':1,'大专及以上':1,
  '本科':2,'本科及以上':2,
  '硕士研究生':3,'硕士研究生及以上':3,'硕士':3,
  '博士':4,'博士研究生':4,'博士研究生及以上':4,
};

function matchMajor(candidateMajor, positionMajorReq, categoryMap) {
  if (!positionMajorReq || positionMajorReq.trim() === '不限' || positionMajorReq.trim() === '' || positionMajorReq === 'nan') {
    return [true, '不限专业'];
  }
  const req = positionMajorReq.trim();
  const candidate = candidateMajor.trim();

  // Exact match
  const reqList = req.replace(/、/g, ',').replace(/；/g, ',').replace(/;/g, ',').split(',').map(s => s.trim()).filter(Boolean);
  for (const item of reqList) {
    if (candidate.includes(item) || item.includes(candidate)) {
      return [true, '精确匹配'];
    }
  }

  // Category match
  for (const [catName, catMajors] of Object.entries(categoryMap)) {
    if (req.includes(catName)) {
      if (catMajors.includes(candidate) || catMajors.some(m => m.includes(candidate) || candidate.includes(m))) {
        return [true, '大类匹配'];
      }
    }
  }
  return [false, '不匹配'];
}

function matchEducation(candidateEdu, positionEduReq) {
  const candidateLevel = EDU_LEVELS[candidateEdu] || 0;
  const reqStr = (positionEduReq || '').trim();
  let reqLevel = EDU_LEVELS[reqStr] || 0;
  if (reqLevel === 0 && reqStr) reqLevel = 2;
  return candidateLevel >= reqLevel;
}

function matchRecruitTarget(gradYear, posTarget) {
  const target = (posTarget || '').trim();
  if (!target || target === '不限' || target === 'nan' || target === '') return [true, '不限'];
  if (target.includes('毕业生')) {
    const m = target.match(/(\d{4})年毕业生/);
    if (m) {
      const targetYear = parseInt(m[1]);
      if (gradYear === targetYear) return [true, `${targetYear}年应届`];
      if (targetYear - 2 <= gradYear && gradYear <= targetYear) return [true, '择业期内'];
    }
    return [false, '不满足应届'];
  }
  if (target.includes('社会人员')) return [true, '社会人员'];
  if (target.includes('退役')) return [false, '退役专岗'];
  return [true, '其他'];
}

function classifyTier(majorType, targetNote) {
  const isFresh = targetNote.includes('应届') || targetNote.includes('择业');
  const isMajorSpecific = majorType !== '不限专业';
  const isTargetOpen = targetNote === '不限';
  if (isFresh && isMajorSpecific) return 'A';
  if (isTargetOpen && isMajorSpecific) return 'B';
  if (isFresh && !isMajorSpecific) return 'C';
  return 'D';
}

function getCompetitionRatio(unitName, compData, year) {
  unitName = (unitName || '').trim();
  const yearKey = String(year).slice(2); // '2023' -> '23'
  // Exact match
  if (compData[unitName]) {
    const r = compData[unitName][yearKey];
    return (r && r !== 'nan' && r !== '') ? r : '—';
  }
  // Fuzzy match
  const shortName = unitName.replace('盐城市', '').replace('盐城', '');
  if (shortName !== unitName) {
    for (const [key, val] of Object.entries(compData)) {
      if (key.includes(shortName)) {
        const r = val[yearKey];
        return (r && r !== 'nan' && r !== '') ? r : '—';
      }
    }
  }
  return '—';
}

function runMatching(candidate, positions, competition, categories) {
  const targetAreas = AREA_GROUPS[candidate.area] || [candidate.area];
  const matched = [];

  for (const pos of positions) {
    const district = DISTRICT_MAP[pos.d] || pos.d;
    // Area check
    if (!targetAreas.includes(district)) continue;
    // Education check
    if (!matchEducation(candidate.education, pos.e)) continue;
    // Major check
    const [majorMatched, majorType] = matchMajor(candidate.major, pos.m, categories);
    if (!majorMatched) continue;
    // Target check
    const [targetMatched, targetNote] = matchRecruitTarget(candidate.gradYear, pos.t);
    if (!targetMatched) continue;
    // Classify
    const tier = classifyTier(majorType, targetNote);
    const sup = pos.s || pos.u;
    const ratio23 = getCompetitionRatio(sup, competition, 2023);
    const ratio24 = getCompetitionRatio(sup, competition, 2024);
    const ratio25 = getCompetitionRatio(sup, competition, 2025);

    matched.push({
      year: pos.y, district, unitName: pos.u, supervisor: pos.s,
      positionName: pos.p, education: pos.e, major: pos.m,
      recruitTarget: pos.t, recruitCount: pos.c || 1,
      examFormat: pos.f, otherConditions: pos.o, phone: pos.ph,
      majorType, targetNote, tier, ratio23, ratio24, ratio25,
    });
  }

  const tiers = { A: [], B: [], C: [], D: [] };
  for (const p of matched) tiers[p.tier].push(p);

  // Sort each tier: 2025 first, then by year desc
  for (const key of ['A','B','C','D']) {
    tiers[key].sort((a, b) => b.year - a.year);
  }

  return { matched, tiers };
}

function matchRecruitment(candidate, recruitment, categories) {
  const majorKw = [];
  // Find which categories the candidate's major belongs to
  for (const [cat, majors] of Object.entries(categories)) {
    if (majors.includes(candidate.major)) {
      // Add category keywords
      majorKw.push(cat.replace('类', ''));
    }
  }
  majorKw.push(candidate.major);

  const areaKw = ['盐城','亭湖','盐都','经开区','大丰','东台','建湖','射阳','阜宁','滨海','响水'];
  const excludeKw = ['农村商业银行','农商行','农村信用社','银行招聘','医学生','兽医','护士'];

  const results = [];
  for (const r of recruitment) {
    const title = (r.title || '').toLowerCase();
    const desc = (r.desc || '').toLowerCase();
    const unit = (r.unit || '').toLowerCase();
    // Exclude
    if (excludeKw.some(kw => title.includes(kw) || unit.includes(kw))) continue;
    // Area
    if (!areaKw.some(kw => title.includes(kw) || unit.includes(kw))) continue;
    // Major relevance
    if (!majorKw.some(kw => title.includes(kw) || desc.includes(kw) || unit.includes(kw))) continue;
    // Education filter
    if (candidate.education === '本科') {
      if (['硕士研究生','硕士及以上','硕士学位','研究生及以上','研究生学历','博士'].some(kw => desc.includes(kw))) continue;
    }
    results.push(r);
  }
  return results.slice(0, 15);
}
