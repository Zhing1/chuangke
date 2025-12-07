;(function(){
  var sid = localStorage.getItem('ut_sid') || (Date.now().toString(36)+Math.random().toString(36).slice(2));
  localStorage.setItem('ut_sid', sid);
  var q = [];
  var st = Date.now();
  var lastSection = '';
  var tasks = {};
  function push(e){ q.push(e); }
  function send(){
    if (!q.length) return;
    var payload = { sessionId: sid, events: q };
    q = [];
    var ok = false;
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        ok = navigator.sendBeacon('/api/ux-events', blob) === true;
      }
    } catch(e){ ok = false; }
    if (!ok) {
      fetch('/api/ux-events', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }).catch(function(){});
    }
  }
  function section(){ var s = ['homeContent','gameContent','page2Content','page3Content','newsDetailContent'].find(function(id){ var el = document.getElementById(id); return el && !el.classList.contains('d-none'); }) || ''; if (s && s!==lastSection){ lastSection = s; push({t:'nav',v:s,ts:Date.now()}); } }
  function startTask(id){ if (tasks[id] && tasks[id].start) return; tasks[id] = tasks[id]||{}; tasks[id].start = Date.now(); push({t:'task:start',id:id,ts:tasks[id].start}); }
  function endTask(id){ if (!tasks[id]||!tasks[id].start||tasks[id].end) return; tasks[id].end = Date.now(); push({t:'task:end',id:id,ts:tasks[id].end,duration:tasks[id].end-tasks[id].start}); }
  document.addEventListener('click', function(ev){ var r = ev.target.getBoundingClientRect(); var x = Math.round(r.left+(ev.clientX - r.left)); var y = Math.round(r.top+(ev.clientY - r.top)); push({t:'click',x:x,y:y,tag:ev.target.tagName.toLowerCase(),id:ev.target.id||'',cls:ev.target.className||'',ts:Date.now()}); });
  var mo = new MutationObserver(function(){ section(); var em = document.getElementById('errorModal'); if (em && !em.classList.contains('hidden')){ push({t:'error',id:'errorModal',ts:Date.now()}); } var gm = document.getElementById('gameOverModal'); if (gm && !gm.classList.contains('hidden')){ endTask('training'); }
  });
  mo.observe(document.body,{childList:true,subtree:true,attributes:true});
  document.addEventListener('visibilitychange',function(){ if (document.visibilityState==='hidden'){ push({t:'stay',duration:Date.now()-st,ts:Date.now()}); send(); st = Date.now(); } });
  window.addEventListener('beforeunload',function(){ push({t:'stay',duration:Date.now()-st,ts:Date.now()}); send(); });
  var homeBtn = document.getElementById('homeBtn');
  var gameBtn = document.getElementById('gameBtn');
  var page2Btn = document.getElementById('page2Btn');
  var page3Btn = document.getElementById('page3Btn');
  ;[homeBtn,gameBtn,page2Btn,page3Btn].forEach(function(b){ if(!b) return; b.addEventListener('click',function(){ section(); }); });
  var readMoreBtns = document.querySelectorAll('#weightLossNews a.btn');
  readMoreBtns.forEach(function(a){ a.addEventListener('click',function(){ startTask('browse_news'); }); });
  var connectBtn = document.getElementById('connectCameraBtn');
  if (connectBtn){ connectBtn.addEventListener('click',function(){ startTask('connect_camera'); }); }
  var startBtn = document.getElementById('startBtn');
  if (startBtn){ startBtn.addEventListener('click',function(){ startTask('training'); }); }
  var viewRankBtn = document.getElementById('viewRankBtn');
  if (viewRankBtn){ viewRankBtn.addEventListener('click',function(){ startTask('view_rank'); endTask('view_rank'); }); }
  var nutrition = document.getElementById('page2Btn');
  if (nutrition){ nutrition.addEventListener('click',function(){ startTask('browse_nutrition'); }); }
  var plan = document.getElementById('page3Btn');
  if (plan){ plan.addEventListener('click',function(){ startTask('checklist'); }); }
  document.addEventListener('change',function(ev){ if (ev.target && ev.target.closest('#fitnessChecklist')){ endTask('checklist'); }});
  function rate(score){ push({t:'satisfaction',score:Math.max(1,Math.min(5,score)),ts:Date.now()}); send(); }
  window.UT = { startTask:startTask, endTask:endTask, rate:rate };
  push({t:'pageview',path:location.pathname,ts:Date.now()});
  section();
  setInterval(send,3000);
})();
