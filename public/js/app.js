// DOM元素
const homeBtn = document.getElementById('homeBtn');
const gameBtn = document.getElementById('gameBtn');
const page2Btn = document.getElementById('page2Btn');
const page3Btn = document.getElementById('page3Btn');
const homeBtnDesktop = document.getElementById('homeBtnDesktop');
const gameBtnDesktop = document.getElementById('gameBtnDesktop');
const page2BtnDesktop = document.getElementById('page2BtnDesktop');
const page3BtnDesktop = document.getElementById('page3BtnDesktop');
const homeContent = document.getElementById('homeContent');
const gameContent = document.getElementById('gameContent');
const page2Content = document.getElementById('page2Content');
const page3Content = document.getElementById('page3Content');
const weightLossNews = document.getElementById('weightLossNews');
const calendar = document.getElementById('calendar');
const gameCanvas = document.getElementById('gameCanvas') || null;
const ctx = gameCanvas ? gameCanvas.getContext('2d') : null;
const startGameBtn = document.getElementById('startGameBtn') || null;
const pauseGameBtn = document.getElementById('pauseGameBtn') || null;
const restartGameBtn = document.getElementById('restartGameBtn') || null;
const scoreElement = document.getElementById('score') || null;
const leaderboardBody = document.getElementById('leaderboardBody') || null;
const hudCountdown = document.getElementById('hudCountdown') || null;
const hudExercise = document.getElementById('hudExercise') || null;
const hudCalories = document.getElementById('hudCalories') || null;
const newsDetailContent = document.getElementById('newsDetailContent');
const newsDetailBody = document.getElementById('newsDetailBody');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const keyboardModeBtn = document.getElementById('keyboardModeBtn');
const cameraModeBtn = document.getElementById('cameraModeBtn');
const keyboardGameContainer = document.getElementById('keyboardGameContainer');
const cameraGameContainer = document.getElementById('cameraGameContainer');

let gameRunning = false;
let gamePaused = false;
let score = 0;
let gameLoop;
let enemySpawnInterval;

let sessionDurationMs = 300000;
let sessionEndTime = 0;
let lastFrameTime = 0;
let phase = 'idle';
let nextPromptTime = 0;
let currentPrompt = null;
let combo = 0;
let calories = 0;
let playerWeightKg = 60;
const exerciseCycle = ['深蹲', '开合跳', '弓步', '高抬腿', '俯卧撑'];
const exerciseKeyMap = { '深蹲': 'ArrowDown', '开合跳': 'Space', '弓步': 'ArrowLeft', '高抬腿': 'ArrowUp', '俯卧撑': 'ArrowRight' };
const exerciseMET = { '深蹲': 5, '开合跳': 8, '弓步': 5.5, '高抬腿': 8, '俯卧撑': 7 };

homeBtn.addEventListener('click', () => { showHomePage(); });
gameBtn.addEventListener('click', () => { showGamePage(); });
page2Btn.addEventListener('click', () => { showPage2(); });
page3Btn.addEventListener('click', () => { showPage3(); });
if (homeBtnDesktop) { homeBtnDesktop.addEventListener('click', () => { showHomePage(); }); }
if (gameBtnDesktop) { gameBtnDesktop.addEventListener('click', () => { showGamePage(); }); }
if (page2BtnDesktop) { page2BtnDesktop.addEventListener('click', () => { showPage2(); }); }
if (page3BtnDesktop) { page3BtnDesktop.addEventListener('click', () => { showPage3(); }); }

function setActiveNav(target) {
  const pairs = [ { id: 'homeBtn', desktopId: 'homeBtnDesktop' }, { id: 'gameBtn', desktopId: 'gameBtnDesktop' }, { id: 'page2Btn', desktopId: 'page2BtnDesktop' }, { id: 'page3Btn', desktopId: 'page3BtnDesktop' } ];
  pairs.forEach(p => {
    const m = document.getElementById(p.id);
    const d = document.getElementById(p.desktopId);
    const isActive = (target === 'home' && p.id.includes('home')) || (target === 'game' && p.id.includes('game')) || (target === 'page2' && p.id.includes('page2')) || (target === 'page3' && p.id.includes('page3'));
    [m, d].forEach(el => { if (!el) return; if (isActive) el.classList.add('active'); else el.classList.remove('active'); });
  });
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav && window.bootstrap) { const instance = window.bootstrap.Offcanvas.getInstance(mobileNav) || new window.bootstrap.Offcanvas(mobileNav); instance.hide(); }
}

function showHomePage() { homeContent.classList.remove('d-none'); gameContent.classList.add('d-none'); page2Content.classList.add('d-none'); page3Content.classList.add('d-none'); newsDetailContent.classList.add('d-none'); setActiveNav('home'); loadWeightLossNews(); }
function showGamePage() { homeContent.classList.add('d-none'); gameContent.classList.remove('d-none'); page2Content.classList.add('d-none'); page3Content.classList.add('d-none'); newsDetailContent.classList.add('d-none'); setActiveNav('game'); }
function showPage2() { homeContent.classList.add('d-none'); gameContent.classList.add('d-none'); page2Content.classList.remove('d-none'); page3Content.classList.add('d-none'); newsDetailContent.classList.add('d-none'); setActiveNav('page2'); renderPage2Content(); }
function showPage3() { homeContent.classList.add('d-none'); gameContent.classList.add('d-none'); page2Content.classList.add('d-none'); page3Content.classList.remove('d-none'); newsDetailContent.classList.add('d-none'); setActiveNav('page3'); renderPage3Content(); }

// 检测是否在GitHub Pages环境
const isGitHubPages = window.location.hostname.includes('github.io');

// 模拟数据
const mockNewsData = [
  {
    id: 1,
    title: "新型疫苗研发取得重大突破",
    content: "科学家们最近开发出一种新型疫苗，能够有效预防多种病毒感染，预计将在明年进入临床试验阶段。这项研究成果发表在《自然医学》期刊上，引起了医学界的广泛关注。",
    date: "2023-11-15",
    image: "https://picsum.photos/seed/news1/400/250.jpg",
    source: "医学前沿"
  },
  {
    id: 2,
    title: "研究发现：规律运动可降低心脏病风险",
    content: "最新研究表明，每周进行至少150分钟的中等强度运动，可以显著降低心脏病的发病风险。研究团队跟踪了5000名参与者长达10年，发现规律运动的人群心脏病发病率降低了30%。",
    date: "2023-11-14",
    image: "https://picsum.photos/seed/news2/400/250.jpg",
    source: "健康日报"
  },
  {
    id: 3,
    title: "健康饮食指南更新：减少加工食品摄入",
    content: "世界卫生组织更新了健康饮食指南，建议人们减少加工食品的摄入，增加天然食物的比例。指南指出，过度摄入加工食品与多种慢性疾病风险增加有关。",
    date: "2023-11-13",
    image: "https://picsum.photos/seed/news3/400/250.jpg",
    source: "WHO"
  },
  {
    id: 4,
    title: "睡眠质量与免疫力关系研究",
    content: "一项新研究发现，高质量的睡眠对于维持免疫系统正常功能至关重要，成年人每晚应保证7-9小时的睡眠。研究还发现，睡眠不足会导致抗体产生减少，影响疫苗效果。",
    date: "2023-11-12",
    image: "https://picsum.photos/seed/news4/400/250.jpg",
    source: "睡眠医学"
  },
  {
    id: 5,
    title: "儿童青少年近视防控新策略",
    content: "教育部和国家卫健委联合发布儿童青少年近视防控新策略，建议每天户外活动不少于2小时，严格控制电子产品使用时间，并定期进行视力检查。",
    date: "2023-11-11",
    image: "https://picsum.photos/seed/news5/400/250.jpg",
    source: "教育健康"
  }
];

const mockMedicalInfo = [
  {
    title: "冬季流感预防指南",
    content: "冬季是流感高发季节，专家建议：1.及时接种流感疫苗；2.保持室内空气流通；3.勤洗手，避免触摸口鼻眼；4.保持充足睡眠，增强免疫力。",
    category: "疾病预防",
    date: new Date().toISOString().split('T')[0]
  },
  {
    title: "高血压患者饮食建议",
    content: "高血压患者应注意：1.减少钠盐摄入，每日不超过5克；2.增加钾的摄入，多吃香蕉、菠菜等；3.控制脂肪摄入，选择低脂乳制品；4.限制酒精摄入。",
    category: "慢性病管理",
    date: new Date().toISOString().split('T')[0]
  },
  {
    title: "儿童疫苗接种时间表",
    content: "根据国家免疫规划，儿童疫苗接种时间表：出生时：乙肝疫苗、卡介苗；1月龄：乙肝疫苗；2月龄：脊髓灰质炎疫苗；3月龄：百白破疫苗、脊髓灰质炎疫苗。",
    category: "儿童健康",
    date: new Date().toISOString().split('T')[0]
  }
];

async function loadWeightLossNews() {
  try {
    weightLossNews.innerHTML = '<div class="col-md-12 text-center py-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div><p class="mt-2">正在获取最新资讯...</p></div>';
    
    let newsData;
    if (isGitHubPages) {
      // GitHub Pages环境，使用模拟数据
      newsData = mockNewsData;
      // 模拟延迟，让用户看到加载状态
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      // 非GitHub Pages环境，使用真实API
      const res = await fetch('/api/news');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) throw new Error('获取资讯失败');
      newsData = json.data;
    }
    
    renderWeightLossNews(newsData);
  } catch (error) {
    console.error('加载减肥资讯失败:', error);
    // 显示模拟数据作为备选
    renderWeightLossNews(mockNewsData);
  }
}

function renderWeightLossNews(newsData) {
  weightLossNews.innerHTML = newsData.map((news) => '<div class="col-md-6 mb-4"><div class="card news-card h-100"><img src="' + news.image + '" class="card-img-top" alt="' + news.title + '"><div class="card-body d-flex flex-column"><h5 class="card-title">' + news.title + '</h5><p class="card-text">' + news.content + '</p><div class="mt-auto"><a href="#" class="btn btn-outline-primary btn-sm" data-id="' + news.id + '">阅读更多</a></div></div><div class="card-footer text-muted"><small>发布日期: ' + news.date + '</small></div></div></div>').join('');
  Array.from(weightLossNews.querySelectorAll('a.btn')).forEach(a => { a.addEventListener('click', (e) => { e.preventDefault(); const id = parseInt(a.getAttribute('data-id')); showNewsDetail(id); }); });
}

function showNewsDetail(id) { homeContent.classList.add('d-none'); gameContent.classList.add('d-none'); page2Content.classList.add('d-none'); page3Content.classList.add('d-none'); newsDetailContent.classList.remove('d-none'); homeBtn.classList.remove('active'); gameBtn.classList.remove('active'); page2Btn.classList.remove('active'); page3Btn.classList.remove('active'); fetchNewsDetail(id); }

async function fetchNewsDetail(id) {
  try {
    newsDetailBody.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';
    
    let newsDetail;
    if (isGitHubPages) {
      // GitHub Pages环境，从模拟数据中查找
      newsDetail = mockNewsData.find(n => n.id === id);
      // 模拟延迟，让用户看到加载状态
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!newsDetail) throw new Error('详情获取失败');
    } else {
      // 非GitHub Pages环境，使用真实API
      const res = await fetch('/api/news/' + id);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error('详情获取失败');
      newsDetail = json.data;
    }
    
    const n = newsDetail;
    newsDetailBody.innerHTML = '<h3 class="mb-3">' + n.title + '</h3><img src="' + n.image + '" alt="' + n.title + '" class="img-fluid mb-3" /><p class="text-muted">发布日期：' + n.date + ' | 来源：' + (n.source || '') + '</p><p>' + n.content + '</p>';
  } catch (err) {
    console.error('加载详情失败:', err);
    newsDetailBody.innerHTML = '<div class="alert alert-danger">加载详情失败</div>';
  }
}

function initCalendar() { const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear(); const currentDay = today.getDate(); renderCalendar(currentMonth, currentYear, currentDay); }
function renderCalendar(month, year, currentDay) { const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']; const dayNames = ['日','一','二','三','四','五','六']; const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const daysInPrevMonth = new Date(year, month, 0).getDate(); let html = '<div class="calendar-header"><button class="calendar-nav" id="prevMonth"><i class="fas fa-chevron-left"></i></button><h5>' + monthNames[month] + ' ' + year + '</h5><button class="calendar-nav" id="nextMonth"><i class="fas fa-chevron-right"></i></button></div><div class="calendar-grid">'; dayNames.forEach(day => { html += '<div class="calendar-day-header">' + day + '</div>'; }); for (let i = firstDay - 1; i >= 0; i--) { html += '<div class="calendar-day other-month">' + (daysInPrevMonth - i) + '</div>'; } for (let day = 1; day <= daysInMonth; day++) { const isToday = day === currentDay && month === new Date().getMonth() && year === new Date().getFullYear(); html += '<div class="calendar-day ' + (isToday ? 'today' : '') + '">' + day + '</div>'; } const totalCells = firstDay + daysInMonth; const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7); for (let day = 1; day <= nextMonthDays; day++) { html += '<div class="calendar-day other-month">' + day + '</div>'; } html += '</div>'; calendar.innerHTML = html; document.getElementById('prevMonth').addEventListener('click', () => { const newMonth = month === 0 ? 11 : month - 1; const newYear = month === 0 ? year - 1 : year; renderCalendar(newMonth, newYear, currentDay); }); document.getElementById('nextMonth').addEventListener('click', () => { const newMonth = month === 11 ? 0 : month + 1; const newYear = month === 11 ? year + 1 : year; renderCalendar(newMonth, newYear, currentDay); }); }

function initGame() { gameRunning = false; gamePaused = false; score = 0; combo = 0; calories = 0; phase = 'idle'; currentPrompt = null; nextPromptTime = 0; scoreElement.textContent = score; drawGame(); startGameBtn.addEventListener('click', startGame); pauseGameBtn.addEventListener('click', pauseGame); restartGameBtn.addEventListener('click', restartGame); document.addEventListener('keydown', handleKeyDown); document.addEventListener('keyup', handleKeyUp); }
let keys = {};
function handleKeyDown(e) { keys[e.key] = true; keys[e.code] = true; }
function handleKeyUp(e) { keys[e.key] = false; keys[e.code] = false; }
function startGame() { if (gameRunning) return; gameRunning = true; gamePaused = false; startGameBtn.disabled = true; pauseGameBtn.disabled = false; sessionEndTime = Date.now() + sessionDurationMs; lastFrameTime = Date.now(); phase = 'work'; nextPromptTime = Date.now() + 1000; gameLoop = setInterval(updateGame, 1000 / 60); if (gameCanvas) { gameCanvas.setAttribute('tabindex', '0'); gameCanvas.focus(); } }
function pauseGame() { if (!gameRunning) return; gamePaused = !gamePaused; pauseGameBtn.textContent = gamePaused ? '继续游戏' : '暂停游戏'; if (gamePaused) { clearInterval(gameLoop); } else { lastFrameTime = Date.now(); gameLoop = setInterval(updateGame, 1000 / 60); } }
function restartGame() { clearInterval(gameLoop); gameRunning = false; gamePaused = false; score = 0; combo = 0; calories = 0; phase = 'idle'; currentPrompt = null; scoreElement.textContent = score; startGameBtn.disabled = false; pauseGameBtn.disabled = true; pauseGameBtn.textContent = '暂停游戏'; drawGame(); }
function updateGame() { const now = Date.now(); if (now >= sessionEndTime) { endGame(); return; } const elapsed = sessionDurationMs - (sessionEndTime - now); const cycleIndex = Math.floor(elapsed / 60000); const elapsedInMinute = elapsed % 60000; phase = elapsedInMinute < 30000 ? 'work' : 'rest'; const currentExercise = exerciseCycle[cycleIndex % exerciseCycle.length]; const met = exerciseMET[currentExercise]; const dt = (now - lastFrameTime) / 1000; lastFrameTime = now; if (phase === 'work') { calories += (met * 3.5 * playerWeightKg / 200) * (dt); } if (phase === 'work' && now >= nextPromptTime) { currentPrompt = { key: exerciseKeyMap[currentExercise], label: currentExercise, startTime: now, hit: false }; nextPromptTime = now + 1200; } if (currentPrompt && !currentPrompt.hit) { const delta = now - currentPrompt.startTime; const hit = keys[currentPrompt.key]; if (hit) { if (delta <= 250) { score += 10 * (1 + Math.floor(combo / 10)); combo += 1; } else if (delta <= 500) { score += 5; combo = Math.max(0, combo); } else { combo = 0; } scoreElement.textContent = score; currentPrompt.hit = true; } if (delta > 1000 && !currentPrompt.hit) { combo = 0; currentPrompt = null; } } drawGame(); }
function drawGame() { ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height); const now = Date.now(); const remaining = Math.max(0, sessionEndTime - now); const mm = String(Math.floor(remaining / 60000)).padStart(2, '0'); const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0'); ctx.fillStyle = '#f0f9ff'; ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height); ctx.fillStyle = '#333'; ctx.font = '22px Arial'; ctx.fillText('五分钟节奏健身', 20, 40); ctx.font = '18px Arial'; ctx.fillText('阶段：' + (phase === 'work' ? '训练' : phase === 'rest' ? '休息' : '未开始'), 20, 70); ctx.fillText('倒计时：' + mm + ':' + ss, 20, 100); ctx.fillText('得分：' + score, 20, 130); ctx.fillText('连击：' + combo, 20, 160); ctx.fillText('卡路里：' + calories.toFixed(1) + ' kcal', 20, 190); if (hudCountdown) hudCountdown.textContent = mm + ':' + ss; if (hudExercise) hudExercise.textContent = phase === 'work' && currentPrompt ? currentPrompt.label : (phase === 'rest' ? '休息' : '未开始'); if (hudCalories) hudCalories.textContent = calories.toFixed(1); if (currentPrompt && phase === 'work') { ctx.fillStyle = '#0d6efd'; ctx.font = '28px Arial'; ctx.fillText('当前动作：' + currentPrompt.label, 20, 240); ctx.font = '20px Arial'; ctx.fillText('按键：' + currentPrompt.key, 20, 270); const elapsed = now - currentPrompt.startTime; ctx.fillStyle = '#ffc107'; ctx.fillRect(20, 290, Math.max(0, 300 - Math.min(elapsed, 1000)), 12); }
  if (!gameRunning) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height); ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillText('跟随提示做动作获取得分', gameCanvas.width / 2, gameCanvas.height / 2 - 10); ctx.font = '16px Arial'; ctx.fillText('示例：深蹲按↓、开合跳按Space等', gameCanvas.width / 2, gameCanvas.height / 2 + 20); }
  if (gamePaused) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height); ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillText('游戏已暂停', gameCanvas.width / 2, gameCanvas.height / 2); }
}

function endGame() { clearInterval(gameLoop); gameRunning = false; saveScore(score); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height); ctx.fillStyle = 'white'; ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillText('训练完成', gameCanvas.width / 2, gameCanvas.height / 2 - 20); ctx.font = '20px Arial'; ctx.fillText('得分：' + score + '  卡路里：' + calories.toFixed(1) + ' kcal', gameCanvas.width / 2, gameCanvas.height / 2 + 20); startGameBtn.disabled = false; pauseGameBtn.disabled = true; pauseGameBtn.textContent = '暂停游戏'; loadLeaderboard(); }
function loadLeaderboard() { const leaderboardData = getLeaderboardFromStorage(); if (leaderboardData.length === 0) { leaderboardBody.innerHTML = '<tr><td colspan="4" class="text-center">暂无数据</td></tr>'; return; } leaderboardBody.innerHTML = leaderboardData.map((entry, index) => '<tr><td>' + (index + 1) + '</td><td>' + entry.player + '</td><td>' + entry.score + '</td><td>' + entry.date + '</td></tr>').join(''); }
function saveScore(score) { const leaderboard = getLeaderboardFromStorage(); const newEntry = { player: '玩家' + Math.floor(Math.random() * 1000), score: score, date: new Date().toLocaleDateString() }; leaderboard.push(newEntry); leaderboard.sort((a, b) => b.score - a.score); if (leaderboard.length > 10) { leaderboard.length = 10; } localStorage.setItem('weightLossGameLeaderboard', JSON.stringify(leaderboard)); }
function getLeaderboardFromStorage() { const storedData = localStorage.getItem('weightLossGameLeaderboard'); return storedData ? JSON.parse(storedData) : []; }

document.addEventListener('DOMContentLoaded', () => { initCalendar(); showHomePage(); if (backToHomeBtn) { backToHomeBtn.addEventListener('click', () => { showHomePage(); }); } const navbarToggler = document.querySelector('.navbar-toggler'); if (navbarToggler) { let lastToggleTs = 0; navbarToggler.addEventListener('click', (ev) => { const now = Date.now(); if (now - lastToggleTs < 250) { ev.preventDefault(); ev.stopPropagation(); return; } lastToggleTs = now; }, { capture: true }); } });
async function renderPage2Content() {
  page2Content.innerHTML = `
    <h2 class="mb-3">营养指南</h2>
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title">AI 食物卡路里识别</h5>
        <p class="text-muted">上传食物图片，自动识别食物并估算卡路里与营养信息。</p>
        <div class="border rounded p-4 text-center mb-3" id="foodUploadBox" style="cursor:pointer">
          <div class="fs-1 text-primary">➕</div>
          <p class="mb-1">点击上传食物图片（支持JPG/PNG，≤2MB）</p>
          <small class="text-muted">建议使用清晰图片，避免复杂背景</small>
          <input type="file" id="foodImg" accept="image/jpeg,image/png" class="d-none" />
        </div>
        <div class="text-center mb-3">
          <img id="foodPreview" class="img-fluid rounded shadow d-none" alt="食物预览图" />
          <p id="foodPreviewCaption" class="text-muted d-none"></p>
        </div>
        <div id="foodLoading" class="alert alert-info d-none">AI 正在分析，请稍候…</div>
        <div id="foodResult" class="mt-2"></div>
      </div>
    </div>

    <div class="row" id="nutritionCards">
      <div class="col-md-6 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">宏量营养素基础</h5>
            <p>合理分配碳水、蛋白质与脂肪：碳水50–55%，蛋白质20–25%，脂肪20–25%。选择未加工食物，控制精制糖。</p>
          </div>
        </div>
      </div>
      <div class="col-md-6 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">补水与微量元素</h5>
            <p>每天 8 杯水，适量电解质补充；多样化蔬果获取维生素与矿物质。</p>
          </div>
        </div>
      </div>
    </div>
    <h3 class="mt-4">医疗资讯推荐</h3>
    <div id="medicalInfo" class="row">
      <div class="col-12 text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>
    </div>`;

  try {
    let medicalInfoData;
    if (isGitHubPages) {
      // GitHub Pages环境，使用模拟数据
      medicalInfoData = mockMedicalInfo;
      // 模拟延迟，让用户看到加载状态
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      // 非GitHub Pages环境，使用真实API
      const res = await fetch('/api/medical-info');
      const json = await res.json();
      if (!json.success) throw new Error('获取失败');
      medicalInfoData = json.data;
    }
    
    document.getElementById('medicalInfo').innerHTML = medicalInfoData.map(i => `
      <div class="col-md-4 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">${i.title}</h6>
            <p class="card-text">${i.content}</p>
            <span class="badge bg-secondary">${i.category}</span>
          </div>
          <div class="card-footer"><small class="text-muted">${i.date}</small></div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('加载医疗资讯失败:', e);
    // 显示模拟数据作为备选
    document.getElementById('medicalInfo').innerHTML = mockMedicalInfo.map(i => `
      <div class="col-md-4 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">${i.title}</h6>
            <p class="card-text">${i.content}</p>
            <span class="badge bg-secondary">${i.category}</span>
          </div>
          <div class="card-footer"><small class="text-muted">${i.date}</small></div>
        </div>
      </div>
    `).join('');
  }

  const foodUploadBox = document.getElementById('foodUploadBox');
  const foodImg = document.getElementById('foodImg');
  const foodPreview = document.getElementById('foodPreview');
  const foodPreviewCaption = document.getElementById('foodPreviewCaption');
  const foodLoading = document.getElementById('foodLoading');
  const foodResult = document.getElementById('foodResult');

  if (foodUploadBox){ foodUploadBox.addEventListener('click', () => foodImg.click()); }
  if (foodImg){
    foodImg.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024){ alert('图片大小不能超过2MB'); return; }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        foodPreview.src = dataUrl;
        foodPreview.classList.remove('d-none');
        foodPreviewCaption.classList.remove('d-none');
        foodPreviewCaption.textContent = '已上传：' + file.name + '（' + (file.size/1024).toFixed(0) + 'KB）';
        foodResult.innerHTML = '<div class="alert alert-secondary">AI分析中，请稍候...</div>';
      };
      reader.readAsDataURL(file);
      const base64 = await new Promise((resolve) => { const r = new FileReader(); r.onload = (ev2) => resolve(String(ev2.target.result).split(',')[1]); r.readAsDataURL(file); });
      foodLoading.classList.remove('d-none');
      
      try {
        if (isGitHubPages) {
          // GitHub Pages环境，使用模拟数据
          await new Promise(resolve => setTimeout(resolve, 1000));
          // 模拟AI食物识别结果
          const mockData = {
            items: [
              {
                name: '鸡胸肉',
                serving: '100g',
                calories: 165,
                confidence: 0.92,
                nutrition: {
                  protein: 31,
                  carbohydrate: 0,
                  fat: 3.6
                }
              },
              {
                name: '西兰花',
                serving: '100g',
                calories: 34,
                confidence: 0.88,
                nutrition: {
                  protein: 2.8,
                  carbohydrate: 6.6,
                  fat: 0.4
                }
              }
            ],
            totalCalories: 199
          };
          
          const data = mockData;
          let html = `
            <div class="card bg-light border-primary mb-4 shadow-sm">
              <div class="card-body text-center py-4">
                <h4 class="card-title text-primary mb-0"><i class="fas fa-utensils me-2"></i>总热量估算</h4>
                <div class="display-3 fw-bold text-dark my-2">${data.totalCalories} <span class="fs-4 text-muted">kcal</span></div>
                <p class="text-muted mb-0">基于AI识别结果估算（演示模式）</p>
              </div>
            </div>
            <div class="row g-3">
          `;
          
          data.items.forEach((item) => {
            const conf = (item.confidence * 100).toFixed(1);
            let displayName = item.name;
            let nutritionInfo = '';

            // Handle structured nutrition data if available
            if (item.nutrition && typeof item.nutrition === 'object') {
                // Mapping keys to friendly names
                const labelMap = {
                    'protein': '蛋白质',
                    'carbohydrate': '碳水',
                    'fat': '脂肪',
                    'calorie': '卡路里',
                    'fiber': '纤维'
                };

                nutritionInfo = Object.entries(item.nutrition)
                    .map(([k, v]) => {
                        const label = labelMap[k] || k;
                        if (!labelMap[k]) return ''; // Only show known nutritional fields
                        return `<span class="badge bg-info text-dark me-1">${label}: ${v}g</span>`;
                    })
                    .join('');
            }

            html += `
              <div class="col-md-6">
                <div class="card h-100 shadow-sm hover-shadow transition-all">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <h5 class="card-title fw-bold text-dark mb-0">${displayName}</h5>
                      <span class="badge bg-warning text-dark fs-6 rounded-pill">🔥 ${item.calories} kcal</span>
                    </div>
                    
                    <div class="mb-3">
                      <small class="text-muted"><i class="fas fa-balance-scale me-1"></i>参考份量: ${item.serving}</small>
                    </div>

                    ${nutritionInfo ? `<div class="mb-3">${nutritionInfo}</div>` : ''}

                    <div class="mt-auto">
                      <div class="d-flex justify-content-between small text-muted mb-1">
                        <span><i class="fas fa-robot me-1"></i>AI置信度</span>
                        <span>${isNaN(conf) ? '—' : conf + '%'}</span>
                      </div>
                      <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-success" role="progressbar" 
                             style="width: ${item.confidence * 100}%" 
                             aria-valuenow="${item.confidence * 100}" aria-valuemin="0" aria-valuemax="100">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          });
          html += '</div>';
          
          // Add AI Consultation Button
          html += `
            <div class="text-center mt-4 pb-4">
              <button id="consultAiBtn" class="btn btn-primary btn-lg rounded-pill shadow-sm hover-scale transition-all">
                <i class="fas fa-robot me-2"></i>AI 智能建议
              </button>
              <p class="text-muted small mt-2">基于识别结果获取个性化建议</p>
            </div>
          `;
          
          foodResult.innerHTML = html;

          // Add Event Listener for AI Button
          const consultBtn = document.getElementById('consultAiBtn');
          if (consultBtn) {
            consultBtn.addEventListener('click', () => {
              const foodNames = data.items.map(i => i.name).join('、');
              const prompt = `我刚刚识别了以下食物：${foodNames}，总热量约为 ${data.totalCalories} 千卡。请分析这顿饭的营养结构，并给出接下来的饮食建议和运动消耗方案。`;
              
              // Copy to clipboard and open chat
              if (navigator.clipboard) {
                navigator.clipboard.writeText(prompt).then(() => {
                  alert('已生成咨询问题并复制！\n请在 AI 对话框中粘贴发送。');
                }).catch(err => console.error('Copy failed', err));
              } else {
                 alert('请向 AI 发送：' + prompt);
              }
            });
          }
        } else {
          // 非GitHub Pages环境，使用真实API
          const resp = await fetch('/api/analyze-food', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image: base64 }) });
          const data = await resp.json();
          if (data.items && data.items.length){
            let html = `
              <div class="card bg-light border-primary mb-4 shadow-sm">
                <div class="card-body text-center py-4">
                  <h4 class="card-title text-primary mb-0"><i class="fas fa-utensils me-2"></i>总热量估算</h4>
                  <div class="display-3 fw-bold text-dark my-2">${data.totalCalories} <span class="fs-4 text-muted">kcal</span></div>
                  <p class="text-muted mb-0">基于AI识别结果估算</p>
                </div>
              </div>
              <div class="row g-3">
            `;
            
            data.items.forEach((item) => {
              const conf = (item.confidence * 100).toFixed(1);
              let displayName = item.name;
              let nutritionInfo = '';

              // Handle structured nutrition data if available
              if (item.nutrition && typeof item.nutrition === 'object') {
                  const filteredNutrition = {};
                  const droppedKeys = [];
                  
                  // Filter null/undefined but keep 0, false, ""
                  for (const [key, value] of Object.entries(item.nutrition)) {
                      if (value !== null && value !== undefined) {
                          filteredNutrition[key] = value;
                      } else {
                          droppedKeys.push(key);
                      }
                  }
                  
                  // Log dropped keys in dev environment (console)
                  if (droppedKeys.length > 0) {
                      console.log(`Filtered invalid nutrition data for ${item.name}:`, droppedKeys);
                  }

                  // Construct badges from filtered data
                  // Mapping keys to friendly names
                  const labelMap = {
                      'protein': '蛋白质',
                      'carbohydrate': '碳水',
                      'fat': '脂肪',
                      'calorie': '卡路里',
                      'fiber': '纤维'
                  };

                  nutritionInfo = Object.entries(filteredNutrition)
                      .map(([k, v]) => {
                          const label = labelMap[k] || k;
                          // Skip internal/unknown keys if necessary, or just display all valid ones
                          // For now we display all valid keys that have a mapping or just the key
                          if (!labelMap[k]) return ''; // Only show known nutritional fields
                          return `<span class="badge bg-info text-dark me-1">${label}: ${v}g</span>`;
                      })
                      .join('');

              } else {
                  // Fallback for legacy string format if backend reverts
                  const match = item.name.match(/^(.+?)(（.+）)$/);
                  if (match) {
                      displayName = match[1];
                      nutritionInfo = match[2].replace(/[（）]/g, '').split('，').map(n => `<span class="badge bg-info text-dark me-1">${n}</span>`).join('');
                  }
              }

              html += `
                <div class="col-md-6">
                  <div class="card h-100 shadow-sm hover-shadow transition-all">
                    <div class="card-body">
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title fw-bold text-dark mb-0">${displayName}</h5>
                        <span class="badge bg-warning text-dark fs-6 rounded-pill">🔥 ${item.calories} kcal</span>
                      </div>
                      
                      <div class="mb-3">
                        <small class="text-muted"><i class="fas fa-balance-scale me-1"></i>参考份量: ${item.serving}</small>
                      </div>

                      ${nutritionInfo ? `<div class="mb-3">${nutritionInfo}</div>` : ''}

                      <div class="mt-auto">
                        <div class="d-flex justify-content-between small text-muted mb-1">
                          <span><i class="fas fa-robot me-1"></i>AI置信度</span>
                          <span>${isNaN(conf) ? '—' : conf + '%'}</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                          <div class="progress-bar bg-success" role="progressbar" 
                               style="width: ${item.confidence * 100}%" 
                               aria-valuenow="${item.confidence * 100}" aria-valuemin="0" aria-valuemax="100">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            });
            html += '</div>';
            
            // Add AI Consultation Button
            html += `
              <div class="text-center mt-4 pb-4">
                <button id="consultAiBtn" class="btn btn-primary btn-lg rounded-pill shadow-sm hover-scale transition-all">
                  <i class="fas fa-robot me-2"></i>AI 智能建议
                </button>
                <p class="text-muted small mt-2">基于识别结果获取个性化建议</p>
              </div>
            `;
            
            foodResult.innerHTML = html;

            // Add Event Listener for AI Button
            const consultBtn = document.getElementById('consultAiBtn');
            if (consultBtn) {
              consultBtn.addEventListener('click', () => {
                const foodNames = data.items.map(i => i.name).join('、');
                const prompt = `我刚刚识别了以下食物：${foodNames}，总热量约为 ${data.totalCalories} 千卡。请分析这顿饭的营养结构，并给出接下来的饮食建议和运动消耗方案。`;
                
                // Copy to clipboard and open chat
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(prompt).then(() => {
                    alert('已生成咨询问题并复制！\n请在 AI 对话框中粘贴发送。');
                  }).catch(err => console.error('Copy failed', err));
                } else {
                   alert('请向 AI 发送：' + prompt);
                }

                // Open Coze Chat
                if (window.cozeClient) {
                   // Try common methods
                   if (typeof window.cozeClient.showChatBot === 'function') window.cozeClient.showChatBot();
                   else if (typeof window.cozeClient.setOpen === 'function') window.cozeClient.setOpen(true);
                   else if (typeof window.cozeClient.show === 'function') window.cozeClient.show();
                }
              });
            }
          } else {
            foodResult.innerHTML = '<div class="alert alert-danger">未识别到食物，请更换图片</div>';
          }
        }
      } catch (err){
        console.error('分析失败:', err);
        foodResult.innerHTML = '<div class="alert alert-danger">分析失败，' + (isGitHubPages ? 'GitHub Pages环境下不支持AI后端功能' : '请检查后端或网络') + '</div>';
      } finally {
        foodLoading.classList.add('d-none');
      }
    });
  }
}
function renderPage3Content() {
  const storageKey = 'fitnessCheckins';
  // savedCheckins is an array of strings "YYYY-MM-DD"
  let savedCheckins = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate stats
  savedCheckins.sort(); // Ensure sorted
  let streak = 0;
  let tempDate = new Date();
  while (true) {
      const dStr = tempDate.toISOString().split('T')[0];
      if (savedCheckins.includes(dStr)) {
          streak++;
          tempDate.setDate(tempDate.getDate() - 1);
      } else {
          // If today is not checked in yet, don't break streak from yesterday
          if (dStr === todayStr && streak === 0) {
             tempDate.setDate(tempDate.getDate() - 1);
             continue;
          }
          break;
      }
  }

  // If today is checked in, streak includes today. If not, streak is up to yesterday.
  // The logic above handles it: if today is in list, streak starts at 1.
  // If today is NOT in list, loop checks today (false) -> logic "dStr === todayStr" -> skips to yesterday.
  // If yesterday is in list, streak becomes 1. Correct.

  page3Content.innerHTML = `
    <div class="card rounded-2xl p-4 mb-4 border-0 shadow-sm">
       <h2 class="text-center text-primary fw-bold mb-2">居家健身打卡</h2>
       <p class="text-center text-muted mb-0">坚持就是胜利！每天完成训练后记得打卡哦。</p>
    </div>

    <div class="row g-4 justify-content-center mb-4">
      <!-- Stats Cards -->
      <div class="col-md-6">
         <div class="card rounded-2xl shadow-sm h-100 border-0 bg-gradient-primary text-white" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
           <div class="card-body text-center d-flex flex-column justify-content-center p-4">
             <h5 class="card-title opacity-75 mb-3">当前连续打卡</h5>
             <div class="display-2 fw-bold mb-3">${streak} <span class="fs-5">天</span></div>
             <p class="card-text"><i class="fas fa-fire me-2"></i>保持这一势头！</p>
           </div>
         </div>
      </div>
      <div class="col-md-6">
         <div class="card rounded-2xl shadow-sm h-100 border-0">
           <div class="card-body text-center d-flex flex-column justify-content-center p-4">
             <h5 class="card-title text-muted mb-3">历史累计打卡</h5>
             <div class="display-2 fw-bold mb-3 text-success">${savedCheckins.length} <span class="fs-5 text-dark">天</span></div>
             <div class="d-grid gap-2 col-10 mx-auto">
               <button id="dailyCheckinBtn" class="btn btn-lg btn-primary rounded-pill shadow-sm" ${savedCheckins.includes(todayStr) ? 'disabled' : ''}>
                 ${savedCheckins.includes(todayStr) ? '今日已打卡 <i class="fas fa-check"></i>' : '立即打卡 <i class="fas fa-edit"></i>'}
               </button>
             </div>
           </div>
         </div>
      </div>
    </div>

    <!-- Calendar Section -->
    <div class="card rounded-2xl p-4 shadow-sm border-0 mb-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
             <h4 class="mb-0 fw-bold text-primary" id="checkinCalendarTitle"></h4>
             <div>
               <button class="btn btn-outline-primary btn-sm me-1 rounded-circle" id="ciPrevMonth" style="width:32px;height:32px;"><i class="fas fa-chevron-left"></i></button>
               <button class="btn btn-outline-primary btn-sm rounded-circle" id="ciNextMonth" style="width:32px;height:32px;"><i class="fas fa-chevron-right"></i></button>
             </div>
        </div>
        <div class="checkin-calendar-grid border-0" id="checkinCalendarGrid"></div>
    </div>
    
    <!-- History List -->
     <div class="text-center pb-4">
         <button class="btn btn-link text-muted text-decoration-none" type="button" data-bs-toggle="collapse" data-bs-target="#historyCollapse">
           查看详细打卡记录 <i class="fas fa-chevron-down"></i>
         </button>
      </div>
      <div class="collapse" id="historyCollapse">
        <div class="card card-body border-0 bg-transparent pt-0">
          <div class="d-flex flex-wrap gap-2 justify-content-center" id="historyTags">
            ${savedCheckins.sort().reverse().map(date => `<span class="badge bg-white text-secondary border p-2 shadow-sm rounded-pill">${date}</span>`).join('')}
          </div>
        </div>
      </div>
  `;

  // Calendar Logic
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  function renderCheckinCalendar(month, year) {
      const title = document.getElementById('checkinCalendarTitle');
      const grid = document.getElementById('checkinCalendarGrid');
      const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
      
      title.textContent = `${year}年 ${monthNames[month]}`;
      
      const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      let html = '';
      // Header
      const dayNames = ['日','一','二','三','四','五','六'];
      html += `<div class="d-grid" style="grid-template-columns: repeat(7, 1fr); text-align: center; background: #f8f9fa; border-bottom: 1px solid #eee;">
        ${dayNames.map(d => `<div class="py-2 fw-bold text-muted small">${d}</div>`).join('')}
      </div>`;
      
      html += `<div class="d-grid" style="grid-template-columns: repeat(7, 1fr); gap: 1px; background: #eee;">`;
      
      // Empty cells
      for(let i=0; i<firstDay; i++) {
          html += `<div class="bg-white" style="min-height: 80px;"></div>`;
      }
      
      // Days
      for(let day=1; day<=daysInMonth; day++) {
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isChecked = savedCheckins.includes(dateStr);
          const isToday = dateStr === todayStr;
          
          html += `
            <div class="bg-white p-2 d-flex flex-column align-items-center justify-content-center position-relative" style="min-height: 80px;">
              <span class="small ${isToday ? 'bg-primary text-white rounded-circle px-2 py-1' : 'text-secondary'}">${day}</span>
              ${isChecked ? '<i class="fas fa-check-circle text-success mt-2 fs-4"></i>' : ''}
              ${!isChecked && isToday ? '<small class="text-warning mt-1" style="font-size:10px;">今天</small>' : ''}
            </div>
          `;
      }
      
      html += `</div>`;
      grid.innerHTML = html;
  }

  renderCheckinCalendar(currentMonth, currentYear);

  document.getElementById('ciPrevMonth').addEventListener('click', () => {
      currentMonth--;
      if(currentMonth < 0) { currentMonth=11; currentYear--; }
      renderCheckinCalendar(currentMonth, currentYear);
  });
  
  document.getElementById('ciNextMonth').addEventListener('click', () => {
      currentMonth++;
      if(currentMonth > 11) { currentMonth=0; currentYear++; }
      renderCheckinCalendar(currentMonth, currentYear);
  });

  const btn = document.getElementById('dailyCheckinBtn');
  btn.addEventListener('click', () => {
      if (!savedCheckins.includes(todayStr)) {
          savedCheckins.push(todayStr);
          localStorage.setItem(storageKey, JSON.stringify(savedCheckins));
          
          // Animate success
          btn.innerHTML = '打卡成功 <i class="fas fa-check"></i>';
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-success');
          btn.disabled = true;
          
          // Confetti or visual feedback (Simple alert for now or just refresh)
          setTimeout(() => {
             renderPage3Content(); // Refresh to update streak and calendar
          }, 500);
      }
  });
}
