'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('./quiz-core.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname,'data.json'),'utf8'));
const byId = Object.fromEntries(data.questions.map(q=>[q.id,q]));
const base={group:'all',points:'all',scope:'all',mode:'training',count:'all',random:false,minutes:'40'};
const now=1804200000000;
let state=17;
const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};

assert.equal(data.questions.length,120);
assert.equal(Object.keys(byId).length,120);
for(const group of data.groups){
  const qs=data.questions.filter(q=>q.group===group.id);
  assert.equal(qs.length,30);assert.equal(qs.reduce((sum,q)=>sum+q.points,0),50);
  assert.deepEqual(qs.map(q=>q.number),Array.from({length:30},(_,i)=>i+1));
}
for(const q of data.questions){
  assert.equal(q.options.length,4,q.id);
  assert.equal(new Set(q.options.map(s=>s.trim().toLowerCase())).size,4,q.id);
  assert.equal(q.options.filter(o=>o===q.answer).length,1,q.id);
  assert.ok(q.originalQuestion&&q.originalAnswer&&q.originalExplanation,q.id);
  assert.ok([1,2,3].includes(q.points),q.id);
  assert.ok(!/^\s*[A-EА-ЕВ]\)/.test(q.answer),q.id);
  if(q.correction)q.correction.sources.forEach(source=>assert.ok(source.url.startsWith('https://')));
}
const browserData={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'data.js'),'utf8'),browserData);
assert.deepEqual(JSON.parse(JSON.stringify(browserData.window.QUIZ_DATA)),data);

const all=core.createSession(data.questions,base,now,random);
assert.ok(core.validSession(all,byId));
assert.equal(all.entries.length,120);
assert.equal(core.score(all,byId).max,200);
assert.equal(core.score(all,byId).earned,0);
all.entries.forEach(e=>{all.answers[e.id]=byId[e.id].answer;});
const perfect=core.score(all,byId);
assert.equal(perfect.correct,120);assert.equal(perfect.earned,200);assert.equal(perfect.percent,100);
const restored=JSON.parse(JSON.stringify(all));assert.ok(core.validSession(restored,byId));assert.deepEqual(core.score(restored,byId),perfect);

const mixed=core.createSession([byId.d1,byId.d16,byId.d26],base,now,random);
mixed.answers.d1=byId.d1.answer;
mixed.answers.d16=byId.d16.options[1];
const scored=core.score(mixed,byId);
assert.deepEqual([scored.total,scored.answered,scored.correct,scored.earned,scored.max,scored.percent],[3,2,1,1,6,17]);
mixed.finished=true;mixed.endedAt=now+1000;
const progress=core.recordResult({stats:{},bookmarks:['d1'],history:[]},mixed,scored,now+1000);
assert.equal(progress.stats.d1.lastCorrect,true);assert.equal(progress.stats.d16.lastCorrect,false);assert.equal(progress.stats.d26.lastCorrect,false);
assert.equal(core.recordResult(progress,mixed,scored,now+2000).history.length,1);
const sameTime=core.createSession([byId.d1],base,now,random);
assert.notEqual(sameTime.id,mixed.id);
assert.equal(core.recordResult(progress,sameTime,core.score(sameTime,byId),now+2000).history.length,2);
assert.deepEqual(core.pool(data.questions,{...base,scope:'wrong'},progress.stats).map(q=>q.id),['d16','d26']);
assert.deepEqual(core.pool(data.questions,{...base,scope:'bookmarks'},progress.stats,['d1']).map(q=>q.id),['d1']);
assert.equal(core.pool(data.questions,{...base,group:'r',points:'3'}).length,5);
assert.throws(()=>core.createSession([],base),/EMPTY_POOL/);

const exam=core.createSession(data.questions,{...base,mode:'exam',count:'30',minutes:'40',random:true},now,random);
assert.equal(exam.entries.length,30);assert.equal(core.remaining(exam,now),2400);assert.equal(core.remaining(exam,now+2400000),0);
assert.equal(core.remaining(exam,now+2500000),0);assert.equal(core.remaining(all,now),null);assert.equal(core.clock(2400),'40:00');
assert.ok(core.validSession(exam,byId));
assert.equal(new Set(exam.entries.map(q=>q.id)).size,30);
const invalid=JSON.parse(JSON.stringify(exam));invalid.entries[0].options[0]='tampered';assert.equal(core.validSession(invalid,byId),false);
const invalid2=JSON.parse(JSON.stringify(exam));invalid2.answers[exam.entries[0].id]='tampered';assert.equal(core.validSession(invalid2,byId),false);
const invalid3=JSON.parse(JSON.stringify(exam));invalid3.entries.push(invalid3.entries[0]);assert.equal(core.validSession(invalid3,byId),false);
const invalid4=JSON.parse(JSON.stringify(exam));invalid4.deadline=NaN;assert.equal(core.validSession(invalid4,byId),false);
const source=['a','b','c','d'];core.shuffle(source,random);assert.deepEqual(source,['a','b','c','d']);
const positions=new Set();for(let i=0;i<100;i++)positions.add(core.shuffle(source,random).indexOf('a'));assert.equal(positions.size,4);

assert.equal(byId.d14.answer,'1718');assert.equal(byId.p22.answer,'1778 жыл');assert.equal(byId.p28.answer,'Округ - болыс - ауыл');
assert.equal(data.questions.filter(q=>q.correction).length,20);
console.log('PASS: 120 source questions, 4 x 50 points, unique choices, corrections, dataset sync, weighted scores, filters, restore, timer, shuffle, idempotent progress.');
