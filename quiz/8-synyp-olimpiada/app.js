(() => {
  'use strict';
  const D = window.QUIZ_DATA, C = window.QuizCore;
  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
    book:'<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1zM12 5v15"/>',
    repeat:'<path d="M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6m-4 9a9 9 0 0 0 15 2l3-3m0 6v-6h-6"/>',
    chart:'<path d="M4 3v18h18M9 17v-4m5 4V9m5 8V5"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    trophy:'<path d="M8 3h8v6a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-6-3h4v3"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    sparkle:'<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z"/>',
    flag:'<path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18"/>'
  };
  function icon(name, cls = '') {return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;}
  function hydrateIcons() {document.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML=icon(el.dataset.icon); el.removeAttribute('data-icon');});}
  if (!D || !C) {$('#content').innerHTML='<div class="empty"><h1>Материал жүктелмеді</h1><p>Бетті жаңартып көріңіз.</p></div>'; return;}
  const bank = new Map(D.questions.map(q => [q.id, q]));
  const stageOf = id => D.stages.find(s => s.id === id);
  const STORAGE = 'tarih-alany-grade8-v1';
  const emptyStore = () => ({version:1,progress:{},history:[],bookmarks:[],attempt:null,lastResult:null});
  let storageOK = true;
  function loadStore() {
    try {
      const saved=JSON.parse(localStorage.getItem(STORAGE));
      if (!saved || saved.version!==1) return emptyStore();
      const clean=emptyStore();
      clean.progress=Object.fromEntries(Object.entries(saved.progress || {}).filter(([id,p]) => bank.has(id) && p && Number.isInteger(p.attempts) && p.attempts>0 && Number.isInteger(p.correct) && p.correct>=0 && p.correct<=p.attempts && typeof p.lastCorrect==='boolean'));
      clean.bookmarks=Array.isArray(saved.bookmarks)?[...new Set(saved.bookmarks.filter(id => bank.has(id)))]:[];
      clean.history=Array.isArray(saved.history)?saved.history.filter(h => h && typeof h.id==='string' && Number.isFinite(h.percent) && Number.isFinite(h.endedAt) && Number.isFinite(h.earned) && Number.isFinite(h.possible)).slice(0,30):[];
      clean.attempt=C.validSession(saved.attempt,D.questions) && !saved.attempt.completed ? saved.attempt:null;
      clean.lastResult=C.validSession(saved.lastResult,D.questions) && saved.lastResult.completed ? saved.lastResult:null;
      return clean;
    } catch {return emptyStore();}
  }
  let state=loadStore(), session=state.attempt, toastTimer;
  const bankFilter={search:'',stage:'all',kind:'all'};
  function save() {try {localStorage.setItem(STORAGE,JSON.stringify(state));} catch {if(storageOK) toast('Браузер сақтауына орын жетпеді. Осы бет ашық тұрғанда жалғастыра аласың.');storageOK=false;}}
  function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(() => {$('#toast').hidden=true;},3600);}
  function mastered() {return Object.values(state.progress).filter(p => p.lastCorrect).length;}
  function updateSidebar() {
    const count=mastered(), total=D.questions.filter(q=>q.status!=='discussion').length;
    $('#mastered-label').textContent=`${count} / ${total}`;$('#mastered-bar').style.width=`${count/total*100}%`;$('#wrong-count').textContent=C.wrongIds(state.progress).length;
  }
  function go(route) {if(location.hash==='#'+route) render();else location.hash=route;}
  function sectionHead(eyebrow,title,text='',aside='') {return `<div class="section-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${text?`<p class="muted">${text}</p>`:''}</div>${aside}</div>`;}
  function heritageArt() {return `<svg class="heritage-art" viewBox="0 0 480 340" fill="none" aria-hidden="true"><defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0v28" stroke="#fff" stroke-opacity=".045"/></pattern><linearGradient id="bookface" x1="138" y1="116" x2="332" y2="270" gradientUnits="userSpaceOnUse"><stop stop-color="#f6e5b9"/><stop offset="1" stop-color="#c6a969"/></linearGradient></defs><rect width="480" height="340" fill="url(#grid)"/><circle cx="284" cy="156" r="118" stroke="#d7bb7c" stroke-opacity=".17"/><circle cx="284" cy="156" r="93" stroke="#d7bb7c" stroke-opacity=".2" stroke-dasharray="3 9"/><circle cx="284" cy="156" r="66" fill="#d7bb7c" fill-opacity=".05"/><path d="M25 285c58-29 89-17 123-27 44-13 93-39 157-28 50 8 72 4 149-38" stroke="#aec4af" stroke-opacity=".3"/><path d="M36 303c84-19 111-6 166-24 65-21 121-15 189-11 23 2 43-5 68-12" stroke="#aec4af" stroke-opacity=".16"/><path d="m139 142 102-23 110 58-104 35z" fill="#0f292b"/><path d="m138 149 105-22 104 54v61l-104 36-105-61z" fill="#b99b63"/><path d="m143 155 102-22 96 51v49l-97 33-101-58z" fill="#e7d6ad"/><path d="m145 165 99 45 94-19m-193-15 99 45 94-20m-193-14 99 45 94-21m-193-13 99 45 94-22" stroke="#a58e62" stroke-opacity=".6"/><path d="m136 142 62-23c22-8 43-5 58 6 13-16 35-24 57-18l49 14-4 64-108 44-114-58z" fill="url(#bookface)"/><path d="m256 125-6 104m-95-82 36-11c14-4 29-3 43 3m-77 19 36-10c13-4 26-3 39 2m-72 20 36-10c13-3 23-3 34 2m39-25 19-7c11-4 22-4 35 0m-56 19 21-8c11-4 23-4 35 0m-56 19 22-8c10-3 21-4 33-1" stroke="#90764b" stroke-width="2" stroke-linecap="round"/><path d="m260 194 14 8-7 39-9-9-10 3z" fill="#9e573c"/><path d="M109 86v27m-13-14h26M359 232v20m-10-10h20" stroke="#d7bb7c" stroke-opacity=".6"/><path d="m347 61 7 7-7 7-7-7z" fill="#d7bb7c"/><path d="m98 239 5 5-5 5-5-5z" stroke="#d7bb7c"/><circle cx="206" cy="68" r="4" stroke="#d7bb7c" stroke-opacity=".5"/><path d="M282 53v15m-8-8h16" stroke="#d7bb7c" stroke-opacity=".4"/></svg>`;}
  function homeView() {
    const wrong=C.wrongIds(state.progress).length, count=mastered(), graded=119;
    const cards=D.stages.map((s,i) => {
      const owned=D.questions.filter(q=>q.stage===s.id&&q.status!=='discussion');
      const done=owned.filter(q=>state.progress[q.id]?.lastCorrect).length;
      return `<article class="stage-card stage-${i}"><div class="stage-top"><span class="stage-icon">${icon(['flag','globe','trophy','layers'][i])}</span><span class="stage-number">${s.number}</span></div><span class="card-kicker">${i===3?'ТҮПНҰСҚА НҰСҚАЛАР':'ЖАТТЫҒУ НҰСҚАЛАРЫ'}</span><h3>${esc(s.title)}</h3><p>${esc(s.subtitle)}</p><div class="card-info"><span>30 сұрақ</span><span>${s.id==='round2'?'30':s.id==='district'?'49':'50'} ұпай${s.id==='district'?' + 1 талқылау':''}</span></div><div class="track"><span style="width:${done/owned.length*100}%"></span></div><div class="card-bottom"><span>${done} / ${owned.length} меңгерілді</span><button type="button" data-start="${s.id}" class="round-button" aria-label="${esc(s.title)} - бастау">${icon('arrow')}</button></div></article>`;
    }).join('');
    return `<section class="hero"><div class="hero-copy"><div class="hero-badge"><span class="status-dot"></span>8-СЫНЫП · ОЛИМПИАДАҒА ДАЙЫНДЫҚ</div><h1>Өткенді таны.<br>Біліміңді <em>шыңда.</em></h1><p>Қазақстан тарихын сұрақтар арқылы қайтала.<br>Өз қарқыныңмен үйрен, біліміңді сына.</p><div class="button-row"><button type="button" class="button cream" data-start="all">Дайындықты бастау ${icon('arrow')}</button><a class="hero-link" href="#bank">Сұрақтарды қарау ↗</a></div><div class="hero-foot"><span>120 сұрақ</span><i></i><span>4 жинақ</span><i></i><span>Қазақ тілінде</span></div></div>${heritageArt()}</section>
    ${session&&!session.completed?`<section class="resume-strip"><span class="resume-icon">${icon('clock')}</span><div><strong>Бастаған дайындықты жалғастыр</strong><span>${Object.keys(session.answers).length} / ${session.items.length} сұраққа жауап берілді · ${session.mode==='exam'?'Сынақ':'Үйрену'}</span></div><button type="button" class="button secondary" data-action="resume">Жалғастыру →</button></section>`:''}
    <section class="summary-grid" aria-label="Дайындық статистикасы"><div class="summary-item"><span class="stat-icon green">${icon('book')}</span><div><strong>${count}<small> / ${graded}</small></strong><span>Меңгерілген сұрақ</span></div></div><div class="summary-item"><span class="stat-icon amber">${icon('repeat')}</span><div><strong>${wrong}</strong><span>Қайталауды қажет етеді</span></div></div><div class="summary-item"><span class="stat-icon blue">${icon('trophy')}</span><div><strong>${state.history.length}</strong><span>Аяқталған талпыныс</span></div></div></section>
    <section class="collections"><div class="section-row"><div><span class="eyebrow">ДАЙЫНДЫҚ БАҒЫТТАРЫ</span><h2>Жинағыңды таңда</h2></div><button class="text-button" type="button" data-start="all">Барлығын араластыру ${icon('arrow')}</button></div><div class="stage-grid">${cards}</div></section>
    <section class="bottom-grid"><article class="tip-card"><span class="tip-symbol">${icon('sparkle')}</span><div><span class="eyebrow">БІЛІМДІ БЕКІТ</span><h3>Қателесу - үйренудің бір бөлігі</h3><p>Түсіндірмені оқы, қате кеткен сұраққа қайта орал. Әр талпыныс алдыңғысынан жақсы болсын.</p><a href="#mistakes">Қателермен жұмыс ${icon('arrow')}</a></div></article><article class="how-card"><h3>Қалай дайындалған дұрыс?</h3><div><span>01</span><p><strong>Үйрену режимінен баста</strong><small>Әр жауаптан кейін түсіндірмені оқы.</small></p></div><div><span>02</span><p><strong>Сынақта өзіңді тексер</strong><small>Әр сұраққа 1 минут уақыт беріледі.</small></p></div><div><span>03</span><p><strong>Нәтижеңді жақсарт</strong><small>Қате жауаптарды жеке қайтала.</small></p></div></article></section>`;
  }
  function setup(stage='all', pool='all') {
    $('#setup-stage').value=stage;$('#setup-pool').value=pool;
    const ids=resolvePool(pool);
    const available=D.questions.filter(q=>(stage==='all'||q.stage===stage)&&(!ids||ids.includes(q.id))).length;
    if(!available) return toast('Бұл бөлімде сұрақтар әзірге жоқ.');
    $('#setup-title').textContent=pool==='wrong'?'Қателерді бірге түзетейік':pool==='bookmarks'?'Белгіленген сұрақтарды қайтала':stage==='all'?'Өзіңе ыңғайлысын таңда':stageOf(stage).title;
    $('#setup-description').textContent=`${available} сұрақ қолжетімді. Үйрену режимінде уақыт шектелмейді.`;
    $('#question-count').value=available>=10?'10':'all';
    $('#setup-form').querySelector('[value="learn"]').checked=true;
    $('#replace-attempt-note').hidden=!session||session.completed;
    updateSetupCount();$('#setup-dialog').showModal();
  }
  function updateSetupCount() {
    const stage=$('#setup-stage').value,pool=$('#setup-pool').value,mode=$('#setup-form').querySelector('input[name=mode]:checked').value;
    const ids=resolvePool(pool);
    const total=D.questions.filter(q=>(stage==='all'||q.stage===stage)&&(!ids||ids.includes(q.id))&&(mode!=='exam'||q.status!=='discussion')).length;
    const selected=$('#question-count').value;
    $('#question-count').querySelectorAll('option').forEach(o=>{o.disabled=o.value!=='all'&&Number(o.value)>total;});
    if(selected!=='all'&&Number(selected)>total)$('#question-count').value='all';
    const actual=$('#question-count').value==='all'?total:Number($('#question-count').value);
    $('#setup-hint').textContent=mode==='exam'?`${actual} сұрақ · ${actual} минут. Уақыт беттен шықсаң да жүре береді. Дұрыс жауаптар сынақ соңында көрсетіледі.`:`${actual} сұрақ · Уақыт шектеусіз. Жауап нұсқалары әр бастағанда араласады.`;
  }
  function noteBlock(q) {return q.note?`<div class="question-note">${icon('info')}<div><strong>${q.status==='discussion'?'Тексеруді қажет ететін дерек':'Сұраққа ескерту'}</strong><p>${esc(q.note)}</p>${q.verificationUrl?`<a href="${esc(q.verificationUrl)}" target="_blank" rel="noopener noreferrer">Салыстыру дерегі ↗</a>`:''}</div></div>`:'';}
  function questionView() {
    if(!session||session.completed)return `<div class="empty">${icon('book')}<h1>Дайындықты бастайық</h1><p>Сұрақтар жинағын және дайындық түрін таңда.</p><button type="button" class="button primary" data-start="all">Бастау</button></div>`;
    const item=session.items[session.current],q=bank.get(item.qid),has=Object.hasOwn(session.answers,q.id),chosen=session.answers[q.id];
    const show=session.mode==='learn'&&has,discussion=q.status==='discussion',marked=state.bookmarks.includes(q.id);
    const answered=Object.keys(session.answers).length,s=C.score(session,D.questions);
    const options=item.order.map((original,index)=>{
      let cls='',tag='';
      if(show&&!discussion) {if(original===q.correct){cls='correct';tag='Дұрыс жауап';}else if(original===chosen){cls='incorrect';tag='Сенің жауабың';}}
      else if(has&&original===chosen)cls='selected';
      return `<button type="button" class="answer-option ${cls}" data-answer="${original}" ${show?'disabled':''} aria-pressed="${has&&original===chosen}"><span class="answer-letter">${'ABCD'[index]}</span><span>${esc(q.options[original])}</span>${tag?`<span class="answer-tag">${tag}</span>`:''}${show&&original===q.correct&&!discussion?icon('check'):''}</button>`;
    }).join('');
    const feedback=show?`<div class="feedback ${discussion?'neutral':chosen===q.correct?'positive':'negative'}" role="status"><strong>${discussion?'Талқылауға арналған сұрақ':chosen===q.correct?'Дұрыс жауап!':'Бұл жолы басқа жауап дұрыс.'}</strong><p>${esc(q.explanation)}</p>${q.verificationUrl?`<a href="${esc(q.verificationUrl)}" target="_blank" rel="noopener noreferrer">Дереккөз ↗</a>`:''}${noteBlock(q)}</div>`:'';
    return `<div class="quiz-heading"><a class="back-link" href="#home">← Жинақтарға оралу</a><div class="quiz-mode">${icon(session.mode==='exam'?'clock':'book')}${session.mode==='exam'?'Сынақ режимі':'Үйрену режимі'}${session.mode==='exam'?'<strong id="timer" role="timer" aria-label="Қалған уақыт"></strong>':'<span>Уақыт шектеусіз</span>'}</div></div><div class="quiz-layout"><section class="question-panel"><div class="quiz-progress-line"><span>Сұрақ <strong>${session.current+1}</strong> / ${session.items.length}</span><span>${answered} жауап берілді</span></div><div class="track quiz-track"><span style="width:${answered/session.items.length*100}%"></span></div><div class="question-meta"><span class="pill">${esc(stageOf(q.stage).title)}</span><span class="pill quiet">${discussion?'Ұпайсыз талқылау':q.points+' ұпай'}</span><button class="icon-button bookmark-button ${marked?'marked':''}" type="button" data-bookmark="${q.id}" aria-label="${marked?'Белгіні алып тастау':'Сұрақты белгілеу'}" aria-pressed="${marked}" title="Қайталау үшін белгілеу">${icon('bookmark')}</button></div><h1 class="question-text" id="question-title">${esc(q.question)}</h1>${discussion&&!show?'<p class="notice small">Бұл сұрақтың дерегі қосымша тексеруді қажет етеді, нәтижеге ұпай қоспайды.</p>':''}<div class="answer-options" aria-labelledby="question-title">${options}</div>${feedback}<div class="question-actions"><button type="button" class="button secondary" data-action="previous" ${session.current===0?'disabled':''}>← Алдыңғы</button><span class="keyboard-tip">${has?'Келесі сұраққа өт':'Жауапты таңда'}<small>Пернетақта: 1-${q.options.length}</small></span>${session.current===session.items.length-1?'<button class="button primary" type="button" data-action="finish">Нәтижені көру →</button>':'<button class="button primary" type="button" data-action="next">Келесі →</button>'}</div><div class="source-caption">Бастапқы жинақтағы №${q.number} · ${q.optionOrigin==='original'?'Түпнұсқа жауап нұсқалары':'Балама нұсқалар жаттығу үшін құрастырылған'}</div></section><aside class="question-navigator"><div class="navigator-title"><h2>Сұрақтар</h2><span>${session.items.length}</span></div><div class="number-grid">${session.items.map((it,i)=>{const answered=Object.hasOwn(session.answers,it.qid);const entry=bank.get(it.qid);const done=session.mode==='learn'&&answered&&entry.status!=='discussion';return `<button type="button" data-jump="${i}" class="${i===session.current?'current ':''}${done?(session.answers[it.qid]===entry.correct?'right':'wrong'):answered?'answered':''}" aria-label="${i+1}-сұрақ${answered?', жауап берілді':''}" ${i===session.current?'aria-current="step"':''}>${i+1}</button>`;}).join('')}</div><div class="map-legend"><span><i class="legend-current"></i>Ағымдағы</span><span><i class="legend-answered"></i>Жауап берілді</span></div>${session.mode==='learn'?`<div class="session-score"><span>Жиналған ұпай</span><strong>${s.earned}<small> / ${s.possible}</small></strong></div>`:'<p class="small muted">Нәтиже мен түсіндірмелер сынақ аяқталғанда ашылады.</p>'}<button type="button" class="button secondary wide" data-action="finish">Дайындықты аяқтау</button><p class="autosave">${icon('check')}Осы браузерде сақталады</p></aside></div>`;
  }
  function choose(answer) {
    if(!session||session.completed)return;
    const q=bank.get(session.items[session.current].qid);
    if(!Number.isInteger(answer)||answer<0||answer>=q.options.length)return;
    if(session.mode==='learn'&&Object.hasOwn(session.answers,q.id))return;
    session.answers[q.id]=answer;state.attempt=session;save();render(false);
    if(session.mode==='learn')$('.feedback')?.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function jump(index) {if(!session||index<0||index>=session.items.length)return;session.current=index;save();render(false);$('#question-title')?.scrollIntoView({block:'nearest'});}
  function requestFinish() {
    if(!session||session.completed)return;
    const skipped=session.items.length-Object.keys(session.answers).length;
    $('#confirm-message').textContent=skipped?`${skipped} сұраққа жауап берілмеді. Бағаланатын жауапсыз сұрақтарға 0 ұпай қойылады. Нәтижең сақталады.`:'Барлық сұраққа жауап бердің. Ұпайыңды және түсіндірмелерді көре аласың.';
    $('#confirm-dialog').showModal();
  }
  function finish(expired=false) {
    if(!session||session.completed)return;
    session.completed=true;session.endedAt=Date.now();
    const result=C.score(session,D.questions);
    if(!state.history.some(h=>h.id===session.id)) {
      state.progress=C.applyResult(state.progress,session,D.questions);
      state.history.unshift({id:session.id,mode:session.mode,stage:session.stage,count:session.items.length,...result,endedAt:session.endedAt,duration:session.endedAt-session.startedAt});
      state.history=state.history.slice(0,30);
    }
    state.lastResult=session;state.attempt=null;session=null;save();document.querySelectorAll('dialog[open]').forEach(d=>d.close());go('result');if(expired)toast('Уақыт аяқталды. Нәтиже автоматты түрде сақталды.');
  }
  function resultView() {
    const s=state.lastResult;
    if(!s)return `<div class="empty"><h1>Әзірге нәтиже жоқ</h1><p>Алғашқы дайындығыңды аяқтаған соң нәтиже осы жерде көрінеді.</p><button type="button" class="button primary" data-start="all">Бастау</button></div>`;
    const r=C.score(s,D.questions),wrong=s.items.filter(i=>bank.get(i.qid).status!=='discussion'&&s.answers[i.qid]!==bank.get(i.qid).correct).map(i=>i.qid);
    const title=r.percent>=85?'Тамаша нәтиже!':r.percent>=60?'Жақсы қадам жасадың!':'Тарихты бірге қайталайық';
    const review=s.items.map((item,i)=>{
      const q=bank.get(item.qid),has=Object.hasOwn(s.answers,q.id),isCorrect=has&&s.answers[q.id]===q.correct,disc=q.status==='discussion';
      return `<details class="review-row ${disc?'discussion':isCorrect?'is-right':'is-wrong'}"><summary><span class="review-number">${disc?'?':isCorrect?'✓':'×'}</span><span><small>${esc(stageOf(q.stage).title)} · №${q.number} ${disc?'· Ұпайсыз':''}</small>${i+1}. ${esc(q.question)}</span><span class="review-points">${disc?'—':`${isCorrect?q.points:0}/${q.points}`}</span></summary><div class="review-content">${disc?`<p><strong>Файл кілтінде:</strong> ${esc(q.options[q.correct])}</p>`:`<p><strong>Сенің жауабың:</strong> ${has?esc(q.options[s.answers[q.id]]):'Жауап берілмеген'}</p><p class="correct-text"><strong>Дұрыс жауап:</strong> ${esc(q.options[q.correct])}</p>`}<p>${esc(q.explanation)}</p>${noteBlock(q)}<button type="button" class="text-button" data-bookmark="${q.id}">${icon('bookmark')}${state.bookmarks.includes(q.id)?'Белгіленген':'Қайталау үшін белгілеу'}</button></div></details>`;
    }).join('');
    return `${sectionHead('ДАЙЫНДЫҚ ҚОРЫТЫНДЫСЫ','Бүгінгі еңбегіңнің нәтижесі',`${s.mode==='exam'?'Сынақ':'Үйрену'} · ${s.items.length} сұрақ · ${C.formatTime(s.endedAt-s.startedAt)}`)}<section class="result-hero"><div class="score-ring" style="--score:${r.percent}%"><div><strong>${r.percent}<small>%</small></strong><span>Ұпай үлесі</span></div></div><div class="result-copy"><span class="eyebrow">${r.earned} / ${r.possible} ҰПАЙ</span><h2>${title}</h2><p>${wrong.length?'Түсіндірмелерді қарап, қате кеткен сұрақтарды қайта өтіп көр.':'Үйренгеніңді бекіту үшін басқа жинақты да байқап көр.'}</p><div class="button-row">${wrong.length?'<button type="button" class="button primary" data-action="retry-result">Қателерді қайталау</button>':''}<button type="button" class="button secondary" data-start="all">Жаңа дайындық</button><button type="button" class="text-button" data-action="download-result">Нәтижені жүктеу ↓</button></div></div></section><div class="result-stats"><div><strong class="correct-text">${r.correct}</strong><span>Дұрыс жауап</span></div><div><strong class="wrong-text">${r.wrong}</strong><span>Қате жауап</span></div><div><strong>${r.skipped}</strong><span>Жауапсыз</span></div><div><strong>${r.discussion}</strong><span>Ұпайсыз талқылау</span></div></div><div class="section-row"><h2>Жауаптарды талдау</h2><span class="muted small">Түсіндірмені ашу үшін сұрақты бас</span></div><div class="review-list">${review}</div>`;
  }
  function libraryView(kind='all') {
    const isWrong=kind==='wrong';
    return `${sectionHead(isWrong?'ҚАЙТАЛАУ ЖӘНЕ БЕКІТУ':'БАРЛЫҚ МАТЕРИАЛ БІР ЖЕРДЕ',isWrong?'Қателермен жұмыс':'Сұрақтар қоры',isWrong?'Соңғы талпыныста қате кеткен және жауапсыз қалған сұрақтар.':'120 сұрақты ізде, жауабын қара немесе қайталау үшін белгіле.',isWrong?'<button type="button" class="button primary" data-action="practice-wrong">Барлығын қайталау →</button>':'<button type="button" class="button secondary" data-action="practice-bookmarks">Белгіленгендерді өту</button>')}<section class="bank-toolbar"><div class="search-field">${icon('search')}<input id="bank-search" type="search" placeholder="Тұлға, жыл немесе тақырып іздеу…" aria-label="Сұрақтарды іздеу" value="${esc(bankFilter.search)}"></div><select id="bank-stage" aria-label="Жинақ бойынша сүзу"><option value="all">Барлық жинақ</option>${D.stages.map(s=>`<option value="${s.id}" ${bankFilter.stage===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select>${!isWrong?`<select id="bank-kind" aria-label="Сұрақ күйі бойынша сүзу"><option value="all" ${bankFilter.kind==='all'?'selected':''}>Барлық сұрақ</option><option value="bookmarked" ${bankFilter.kind==='bookmarked'?'selected':''}>Белгіленгендер</option><option value="unseen" ${bankFilter.kind==='unseen'?'selected':''}>Өтілмегендер</option><option value="clarified" ${bankFilter.kind==='clarified'?'selected':''}>Ескертулері бар</option></select>`:''}</section><div id="bank-results" data-kind="${kind}">${bankResults(kind)}</div>`;
  }
  function bankResults(kind) {
    const wrong=C.wrongIds(state.progress),search=bankFilter.search.trim().toLocaleLowerCase('kk');
    const filtered=D.questions.filter(q=>(kind!=='wrong'||wrong.includes(q.id))&&(bankFilter.stage==='all'||q.stage===bankFilter.stage)&&(kind==='wrong'||bankFilter.kind==='all'||(bankFilter.kind==='bookmarked'&&state.bookmarks.includes(q.id))||(bankFilter.kind==='unseen'&&!state.progress[q.id])||(bankFilter.kind==='clarified'&&q.note))&&(!search||(q.question+' '+q.options.join(' ')).toLocaleLowerCase('kk').includes(search)));
    if(!filtered.length) return `<div class="empty">${icon(kind==='wrong'?'check':'search')}<h2>${kind==='wrong'&&!wrong.length?'Қайталауды қажет ететін сұрақ жоқ':'Сұрақ табылмады'}</h2><p>${kind==='wrong'&&!wrong.length?'Дайындықты аяқтағанда қате кеткен сұрақтар осы жерге жиналады.':'Іздеу мәтінін немесе сүзгіні өзгертіп көр.'}</p><button type="button" class="button secondary" data-action="clear-filter">Сүзгілерді тазарту</button></div>`;
    return `<div class="bank-count">${filtered.length} сұрақ табылды</div><div class="bank-grid">${filtered.map(q=>`<article class="bank-card"><div class="bank-card-meta"><span>${esc(stageOf(q.stage).title)} · №${q.number}</span><button type="button" class="icon-button ${state.bookmarks.includes(q.id)?'marked':''}" data-bookmark="${q.id}" aria-label="${state.bookmarks.includes(q.id)?'Белгіні алып тастау':'Сұрақты белгілеу'}" aria-pressed="${state.bookmarks.includes(q.id)}">${icon('bookmark')}</button></div><h2>${esc(q.question)}</h2><div class="bank-card-bottom"><span class="small muted">${q.status==='discussion'?'Ұпайсыз талқылау':q.points+' ұпай'}${q.note?' · Ескертпесі бар':''}</span><button type="button" class="text-button" data-one="${q.id}">Куизде өту →</button></div><details class="answer-details"><summary>Жауап пен түсіндірме</summary><div>${q.status==='discussion'?'<span class="small">Файлдағы кілт:</span>':'<span class="small correct-text">Дұрыс жауап:</span>'}<strong>${esc(q.options[q.correct])}</strong><p>${esc(q.explanation)}</p>${noteBlock(q)}</div></details></article>`).join('')}</div>`;
  }
  function statsView() {
    const history=state.history,total=history.length,best=total?Math.max(...history.map(h=>h.percent)):0,average=total?Math.round(history.reduce((a,h)=>a+h.percent,0)/total):0;
    return `${sectionHead('ЖЕКЕ ІЛГЕРІЛЕУ','Менің нәтижелерім','Нәтижелер осы құрылғының браузерінде сақталады.')}<div class="stats-overview"><article><span>${icon('trophy')}</span><strong>${best}%</strong><p>Ең жоғары нәтиже</p></article><article><span>${icon('chart')}</span><strong>${average}%</strong><p>Орташа ұпай үлесі</p></article><article><span>${icon('check')}</span><strong>${mastered()}/119</strong><p>Соңғы жауабы дұрыс</p></article></div><section class="panel"><h2>Жинақтар бойынша меңгеру</h2><div class="stage-stat-list">${D.stages.map(s=>{const qs=D.questions.filter(q=>q.stage===s.id&&q.status!=='discussion'),n=qs.filter(q=>state.progress[q.id]?.lastCorrect).length;return `<div><div class="stat-line"><strong>${esc(s.title)}</strong><span>${n} / ${qs.length}</span></div><div class="track"><span style="width:${n/qs.length*100}%"></span></div></div>`;}).join('')}</div></section><section class="panel history-panel"><div class="section-row"><h2>Талпыныстар тарихы</h2>${total?'<button type="button" class="text-button wrong-text" data-action="reset">Нәтижелерді тазарту</button>':''}</div>${total?`<div class="table-scroll"><table><thead><tr><th>Уақыт</th><th>Жинақ</th><th>Режим</th><th>Сұрақ</th><th>Ұпай</th><th>Нәтиже</th></tr></thead><tbody>${history.map(h=>`<tr><td>${new Date(h.endedAt).toLocaleString('kk-KZ',{timeZone:'Asia/Qyzylorda',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td>${esc(stageOf(h.stage)?.title||'Аралас жинақ')}</td><td>${h.mode==='exam'?'Сынақ':'Үйрену'}</td><td>${Number(h.count)||0}</td><td>${h.earned} / ${h.possible}</td><td><span class="result-pill ${h.percent>=70?'good':''}">${h.percent}%</span></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty compact"><p>Алғашқы талпынысың осы жерде көрінеді.</p><button type="button" class="button primary" data-start="all">Дайындықты бастау</button></div>'}</section><p class="small muted">Соңғы 30 талпыныс көрсетіледі. Браузер деректерін тазарту сақталған нәтижелерді өшіреді. Ортақ құрылғыда әр оқушыға бөлек браузер профилін пайдаланған ыңғайлы.</p>`;
  }
  function sourcesView() {
    return `${sectionHead('ДЕРЕККӨЗДЕР МЕН ЕСКЕРТУЛЕР','Материалдар туралы','Сайт мұғалім ұсынған бес Word файлы негізінде дайындалды.')}<section class="panel source-intro"><h2>Қор қалай құрастырылды?</h2>${D.notes.map(n=>`<p>${esc(n)}</p>`).join('')}<p>Мұндағы сынақ - жаттығу. Ұпай сұрақ салмағына қарай есептеледі; пайыз - жиналған ұпайдың мүмкін ұпайға үлесі.</p></section><section class="panel"><h2>Бастапқы файлдар</h2><div class="source-files">${D.stages.map(s=>`<div>${icon('book')}<span><strong>${esc(s.title)}</strong><small>${esc(s.file)}</small></span><span class="pill">30 сұрақ</span></div>`).join('')}<div>${icon('layers')}<span><strong>Аудандық кезеңнің қайталанған көшірмесі</strong><small>${esc(D.duplicateFile)}</small></span><span class="pill quiet">Бір рет енгізілді</span></div></div></section><section class="panel"><h2>Нақтыланған сұрақтар</h2><div class="correction-list">${D.corrections.map(c=>`<article><span class="pill quiet">${esc(stageOf(c.stage).title)} · №${c.number}</span><p>${esc(c.note)}</p>${c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Салыстыру дерегі ↗</a>`:'<span class="small muted">Бастапқы құжаттың мазмұны бойынша нақтыланды.</span>'}</article>`).join('')}</div></section><section class="panel"><h2>Қолдану жөнінде</h2><p>Сайт телефонда, компьютерде және сенсорлық тақтада жұмыс істеуге бейімделген. Тіркелу қажет емес. Нәтиже мен белгіленген сұрақтар осы браузерде сақталады; басқа оқушылардың нәтижелерімен ортақ рейтинг жасалмайды.</p><p>Үйрену режимінде бірінші жауаптан кейін түсіндірме ашылады. Сынақ режимінде жауапты аяқтағанға дейін өзгертуге болады. Әр сұраққа бір минут беріледі, уақыт беттен шыққанда да жүреді. Толық жауапсыз сұрақтар 0 ұпаймен есептеледі.</p></section>`;
  }
  function render(focus=true) {
    const route=location.hash.slice(1)||'home';
    const views={home:homeView,quiz:questionView,result:resultView,bank:()=>libraryView('all'),mistakes:()=>libraryView('wrong'),stats:statsView,sources:sourcesView};
    const names={home:'Олимпиадаға дайындық',quiz:'Куиз',result:'Дайындық нәтижесі',bank:'Сұрақтар қоры',mistakes:'Қателермен жұмыс',stats:'Менің нәтижелерім',sources:'Материалдар туралы'};
    $('#content').innerHTML=(views[route]||homeView)();$('#page-label').textContent=names[route]||names.home;
    document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    hydrateIcons();updateSidebar();updateTimer();document.title=`${names[route]||names.home} · Тарих алаңы · 8-сынып`;
    if(focus){window.scrollTo({top:0,behavior:'instant'});$('#content').focus({preventScroll:true});}
  }
  function updateTimer() {
    if(session&&!session.completed&&session.mode==='exam') {
      const remaining=session.deadline-Date.now();
      if(remaining<=0){finish(true);return;}
      const timer=$('#timer');if(timer){timer.textContent=C.formatTime(remaining);timer.classList.toggle('urgent',remaining<=60000);}
    }
  }
  function bookmark(id) {
    if(!bank.has(id))return;
    const adding=!state.bookmarks.includes(id);state.bookmarks=adding?[...state.bookmarks,id]:state.bookmarks.filter(x=>x!==id);save();
    document.querySelectorAll('[data-bookmark]').forEach(b=>{if(b.dataset.bookmark===id){b.classList.toggle('marked',adding);b.setAttribute('aria-pressed',String(adding));if(b.classList.contains('icon-button'))b.setAttribute('aria-label',adding?'Белгіні алып тастау':'Сұрақты белгілеу');else b.innerHTML=icon('bookmark')+(adding?'Белгіленген':'Қайталау үшін белгілеу');}});
    if(bankFilter.kind==='bookmarked'&&$('#bank-results'))$('#bank-results').innerHTML=bankResults($('#bank-results').dataset.kind);
    toast(adding?'Сұрақ қайталау үшін белгіленді.':'Белгі алынды.');
  }
  function singleQuestion(id) {
    if(!bank.has(id))return;
    setup('all','all');$('#setup-title').textContent='Бір сұрақты қайталау';$('#setup-description').textContent=bank.get(id).question;
    $('#setup-pool').value='one:'+id;$('#question-count').value='all';$('#setup-hint').textContent='1 сұрақ. Жауаптан кейін түсіндірмені оқы.';
  }
  function exportResult() {
    const s=state.lastResult;if(!s)return;const r=C.score(s,D.questions);
    const lines=['Тарих алаңы - Қазақстан тарихы, 8-сынып',`Нәтиже: ${r.earned}/${r.possible} ұпай (${r.percent}%)`,`Дұрыс: ${r.correct}; қате: ${r.wrong}; жауапсыз: ${r.skipped}; ұпайсыз: ${r.discussion}`,'',...s.items.map((it,i)=>{const q=bank.get(it.qid);return `${i+1}. ${q.question}\nСенің жауабың: ${Object.hasOwn(s.answers,q.id)?q.options[s.answers[q.id]]:'Жауапсыз'}\n${q.status==='discussion'?'Файл кілтінде (тексеру қажет)':'Дұрыс жауап'}: ${q.options[q.correct]}\n${q.explanation}${q.note?'\nЕскерту: '+q.note:''}\n`;})];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Tarih_8_synyp_natizhe.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  document.addEventListener('click',e=>{
    const target=e.target.closest('button,a');if(!target)return;
    if(target.dataset.start){setup(target.dataset.start);return;}
    if(target.dataset.close){$('#'+target.dataset.close).close();return;}
    if(target.dataset.answer!==undefined){choose(Number(target.dataset.answer));return;}
    if(target.dataset.jump!==undefined){jump(Number(target.dataset.jump));return;}
    if(target.dataset.bookmark){bookmark(target.dataset.bookmark);return;}
    if(target.dataset.one){singleQuestion(target.dataset.one);return;}
    switch(target.dataset.action){
      case 'resume':go('quiz');break;
      case 'next':jump(session.current+1);break;
      case 'previous':jump(session.current-1);break;
      case 'finish':requestFinish();break;
      case 'practice-wrong':setup('all','wrong');break;
      case 'practice-bookmarks':setup('all','bookmarks');break;
      case 'retry-result':{
        const result=state.lastResult;
        const ids=result.items.filter(it=>bank.get(it.qid).status!=='discussion'&&result.answers[it.qid]!==bank.get(it.qid).correct).map(it=>it.qid);
        if(ids.length){setup('all','result');$('#setup-title').textContent='Осы талпыныстың қателерін қайталау';$('#setup-description').textContent=`Қайта өтуге ${ids.length} сұрақ бар.`;$('#question-count').value='all';updateSetupCount();}
        break;}
      case 'download-result':exportResult();break;
      case 'clear-filter':bankFilter.search='';bankFilter.stage='all';bankFilter.kind='all';render(false);break;
      case 'reset':$('#reset-dialog').showModal();break;
    }
  });
  // Pool selection is resolved at submission so bookmarked, single-question and retry sessions stay bounded.
  function resolvePool(pool) {
    if(pool==='wrong')return C.wrongIds(state.progress);
    if(pool==='bookmarks')return state.bookmarks;
    if(pool.startsWith('one:'))return [pool.slice(4)];
    if(pool==='result'&&state.lastResult)return state.lastResult.items.filter(it=>bank.get(it.qid).status!=='discussion'&&state.lastResult.answers[it.qid]!==bank.get(it.qid).correct).map(it=>it.qid);
    return null;
  }
  // Submit separately to preserve the selected pool, even after a mode change.
  $('#setup-form').addEventListener('submit',e=>{
    e.preventDefault();
    const config={stage:$('#setup-stage').value,mode:$('#setup-form').querySelector('input[name=mode]:checked').value,count:$('#question-count').value,random:$('#randomize').checked,ids:resolvePool($('#setup-pool').value)};
    const fresh=C.createSession(D.questions,config);if(!fresh)return toast('Таңдалған бөлімде бағаланатын сұрақ жоқ.');
    session=fresh;state.attempt=session;save();$('#setup-dialog').close();go('quiz');
  });
  $('#setup-form').addEventListener('change',updateSetupCount);
  $('#confirm-finish').addEventListener('click',()=>finish());
  $('#confirm-reset').addEventListener('click',()=>{state=emptyStore();session=null;save();$('#reset-dialog').close();render();toast('Осы браузердегі нәтижелер тазартылды.');});
  $('#share-link').addEventListener('click',async()=>{const url=location.origin+location.pathname;try{await navigator.clipboard.writeText(url);toast('Сайт сілтемесі көшірілді.');}catch{toast('Браузердің мекенжай жолағындағы сілтемені көшіре аласың.');}});
  document.addEventListener('input',e=>{if(e.target.id==='bank-search'){bankFilter.search=e.target.value;$('#bank-results').innerHTML=bankResults($('#bank-results').dataset.kind);}});
  document.addEventListener('change',e=>{if(e.target.id==='bank-stage'||e.target.id==='bank-kind'){if(e.target.id==='bank-stage')bankFilter.stage=e.target.value;else bankFilter.kind=e.target.value;$('#bank-results').innerHTML=bankResults($('#bank-results').dataset.kind);}});
  document.addEventListener('keydown',e=>{
    if(location.hash!=='#quiz'||!session||document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
    if(/^[1-4]$/.test(e.key)){const original=session.items[session.current].order[Number(e.key)-1];if(original!==undefined){e.preventDefault();choose(original);}}
    if(e.key==='ArrowRight'&&session.current<session.items.length-1){e.preventDefault();jump(session.current+1);}
    if(e.key==='ArrowLeft'&&session.current>0){e.preventDefault();jump(session.current-1);}
  });
  window.addEventListener('hashchange',()=>render());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateTimer();});
  window.addEventListener('pagehide',()=>{if(session&&!session.completed)save();});
  hydrateIcons();render(false);setInterval(updateTimer,1000);
})();
