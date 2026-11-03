/* Қазақстан тарихы - 7 сынып. Dependencies: data.js and quiz-core.js only. */
(function () {
  'use strict';
  const main = document.getElementById('main');
  const data = window.QUIZ_DATA, core = window.QuizCore;
  if (!data || !core) {
    main.innerHTML = '<div class="container empty"><h1>Сұрақтар жүктелмеді</h1><p>Интернет байланысын тексеріп, бетті жаңартыңыз.</p><button class="button" onclick="location.reload()">Қайта жүктеу</button></div>';
    return;
  }
  const byId = Object.fromEntries(data.questions.map(q => [q.id, q]));
  const groups = Object.fromEntries(data.groups.map(g => [g.id, g]));
  const KEYS = {progress:'tarih7-v1-progress', session:'tarih7-v1-session', config:'tarih7-v1-config'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let storageWarning = false, toastTimeout;
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message; el.hidden = false;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { el.hidden = true; }, 3800);
  }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { if (!storageWarning) { storageWarning = true; toast('Браузер сақтауға рұқсат бермеді. Жұмысты осы бетте жалғастыра аласыз.'); } }
  }
  function validProgress(raw) {
    const out = {stats:{}, bookmarks:[], history:[]};
    if (!raw || typeof raw !== 'object') return out;
    if (raw.stats && typeof raw.stats === 'object') {
      for (const q of data.questions) {
        const s = raw.stats[q.id];
        if (s && Number.isInteger(s.attempts) && s.attempts > 0 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= s.attempts && typeof s.lastCorrect === 'boolean' && Number.isFinite(s.lastSeen)) out.stats[q.id] = s;
      }
    }
    if (Array.isArray(raw.bookmarks)) out.bookmarks = [...new Set(raw.bookmarks.filter(id => byId[id]))];
    if (Array.isArray(raw.history)) out.history = raw.history.filter(h => h && ['training','exam'].includes(h.mode) && ['startedAt','at','total','correct','earned','max','percent'].every(k => Number.isFinite(h[k])) && h.total > 0 && h.total <= 120 && h.correct >= 0 && h.correct <= h.total && h.earned >= 0 && h.earned <= h.max).slice(0,20);
    return out;
  }
  let progress = validProgress(read(KEYS.progress, null));
  const defaults = {group:'all',mode:'training',count:'30',points:'all',scope:'all',random:true,minutes:'40'};
  let config = {...defaults};
  const storedConfig = read(KEYS.config, {});
  const allowedConfig = {group:['all',...data.groups.map(g => g.id)],mode:['training','exam'],count:['10','20','30','60','all'],points:['all','1','2','3'],scope:['all','wrong','bookmarks'],minutes:['20','40','60']};
  if (storedConfig && typeof storedConfig === 'object') for (const [key, values] of Object.entries(allowedConfig)) if (values.includes(storedConfig[key])) config[key] = storedConfig[key];
  if (typeof storedConfig?.random === 'boolean') config.random = storedConfig.random;
  const savedSession = read(KEYS.session, null);
  let session = core.validSession(savedSession, byId) ? savedSession : null;
  let screen = 'home', bankPage = 1;
  let bankFilters = {query:'',group:'all',scope:'all',open:false};
  let reviewFilter = 'all';
  const checked = value => value ? ' checked' : '';
  const selected = (a,b) => a === b ? ' selected' : '';
  const number = n => n.toLocaleString('kk-KZ');
  function persistSession() { save(KEYS.session, session); }
  function setConfig(key, value) { config[key] = value; save(KEYS.config, config); }
  function knownWrong() { return data.questions.filter(q => progress.stats[q.id]?.lastCorrect === false); }
  function groupOptions(value) { return '<option value="all"'+selected(value,'all')+'>Барлық жинақ</option>' + data.groups.map(g => '<option value="'+g.id+'"'+selected(value,g.id)+'>'+esc(g.label)+'</option>').join(''); }
  function markButton(q, small = false) {
    const on = progress.bookmarks.includes(q.id);
    return '<button class="bookmark-button'+(on?' on':'')+'" data-action="bookmark" data-id="'+q.id+'" aria-pressed="'+on+'" aria-label="'+(on?'Белгіні алып тастау':'Кейін қайталауға белгілеу')+'" title="Кейін қайталауға белгілеу">'+(on?'★':'☆')+'</button>';
  }
  function provenance(q) {
    return (q.correction ? '<div class="correction-box"><strong>Нақтыланды.</strong> '+esc(q.correction.reason)+(q.correction.sources.length ? '<ul>'+q.correction.sources.map(s => '<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a></li>').join('')+'</ul>' : '')+'</div>' : '') +
      (q.note ? '<p class="note-text">'+esc(q.note)+'</p>' : '') +
      '<details class="provenance"><summary>Бастапқы құжатпен салыстыру</summary><p class="source-file">'+esc(groups[q.group].file)+' · №'+q.number+'</p><p><b>Бастапқы сұрақ:</b> '+esc(q.originalQuestion)+'</p><p><b>Бастапқы кілт:</b> '+esc(q.originalAnswer)+'</p><p><b>Бастапқы түсіндірме:</b> '+esc(q.originalExplanation)+'</p><p>Қате жауап нұсқалары осы куиз үшін құрастырылды. Нұсқалардың әріптері бастапқы құжаттың әріптерімен сәйкес келмеуі мүмкін.</p></details>';
  }
  function heroArt() {
    return '<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 300 280" fill="none"><circle cx="190" cy="101" r="84" stroke="#e5b45d" stroke-width="1"/><circle cx="190" cy="101" r="63" stroke="#e5b45d" opacity=".35"/><circle cx="190" cy="101" r="42" fill="#e5b45d"/><path d="M190 4v16m0 162v16M93 101h16m162 0h16M121 32l12 12m114 114 12 12M121 170l12-12m114-114 12-12" stroke="#e5b45d" stroke-width="2"/><path d="M120 209c26-15 51-15 76 0v-71c-24-15-50-15-76 0v71Zm76 0c26-15 51-15 76 0v-71c-24-15-50-15-76 0v71Z" fill="#193748" stroke="#e5b45d" stroke-width="2"/><path d="M132 151c18-7 34-7 51 0m-51 12c18-7 34-7 51 0m-51 12c18-7 34-7 51 0m26-24c17-7 34-7 50 0m-50 12c17-7 34-7 50 0m-50 12c17-7 34-7 50 0" stroke="#e5b45d" opacity=".5"/><circle cx="85" cy="50" r="3" fill="#e5b45d"/><path d="M68 142h12m-6-6v12M280 55h10m-5-5v10" stroke="#e5b45d"/></svg><small>ӨТКЕНДІ ТАНУДАН - ЖЕҢІСКЕ</small><h2>Тарихты таны.<br>Өзіңді сына.</h2><div class="art-bottom"><span>Бір сұрақ - бір қадам</span><b>7 / ҚАЗАҚСТАН ТАРИХЫ</b></div></div>';
  }
  function renderHome() {
    const available = core.pool(data.questions, config, progress.stats, progress.bookmarks);
    const count = config.count === 'all' ? available.length : Math.min(Number(config.count), available.length);
    const mastered = data.questions.filter(q => progress.stats[q.id]?.lastCorrect).length;
    const wrong = knownWrong().length;
    main.innerHTML = '<div class="container fade-in"><section class="hero"><div><p class="eyebrow">Қазақстан тарихы · 7-сынып</p><h1>Біліміңді шыңда.<br><span>Олимпиадаға дайындал.</span></h1><p class="hero-copy">Сұрақтарға жауап бер, тарихи оқиғалардың байланысын түсін және әр жаттығудан кейін нәтижеңді жақсарт.</p><div class="hero-stats"><div class="hero-stat"><strong>120</strong><span>сұрақ<br>түсіндірмесімен</span></div><div class="hero-stat"><strong>4</strong><span>дайындық<br>жинағы</span></div><div class="hero-stat"><strong>'+mastered+'</strong><span>сұрақ<br>меңгерілді</span></div></div></div>'+heroArt()+'</section>' +
      (session && !session.finished ? '<div class="resume-banner"><p><strong>Аяқталмаған '+(session.mode==='exam'?'сынағың':'жаттығуың')+' бар</strong>'+Object.keys(session.answers).length+' / '+session.entries.length+' сұраққа жауап берілді. '+(session.mode==='exam'?'Уақыт санағы жалғасып жатыр.':'Жауаптарың сақталды.')+'</p><button class="button small" data-action="resume">Жалғастыру →</button></div>' : '') +
      '<section aria-labelledby="collections-title"><div class="section-heading"><div><h2 id="collections-title">Жинақты таңда</h2><p>Бір жинақпен дайындал немесе сұрақтарды араластыр.</p></div><button class="text-button'+(config.group==='all'?' all-selected':'')+'" data-action="group" data-group="all" aria-pressed="'+(config.group==='all')+'">Барлығын таңдау '+(config.group==='all'?'✓':'↗')+'</button></div><div class="stage-grid">'+data.groups.map((g,i) => '<button class="stage-card'+(config.group===g.id?' selected':'')+'" data-action="group" data-group="'+g.id+'" aria-pressed="'+(config.group===g.id)+'"><span class="stage-n">ЖИНАҚ 0'+(i+1)+'</span><span class="checkmark">'+(config.group===g.id?'✓':'')+'</span><h3>'+esc(g.label)+'</h3><p>'+esc(g.description)+'</p><span class="stage-bottom"><b>30 сұрақ</b><span>50 балл ↗</span></span></button>').join('')+'</div></section>' +
      '<section class="setup-panel" aria-label="Куиз баптаулары"><div class="setup-left"><span class="field-label">ДАЙЫНДЫҚ РЕЖИМІ</span><div class="mode-switch" role="group" aria-label="Режим"><button class="mode-button'+(config.mode==='training'?' active':'')+'" data-action="mode" data-mode="training" aria-pressed="'+(config.mode==='training')+'">◉ Жаттығу</button><button class="mode-button'+(config.mode==='exam'?' active':'')+'" data-action="mode" data-mode="exam" aria-pressed="'+(config.mode==='exam')+'">◷ Уақытпен сынақ</button></div><p class="mode-desc">'+(config.mode==='training'?'Әр жауаптан кейін дұрыс нұсқа мен түсіндірме бірден ашылады. Уақыт шектеусіз.':'Жауаптарды аяқтағанша өзгертуге болады. Дұрыс жауаптар мен түсіндірмелер сынақ соңында ашылады.')+'</p><div class="form-row"><div class="field"><label for="question-count">Сұрақ саны</label><select id="question-count" data-config="count">'+['10','20','30','60','all'].map(n=>'<option value="'+n+'"'+selected(config.count,n)+'>'+(n==='all'?'Барлығы':n+' сұрақ')+'</option>').join('')+'</select></div><div class="field"><label for="difficulty">Сұрақтың балы</label><select id="difficulty" data-config="points"><option value="all"'+selected(config.points,'all')+'>Барлық деңгей</option>'+['1','2','3'].map(n=>'<option value="'+n+'"'+selected(config.points,n)+'>'+n+' балдық</option>').join('')+'</select></div></div><label class="checkbox-line"><input type="checkbox" data-config="random"'+checked(config.random)+'> Сұрақтардың ретін араластыру</label></div><div class="setup-right"><div class="form-row"><div class="field"><label for="question-scope">Қай сұрақтардан?</label><select id="question-scope" data-config="scope"><option value="all"'+selected(config.scope,'all')+'>Барлық сұрақ</option><option value="wrong"'+selected(config.scope,'wrong')+'>Қате жауаптар ('+wrong+')</option><option value="bookmarks"'+selected(config.scope,'bookmarks')+'>Белгіленгендер ('+progress.bookmarks.length+')</option></select></div><div class="field"><label for="exam-time">'+(config.mode==='exam'?'Сынақ уақыты':'Уақыт шектеуі')+'</label><select id="exam-time" data-config="minutes"'+(config.mode==='training'?' disabled':'')+'>'+(config.mode==='training'?'<option>Шектеусіз</option>':['20','40','60'].map(n=>'<option value="'+n+'"'+selected(config.minutes,n)+'>'+n+' минут</option>').join(''))+'</select></div></div><div><div class="start-meta"><span><strong>'+count+' сұрақ</strong> таңдалады</span><span>'+available.length+' сұрақ қолжетімді</span></div><button class="button gold block" data-action="start"'+(!count?' disabled':'')+'>'+(config.mode==='training'?'Жаттығуды бастау':'Сынақты бастау')+' <span aria-hidden="true">→</span></button><p class="tip">Жауап нұсқалары әр бастағанда араластырылады.</p></div></div></section>' +
      '<div class="quick-actions"><button class="quick-action" data-action="quick-wrong"><span class="quick-icon">↻</span><span><strong>Қателермен жұмыс</strong><small>'+wrong+' сұрақ қайта қарауды күтеді</small></span><span class="arrow">↗</span></button><button class="quick-action" data-action="quick-bookmarks"><span class="quick-icon">☆</span><span><strong>Белгіленген сұрақтар</strong><small>'+progress.bookmarks.length+' сұрақ жеке жинағыңда</small></span><span class="arrow">↗</span></button></div>' +
      '<details class="method-note"><summary>Материалдар, жауап нұсқалары және түзетулер туралы</summary><p>'+esc(data.methodNote)+'</p><ul>'+data.groups.map(g=>'<li><b>'+esc(g.label)+'</b> - '+g.count+' сұрақ. <span class="source-file">'+esc(g.file)+'</span></li>').join('')+'</ul><p>Барлық 120 сұрақ сақталды, оның ішінде қайталанатын сұрақтар да бар. 20 тапсырманың жауабы, тұжырымы немесе түсіндірмесі нақтыланды. Олардың бастапқы нұсқалары мен қолжетімді дереккөздері сұрақтың ішінде көрсетілген. Бастапқы жинақтарда жыл көрсетілмеген. Бұл - дайындық құралы; ресми олимпиаданың онлайн кезеңі емес.</p></details></div>';
  }
  function renderQuiz() {
    if (!session || session.finished) { navigate(session ? 'result':'home'); return; }
    const e = session.entries[session.index], q = byId[e.id];
    const picked = session.answers[q.id], answered = picked !== undefined;
    const reveal = session.mode === 'training' && answered;
    const answeredCount = Object.keys(session.answers).length;
    const letters = ['A','B','C','D'];
    main.innerHTML = '<div class="container fade-in"><div class="quiz-topbar"><a href="#home" class="text-button">← Дайындыққа оралу</a><span class="quiz-label">'+(session.mode==='training'?'Жаттығу режимі':'Уақытпен сынақ')+'</span><span class="timer" id="timer"'+(session.mode==='training'?' hidden':'')+' aria-label="Қалған уақыт">◷ <span id="clock-text"></span></span></div><div class="quiz-layout"><section class="quiz-card" aria-labelledby="question-title"><div class="question-meta"><span>'+esc(groups[q.group].label)+' · түпнұсқа №'+q.number+'</span><div class="question-tools"><span class="pill">'+q.points+' балл</span>'+markButton(q)+'</div></div><div class="progress-track" aria-hidden="true"><span style="width:'+Math.round(answeredCount/session.entries.length*100)+'%"></span></div><span class="eyebrow">Сұрақ '+(session.index+1)+' / '+session.entries.length+'</span><h1 class="question-title" id="question-title" tabindex="-1">'+esc(q.question)+'</h1><div class="answers" role="group" aria-label="Жауап нұсқалары">'+e.options.map((option,i)=>{
      let cls = 'answer', mark = '';
      if (reveal && option === q.answer) {cls+=' correct';mark='✓';}
      if (reveal && picked===option && picked!==q.answer) {cls+=' wrong';mark='✕';}
      if (!reveal && picked===option) cls+=' selected';
      return '<button class="'+cls+'" data-action="answer" data-option="'+i+'" aria-pressed="'+(picked===option)+'"'+(reveal?' disabled':'')+'><span class="answer-letter">'+letters[i]+'</span><span>'+esc(option)+'</span>'+(mark?'<span class="answer-mark" aria-label="'+(mark==='✓'?'Дұрыс жауап':'Қате жауап')+'">'+mark+'</span>':'')+'</button>';
    }).join('')+'</div>' +
      (reveal?'<div class="feedback'+(picked!==q.answer?' incorrect':'')+'" role="status"><strong>'+(picked===q.answer?'✓ Дұрыс! +'+q.points+' балл':'Қайта есте сақта. Дұрыс жауап: '+esc(q.answer))+'</strong><p>'+esc(q.explanation)+'</p></div>'+provenance(q):'') +
      '<div class="quiz-footer"><button class="button secondary small" data-action="prev"'+(session.index===0?' disabled':'')+'>← Алдыңғы</button><span class="bank-count">'+(session.index+1)+' / '+session.entries.length+'</span><button class="button" data-action="next">'+(session.index===session.entries.length-1?'Нәтижені көру':'Келесі сұрақ →')+'</button></div><p class="keyboard-hint">Пернетақта: 1-4 - жауапты таңдау · ← → - сұрақтарды ауыстыру</p></section><aside class="sidebar"><h3>Сұрақтар навигаторы</h3><p><b>'+answeredCount+'</b> / '+session.entries.length+' жауап берілді</p><div class="question-grid" aria-label="Сұраққа өту">'+session.entries.map((entry,i)=>{
        const answer=session.answers[entry.id], done=answer!==undefined;
        let cls='question-number';
        if(i===session.index)cls+=' current';
        if(done)cls+=session.mode==='training'?(answer===byId[entry.id].answer?' right':' wrong'):' answered';
        if(progress.bookmarks.includes(entry.id))cls+=' bookmarked';
        return '<button class="'+cls+'" data-action="jump" data-index="'+i+'" aria-label="'+(i+1)+'-сұрақ'+(done?', жауап берілді':'')+'"'+(i===session.index?' aria-current="step"':'')+'>'+(i+1)+'</button>';
      }).join('')+'</div><div class="side-legend">'+(session.mode==='training'?'<span><i class="green"></i> Дұрыс</span><span><i class="red"></i> Қате</span>':'<span><i></i> Жауап берілді</span>')+'<span>● Белгіленген</span></div><button class="button secondary end-button" data-action="finish">'+(session.mode==='exam'?'Сынақты аяқтау':'Жаттығуды аяқтау')+'</button><p class="note-text" style="margin:12px 0 0">'+(session.mode==='exam'?'Таймер беттен шыққанда да жүреді. Дұрыс жауаптар соңында ашылады.':'Кез келген сұраққа нөмірін басып өте аласың. Жауап берілген нұсқа бекітіледі.')+'</p></aside></div></div>';
    updateClock();
  }
  function matchingBank() {
    const query = bankFilters.query.trim().toLocaleLowerCase('kk-KZ');
    return data.questions.filter(q => (bankFilters.group==='all'||q.group===bankFilters.group) &&
      (bankFilters.scope!=='wrong'||progress.stats[q.id]?.lastCorrect===false) &&
      (bankFilters.scope!=='bookmarks'||progress.bookmarks.includes(q.id)) &&
      (bankFilters.scope!=='corrected'||q.correction) &&
      (!query||[q.question,q.originalQuestion,q.answer,q.explanation].join(' ').toLocaleLowerCase('kk-KZ').includes(query)));
  }
  function bankItem(q, resultDetail = null) {
    return '<details class="bank-item"'+(bankFilters.open&&!resultDetail?' open':'')+'><summary><span class="bank-no">'+q.group.toUpperCase()+' / '+q.number+'</span><span class="bank-summary">'+esc(q.question)+'<span class="bank-group">'+esc(groups[q.group].label)+' · '+q.points+' балл'+(q.correction?' · <span class="pill correction">Нақтыланды</span>':'')+'</span></span>'+(resultDetail?'<span class="review-result '+(resultDetail.correct?'right':'wrong')+'">'+(resultDetail.correct?'✓ +'+q.points:'✕ 0')+'</span>':'')+'</summary><div class="bank-body">'+(resultDetail&&!resultDetail.correct?'<p class="selected-answer">Сенің жауабың: '+(resultDetail.selected===null?'Жауап берілмеді':esc(resultDetail.selected))+'</p>':'')+'<div class="bank-answer"><strong>Дұрыс жауап: '+esc(q.answer)+'</strong><p>'+esc(q.explanation)+'</p></div>'+provenance(q)+'<div class="button-row">'+markButton(q)+'<button class="button secondary small" data-action="practice-one" data-id="'+q.id+'">Осы сұрақты қайталау →</button></div></div></details>';
  }
  function renderBank() {
    main.innerHTML = '<div class="container fade-in"><div class="page-title"><p class="eyebrow">Қара. Ізде. Есте сақта.</p><h1>Сұрақтар банкі</h1><p>Төрт жинақтағы 120 сұрақ. Сұрақты басып, жауап пен түсіндірмені аш.</p></div><div class="bank-toolbar"><div class="field search-field"><label for="bank-search">Сұрақтан немесе жауаптан іздеу</label><input class="search-input" type="search" id="bank-search" value="'+esc(bankFilters.query)+'" placeholder="Мысалы: Абылай, 1822, бекініс…" autocomplete="off"></div><div class="field"><label for="bank-group">Жинақ</label><select id="bank-group">'+groupOptions(bankFilters.group)+'</select></div><div class="field"><label for="bank-scope">Сұрақтар тобы</label><select id="bank-scope"><option value="all"'+selected(bankFilters.scope,'all')+'>Барлығы</option><option value="wrong"'+selected(bankFilters.scope,'wrong')+'>Қате жауаптар</option><option value="bookmarks"'+selected(bankFilters.scope,'bookmarks')+'>Белгіленгендер</option><option value="corrected"'+selected(bankFilters.scope,'corrected')+'>Нақтыланғандар</option></select></div></div><div class="bank-controls"><label class="checkbox-line"><input type="checkbox" id="bank-open"'+checked(bankFilters.open)+'> Жауаптарды бірден көрсету</label><button class="button secondary small" data-action="practice-filtered">Таңдалған сұрақтармен жаттығу →</button></div><div id="bank-results"></div></div>';
    renderBankResults();
    document.getElementById('bank-search').addEventListener('input', e => {bankFilters.query=e.target.value;bankPage=1;renderBankResults();});
    document.getElementById('bank-group').addEventListener('change', e => {bankFilters.group=e.target.value;bankPage=1;renderBankResults();});
    document.getElementById('bank-scope').addEventListener('change', e => {bankFilters.scope=e.target.value;bankPage=1;renderBankResults();});
    document.getElementById('bank-open').addEventListener('change', e => {bankFilters.open=e.target.checked;renderBankResults();});
  }
  function renderBankResults() {
    const matches=matchingBank(), pages=Math.max(1,Math.ceil(matches.length/20));
    bankPage=Math.min(Math.max(1,bankPage),pages);
    const questions=matches.slice((bankPage-1)*20,bankPage*20);
    document.getElementById('bank-results').innerHTML='<p class="bank-count" role="status">'+matches.length+' сұрақ табылды'+(matches.length?' · '+((bankPage-1)*20+1)+'-'+Math.min(bankPage*20,matches.length)+' көрсетілді':'')+'</p>'+(questions.length?questions.map(q=>bankItem(q)).join(''):'<div class="empty"><h3>Сұрақ табылмады</h3><p>Іздеу сөзін немесе сүзгіні өзгертіп көр.</p></div>')+(pages>1?'<div class="pagination"><button class="button secondary small" data-action="bank-page" data-step="-1"'+(bankPage===1?' disabled':'')+'>← Алдыңғы</button><span>'+bankPage+' / '+pages+'</span><button class="button secondary small" data-action="bank-page" data-step="1"'+(bankPage===pages?' disabled':'')+'>Келесі →</button></div>':'');
    document.querySelector('[data-action="practice-filtered"]').disabled=!matches.length;
  }
  function renderProgress() {
    const attempted=Object.keys(progress.stats).length;
    const mastered=Object.values(progress.stats).filter(s=>s.lastCorrect).length;
    const attempts=Object.values(progress.stats).reduce((s,v)=>s+v.attempts,0);
    const corrects=Object.values(progress.stats).reduce((s,v)=>s+v.correct,0);
    const accuracy=attempts?Math.round(corrects/attempts*100):0;
    main.innerHTML='<div class="container fade-in"><div class="page-title"><p class="eyebrow">Әр жаттығудан кейін бір қадам алға</p><h1>Менің нәтижем</h1><p>Аяқталған жаттығулар мен сынақтар есепке алынады. Деректер осы құрылғының осы браузерінде сақталады.</p></div><div class="stats-grid"><div class="stat-card"><strong>'+attempted+'<small style="font-size:15px;color:var(--muted)"> / 120</small></strong><span>сұрақ орындалды</span></div><div class="stat-card gold"><strong>'+mastered+'</strong><span>сұраққа соңғы жауап дұрыс</span></div><div class="stat-card"><strong>'+accuracy+'%</strong><span>барлық жауаптың дәлдігі</span></div><div class="stat-card"><strong>'+knownWrong().length+'</strong><span>сұрақты қайталау қажет</span></div></div><div class="button-row"><button class="button" data-action="quick-wrong">Қателерді қайталау ↻</button><a href="#home" class="button secondary">Жаңа жаттығу →</a></div><section class="progress-section"><h2>Жинақтар бойынша ілгерілеу</h2>'+data.groups.map(g=>{
      const done=data.questions.filter(q=>q.group===g.id&&progress.stats[q.id]?.lastCorrect).length;
      return '<div class="group-progress"><span>'+esc(g.label)+'</span><div class="progress-track" role="progressbar" aria-label="'+esc(g.label)+' меңгерілген сұрақтар" aria-valuemin="0" aria-valuemax="30" aria-valuenow="'+done+'"><span style="width:'+done/30*100+'%"></span></div><span>'+done+' / 30</span></div>';
    }).join('')+'<p class="note-text">Меңгерілген сұрақ - соңғы аяқталған жаттығуда дұрыс жауап берілген сұрақ.</p></section><section class="progress-section"><h2>Соңғы жаттығулар</h2>'+(progress.history.length?'<div class="history-scroll"><table><thead><tr><th>Күні</th><th>Режим</th><th>Дұрыс жауап</th><th>Балл</th><th>Нәтиже</th></tr></thead><tbody>'+progress.history.map(h=>'<tr><td>'+esc(new Date(h.at).toLocaleString('kk-KZ',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))+'</td><td>'+(h.mode==='exam'?'Сынақ':'Жаттығу')+'</td><td>'+h.correct+' / '+h.total+'</td><td>'+h.earned+' / '+h.max+'</td><td><b>'+h.percent+'%</b></td></tr>').join('')+'</tbody></table></div><p class="note-text">Соңғы 20 нәтиже көрсетіледі. Сұрақтардың жалпы статистикасы толық сақталады.</p>':'<div class="empty"><h3>Алғашқы нәтижең осында көрінеді</h3><p>Жаттығуды аяқтағанда балл мен меңгерілген сұрақтар сақталады.</p></div>')+'</section><button class="text-button" data-action="reset-progress">Нәтижелер мен белгілерді өшіру</button></div>';
  }
  function renderResult() {
    if (!session || !session.finished) {navigate(session?'quiz':'home');return;}
    const result=core.score(session,byId), errors=result.total-result.correct;
    const duration=Math.max(0,Math.round((session.endedAt-session.startedAt)/1000));
    const heading=result.percent>=85?'Өте жақсы нәтиже!':result.percent>=60?'Ілгерілеу бар!':'Әр қате - жаңа мүмкіндік';
    main.innerHTML='<div class="container fade-in"><div class="page-title"><p class="eyebrow">'+(session.mode==='exam'?'Сынақ аяқталды':'Жаттығу аяқталды')+'</p></div><section class="result-hero"><div class="score-ring" style="--score:'+result.percent+'"><div><strong>'+result.percent+'%</strong><span>жиналған балл үлесі</span></div></div><div class="result-copy"><h1>'+heading+'</h1><p>'+(errors?'Түсіндірмелерді қарап, қате кеткен '+errors+' сұрақты қайта орында.':'Барлық сұраққа дұрыс жауап бердің. Келесі жинақта біліміңді сынап көр.')+'</p><div class="result-stats"><span><strong>'+result.correct+' / '+result.total+'</strong>дұрыс жауап</span><span><strong>'+result.earned+' / '+result.max+'</strong>жиналған балл</span><span><strong>'+core.clock(duration)+'</strong>жұмсалған уақыт</span></div><div class="button-row">'+(errors?'<button class="button" data-action="retry-errors">Қателерді қайталау ↻</button>':'')+'<button class="button secondary" data-action="retry-all">Қайта орындау</button><a class="text-button" href="#home">Басты бет →</a></div></div></section><div class="review-heading"><h2>Жауаптарды талдау</h2><select id="review-filter" aria-label="Талдау сүзгісі"><option value="all"'+selected(reviewFilter,'all')+'>Барлық жауап ('+result.total+')</option><option value="wrong"'+selected(reviewFilter,'wrong')+'>Қате және жауапсыз ('+errors+')</option><option value="right"'+selected(reviewFilter,'right')+'>Дұрыс ('+result.correct+')</option></select></div><div id="review-results"></div></div>';
    renderReview();
    document.getElementById('review-filter').addEventListener('change',e=>{reviewFilter=e.target.value;renderReview();});
  }
  function renderReview() {
    const result=core.score(session,byId);
    const list=result.details.filter(d=>reviewFilter==='all'||(reviewFilter==='wrong'&&!d.correct)||(reviewFilter==='right'&&d.correct));
    document.getElementById('review-results').innerHTML=list.length?list.map(d=>bankItem(byId[d.id],d)).join(''):'<div class="empty"><p>Бұл топта сұрақ жоқ.</p></div>';
  }
  function render() {
    document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===screen||(a.dataset.nav==='home'&&['quiz','result'].includes(screen)));if(a.dataset.nav===screen)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    ({home:renderHome,quiz:renderQuiz,bank:renderBank,progress:renderProgress,result:renderResult}[screen]||renderHome)();
    document.title=({'home':'Олимпиадаға дайындық','quiz':'Куиз','bank':'Сұрақтар банкі','progress':'Менің нәтижем','result':'Нәтиже'}[screen]||'Дайындық')+' | Тарих алаңы';
  }
  function navigate(next, focus = true) {
    screen=next;
    if(location.hash!=='#'+next) history.pushState(null,'','#'+next);
    render();
    if(focus){window.scrollTo(0,0);main.focus({preventScroll:true});}
  }
  function ask(title,message,confirmText='Аяқтау',cancelText='Жалғастыру') {
    const dialog=document.getElementById('confirm-dialog');
    document.getElementById('dialog-title').textContent=title;
    document.getElementById('dialog-text').textContent=message;
    document.getElementById('dialog-confirm').textContent=confirmText;
    document.getElementById('dialog-cancel').textContent=cancelText;
    if(dialog.open) return Promise.resolve(false);
    return new Promise(resolve=>{
      let yes=false;
      document.getElementById('dialog-confirm').onclick=()=>{yes=true;dialog.close();};
      document.getElementById('dialog-cancel').onclick=()=>dialog.close();
      dialog.onclose=()=>resolve(yes);
      dialog.showModal();
    });
  }
  async function startQuiz(customQuestions = null, customConfig = null) {
    const settings={...config,...customConfig};
    const available=customQuestions||core.pool(data.questions,settings,progress.stats,progress.bookmarks);
    if(!available.length){toast('Бұл топта сұрақ жоқ. Басқа жинақты немесе сүзгіні таңда.');return;}
    if(session&&!session.finished){
      const yes=await ask('Жаңа жаттығуды бастау','Аяқталмаған жұмыстың орнына жаңа жаттығу басталады. Қазіргі аяқталмаған жұмыс нәтижеге қосылмайды.','Жаңасын бастау','Қайту');
      if(!yes)return;
    }
    session=core.createSession(available,settings);persistSession();reviewFilter='all';navigate('quiz');
  }
  async function finishRequested() {
    if(!session||session.finished)return;
    const unanswered=session.entries.length-Object.keys(session.answers).length;
    if(unanswered){
      const yes=await ask('Жұмысты аяқтау','Әлі '+unanswered+' сұраққа жауап берілмеді. Олар 0 балл болып есептеледі. Нәтижені қазір көре аласың.');
      if(!yes||session.finished)return;
    }
    finish(false);
  }
  function finish(expired) {
    if(!session||session.finished)return;
    session.finished=true;session.endedAt=expired?session.deadline:Date.now();
    const result=core.score(session,byId);
    progress=core.recordResult(progress,session,result,session.endedAt);
    save(KEYS.progress,progress);persistSession();reviewFilter='all';
    const dialog=document.getElementById('confirm-dialog');if(dialog.open)dialog.close();
    navigate('result');if(expired)toast('Сынақ уақыты аяқталды. Жауаптарың есептелді.');
  }
  function updateClock() {
    if(!session||session.finished||session.mode!=='exam')return;
    const left=core.remaining(session);
    if(left===0){finish(true);return;}
    const clock=document.getElementById('clock-text');
    if(clock){clock.textContent=core.clock(left);document.getElementById('timer').classList.toggle('urgent',left<=300);}
  }
  function move(delta) {
    if(!session||session.finished)return;
    const next=session.index+delta;
    if(next>=session.entries.length){finishRequested();return;}
    if(next<0)return;
    session.index=next;persistSession();renderQuiz();
    document.getElementById('question-title')?.focus({preventScroll:true});window.scrollTo(0,0);
  }
  main.addEventListener('change',e=>{
    const key=e.target.dataset.config;if(!key)return;
    setConfig(key,key==='random'?e.target.checked:e.target.value);renderHome();
  });
  main.addEventListener('click',async e=>{
    const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
    const action=button.dataset.action;
    if(action==='group'){setConfig('group',button.dataset.group);renderHome();}
    else if(action==='mode'){setConfig('mode',button.dataset.mode);renderHome();}
    else if(action==='start')await startQuiz();
    else if(action==='resume')navigate('quiz');
    else if(action==='answer'){
      if(!session||session.finished)return;updateClock();if(session.finished)return;
      const entry=session.entries[session.index];
      if(session.mode==='training'&&session.answers[entry.id]!==undefined)return;
      const choice=entry.options[Number(button.dataset.option)];if(choice===undefined)return;
      session.answers[entry.id]=choice;persistSession();renderQuiz();
      if(session.mode==='training') document.querySelector('[data-action="next"]')?.focus({preventScroll:true});
      else document.querySelector('[data-option="'+Number(button.dataset.option)+'"]')?.focus({preventScroll:true});
    }
    else if(action==='next')move(1);
    else if(action==='prev')move(-1);
    else if(action==='jump'){
      if(!session||session.finished)return;session.index=Number(button.dataset.index);persistSession();renderQuiz();document.getElementById('question-title')?.focus({preventScroll:true});window.scrollTo(0,0);
    }
    else if(action==='finish')await finishRequested();
    else if(action==='bookmark'){
      const id=button.dataset.id;if(!byId[id])return;
      const had=progress.bookmarks.includes(id);
      progress.bookmarks=had?progress.bookmarks.filter(x=>x!==id):[...progress.bookmarks,id];save(KEYS.progress,progress);
      if(screen==='quiz')renderQuiz();else if(screen==='bank'&&bankFilters.scope==='bookmarks')renderBankResults();else{button.classList.toggle('on',!had);button.setAttribute('aria-pressed',String(!had));button.setAttribute('aria-label',had?'Кейін қайталауға белгілеу':'Белгіні алып тастау');button.textContent=had?'☆':'★';}
      toast(had?'Белгі алынды.':'Сұрақ кейін қайталауға белгіленді.');
    }
    else if(action==='quick-wrong')await startQuiz(knownWrong(),{mode:'training',count:'all',scope:'all',group:'all',points:'all'});
    else if(action==='quick-bookmarks')await startQuiz(progress.bookmarks.map(id=>byId[id]),{mode:'training',count:'all',scope:'all',group:'all',points:'all'});
    else if(action==='practice-one')await startQuiz([byId[button.dataset.id]],{mode:'training',count:'all'});
    else if(action==='practice-filtered')await startQuiz(matchingBank(),{mode:'training',count:'all'});
    else if(action==='bank-page'){bankPage+=Number(button.dataset.step);renderBankResults();document.getElementById('bank-results').scrollIntoView({block:'start'});}
    else if(action==='retry-errors'){
      const wrong=core.score(session,byId).details.filter(d=>!d.correct).map(d=>byId[d.id]);await startQuiz(wrong,{mode:'training',count:'all'});
    }
    else if(action==='retry-all')await startQuiz(session.entries.map(entry=>byId[entry.id]),{mode:session.mode,count:'all'});
    else if(action==='reset-progress'){
      if(await ask('Нәтижелерді өшіру','Осы браузердегі барлық нәтиже, белгі және аяқталмаған жұмыс өшіріледі. Бұл әрекетті кері қайтару мүмкін емес.','Өшіру','Сақтау')){
        progress={stats:{},bookmarks:[],history:[]};session=null;save(KEYS.progress,progress);persistSession();renderProgress();toast('Нәтижелер өшірілді.');
      }
    }
  });
  document.addEventListener('keydown',e=>{
    if(screen!=='quiz'||!session||session.finished||document.getElementById('confirm-dialog').open||e.ctrlKey||e.metaKey||e.altKey)return;
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if(/^[1-4]$/.test(e.key)){e.preventDefault();document.querySelector('[data-option="'+(Number(e.key)-1)+'"]')?.click();}
    else if(e.key==='ArrowRight'){e.preventDefault();move(1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
  });
  window.addEventListener('hashchange',()=>{screen=['home','quiz','bank','progress','result'].includes(location.hash.slice(1))?location.hash.slice(1):'home';render();window.scrollTo(0,0);});
  window.addEventListener('pageshow',updateClock);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClock();});
  setInterval(updateClock,1000);
  screen=['home','quiz','bank','progress','result'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
  render();updateClock();
})();
