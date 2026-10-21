(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TarihCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const normalize=s=>String(s??'').toLocaleLowerCase('kk-KZ').replace(/\s+/g,' ').trim();
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function searchTopics(topics,query,chapter){const q=normalize(query);return topics.filter(t=>(!chapter||t.id.split('.')[0]===String(chapter))&&(!q||normalize([t.id,t.title,...t.facts,t.taskA,t.taskB,t.answerA,t.answerB].join(' ')).includes(q)));}
 function scoreTest(test,answers){let correct=0,answered=0;for(const t of test){const v=answers[t.id];if(Number.isInteger(v)&&v>=0&&v<t.options.length){answered++;if(v===t.correct)correct++;}}return{correct,answered,total:test.length};}
 function scoreWritten(written,checks){return written.reduce((sum,t)=>sum+t.criteria.filter((_,i)=>checks[`${t.id}-${i}`]===true).length,0);}
 function cleanCompleted(topics,list){return [...new Set(Array.isArray(list)?list:[])].filter(id=>topics.some(t=>t.id===id));}
 function blockText(b){return b.kind==='table'?b.rows.flat().join(' '):b.text??b.alt??'';}
 function validate(d){if(d.chapters.length!==7||d.topics.length!==32||d.test.length!==20||d.written.length!==8)throw Error('Жинақтың құрамы толық емес');if(new Set(d.topics.map(t=>t.id)).size!==32)throw Error('Қайталанған тақырып');for(const t of d.topics)if(!t.facts.length||!t.taskA||!t.taskB||!t.answerA||!t.answerB)throw Error('Тақырыптың мазмұны толық емес');for(const t of d.test)if(t.options.length!==4||!Number.isInteger(t.correct)||t.correct<0||t.correct>3)throw Error('Тест кілті қате');for(const t of d.written)if(t.criteria.length!==5)throw Error('Бағалау шарты қате');return true;}
 return{normalize,escape,searchTopics,scoreTest,scoreWritten,cleanCompleted,blockText,validate};
});
