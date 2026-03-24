// app.js - Main application logic

let DATA = {
  positions: null,
  competition: null,
  categories: null,
  recruitment: null,
  majorsList: null,
};

function loadData() {
  const loadingText = document.querySelector('.loading-text');
  try {
    loadingText.textContent = '加载岗位数据...';

    // Use embedded JS data (global variables from data/*.js scripts)
    DATA.positions = DATA_POSITIONS;
    DATA.competition = DATA_COMPETITION;
    DATA.categories = DATA_CATEGORIES;
    DATA.recruitment = DATA_RECRUITMENT;
    DATA.majorsList = DATA_MAJORS_LIST;

    // Populate major autocomplete
    const datalist = document.getElementById('major-suggestions');
    for (const m of DATA.majorsList) {
      const opt = document.createElement('option');
      opt.value = m;
      datalist.appendChild(opt);
    }

    // Show form
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('form-section').style.display = 'block';

  } catch (err) {
    loadingText.textContent = '数据加载失败: ' + err.message;
    console.error(err);
  }
}

function generateReport() {
  const edu = document.getElementById('input-edu').value;
  const major = document.getElementById('input-major').value.trim();
  const gradYear = parseInt(document.getElementById('input-grad-year').value);
  const area = document.getElementById('input-area').value;
  const party = document.getElementById('input-party').value;
  const exp = document.getElementById('input-exp').value;

  // Validation
  if (!edu) { alert('请选择学历'); return; }
  if (!major) { alert('请输入专业名称'); return; }

  const candidate = {
    education: edu,
    major: major,
    gradYear: gradYear,
    area: area,
    party: party,
    experience: exp,
  };

  // Show processing
  document.getElementById('form-section').style.display = 'none';
  document.getElementById('processing-section').style.display = 'flex';
  const procText = document.getElementById('processing-text');

  // Use setTimeout to allow UI to update
  setTimeout(() => {
    procText.textContent = '执行四维匹配...';
    setTimeout(() => {
      // Run matching
      const result = runMatching(candidate, DATA.positions, DATA.competition, DATA.categories);
      procText.textContent = `匹配到 ${result.matched.length} 个岗位，生成报告...`;

      setTimeout(() => {
        // Match recruitment
        const recruitmentMatches = matchRecruitment(candidate, DATA.recruitment, DATA.categories);

        // Generate report HTML
        const reportHtml = generateReportHtml(candidate, result, recruitmentMatches, DATA.competition, DATA.categories);

        // Display report
        document.getElementById('processing-section').style.display = 'none';
        const reportSection = document.getElementById('report-section');
        reportSection.innerHTML = reportHtml;
        reportSection.style.display = 'block';
        // Populate watermark grid
        var wg = document.getElementById('watermark-grid');
        if (wg) {
          var cols = Math.ceil(window.innerWidth * 2 / 320);
          var rows = Math.ceil(window.innerHeight * 4 / 120);
          for (var i = 0; i < rows * cols; i++) {
            var s = document.createElement('span');
            s.textContent = '\u6B63\u56FE\u6559\u80B2\u76D0\u57CE\u6821\u533A';
            wg.appendChild(s);
          }
        }
        window.scrollTo(0, 0);
      }, 200);
    }, 200);
  }, 100);
}

function goBack() {
  document.getElementById('report-section').style.display = 'none';
  document.getElementById('report-section').innerHTML = '';
  document.getElementById('form-section').style.display = 'block';
  window.scrollTo(0, 0);
}

function downloadReport() {
  var report = document.getElementById('report-section');
  if (!report) return;
  // Collect all stylesheets
  var css = '';
  for (var i = 0; i < document.styleSheets.length; i++) {
    try {
      var rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
      if (rules) for (var j = 0; j < rules.length; j++) css += rules[j].cssText + '\n';
    } catch(e) {}
  }
  // Build standalone HTML
  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>\u9009\u5C97\u63A8\u8350\u62A5\u544A</title><style>' + css + '</style></head><body style="background:#f5f3ef">' + report.innerHTML + '</body></html>';
  // Trigger download
  var blob = new Blob([html], {type: 'text/html;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '\u9009\u5C97\u63A8\u8350\u62A5\u544A.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize
document.addEventListener('DOMContentLoaded', loadData);
