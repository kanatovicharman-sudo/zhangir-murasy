'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('./core.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname,'data.json'),'utf8'));
const fixed = () => 0.314159;
test('all four source sets are complete and each question has one valid key',()=>{
  assert.equal(D.questions.length,120);
  assert.equal(new Set(D.questions.map(q=>q.id)).size,120);
  for(const stage of D.stages){
    const qs=D.questions.filter(q=>q.stage===stage.id);
    assert.deepEqual(qs.map(q=>q.number),Array.from({length:30},(_,i)=>i+1));
    for(const q of qs){assert.ok(q.question&&q.originalQuestion&&q.originalAnswer&&q.explanation);assert.ok(q.correct>=0&&q.correct<q.options.length);assert.equal(new Set(q.options).size,q.options.length);}
  }
  assert.equal(D.questions.filter(q=>q.optionOrigin==='original').length,30);
});
test('shuffle preserves keys, options, source arrays and requested stage',()=>{
  const snapshot=JSON.stringify(D);
  for(const stage of D.stages){
    const s=C.createSession(D.questions,{stage:stage.id,count:'all'},1000,fixed);
    assert.equal(s.items.length,30);assert.ok(C.validSession(s,D.questions));
    for(const item of s.items){const q=D.questions.find(q=>q.id===item.qid);assert.equal(q.stage,stage.id);assert.equal(item.order.filter(i=>i===q.correct).length,1);}
  }
  assert.equal(JSON.stringify(D),snapshot);
});
test('weighted scoring excludes discussion items and gives 179 possible points',()=>{
  const s=C.createSession(D.questions,{count:'all'},1000,fixed);
  for(const item of s.items){const q=D.questions.find(q=>q.id===item.qid);s.answers[q.id]=q.correct;}
  const r=C.score(s,D.questions);
  assert.equal(r.graded,119);assert.equal(r.discussion,1);assert.equal(r.correct,119);assert.equal(r.percent,100);assert.equal(r.possible,179);assert.equal(r.earned,179);
  delete s.answers['collection-30'];
  const next=C.score(s,D.questions);
  assert.equal(next.skipped,1);assert.equal(next.earned,176);assert.equal(next.possible,179);
});
test('exam filters out unverified items, has a fixed wall-clock deadline and caps count',()=>{
  const s=C.createSession(D.questions,{mode:'exam',stage:'district',count:30},1000,fixed);
  assert.equal(s.items.length,29);assert.ok(!s.items.some(q=>q.qid==='district-12'));assert.equal(s.deadline,1000+29*60000);
  const resumed=JSON.parse(JSON.stringify(s));assert.ok(C.validSession(resumed,D.questions));assert.equal(resumed.deadline,s.deadline);
  assert.equal(C.createSession(D.questions,{ids:[],count:'all'}),null);
});
test('mistake repetition stays bounded and correct answers clear previous mistakes',()=>{
  const ids=['district-01','round2-10'];
  const s=C.createSession(D.questions,{ids,count:'all'},1000,fixed);
  s.endedAt=2000;
  const wrong=C.applyResult({},s,D.questions);
  assert.deepEqual(new Set(C.wrongIds(wrong)),new Set(ids));
  const retry=C.createSession(D.questions,{ids:C.wrongIds(wrong),count:'all'},3000,fixed);
  for(const it of retry.items)retry.answers[it.qid]=D.questions.find(q=>q.id===it.qid).correct;
  retry.endedAt=4000;
  const corrected=C.applyResult(wrong,retry,D.questions);
  assert.deepEqual(C.wrongIds(corrected),[]);assert.equal(corrected['district-01'].attempts,2);assert.equal(corrected['district-01'].correct,1);
});
test('tampered saved attempts, duplicate options and invalid answers are rejected',()=>{
  const base=C.createSession(D.questions,{count:10},1000,fixed);
  for(const edit of [s=>s.items[0].order.fill(0),s=>s.items.push(s.items[0]),s=>s.current=100,s=>s.answers.noSuchQuestion=0,s=>s.answers[s.items[0].qid]=999,s=>s.items[0].qid='missing',s=>s.items[0]=null]){
    const s=JSON.parse(JSON.stringify(base));edit(s);assert.equal(C.validSession(s,D.questions),false);
  }
});
test('important content corrections and organ versus leader distinction are retained',()=>{
  const get=id=>D.questions.find(q=>q.id===id);
  assert.match(get('collection-03').options[get('collection-03').correct],/Тынышпаев/);
  assert.match(get('collection-13').question,/1937/);
  assert.match(get('collection-30').explanation,/педагогикалық/);
  assert.match(get('round2-14').question,/орган/);
  assert.equal(get('district-12').status,'discussion');
});
test('time formatting does not show negative values or fractional seconds',()=>{
  assert.equal(C.formatTime(-1000),'00:00');assert.equal(C.formatTime(61001),'01:02');assert.equal(C.formatTime(60000),'01:00');
});
