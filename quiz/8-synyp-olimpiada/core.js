(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuizCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function shuffle(values, random = Math.random) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function createSession(questions, config = {}, now = Date.now(), random = Math.random) {
    const mode = config.mode === 'exam' ? 'exam' : 'learn';
    let pool = questions.filter(q => (!config.stage || config.stage === 'all' || q.stage === config.stage) && (!config.ids || config.ids.includes(q.id)) && (mode !== 'exam' || q.status !== 'discussion'));
    if (config.random !== false) pool = shuffle(pool, random);
    const count = config.count === 'all' ? pool.length : Math.min(pool.length, Math.max(1, Number(config.count) || 10));
    pool = pool.slice(0, count);
    if (!pool.length) return null;
    return {
      version: 1, id: now + '-' + Math.floor(random() * 1000000), mode,
      stage: config.stage || 'all', startedAt: now,
      deadline: mode === 'exam' ? now + pool.length * 60 * 1000 : null,
      current: 0, answers: {}, completed: false, endedAt: null,
      items: pool.map(q => ({qid: q.id, order: config.shuffleOptions === false ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i), random)}))
    };
  }
  function validSession(s, questions) {
    if (!s || s.version !== 1 || !['learn', 'exam'].includes(s.mode) || !Array.isArray(s.items) || !s.items.length || s.items.length > questions.length) return false;
    const bank = new Map(questions.map(q => [q.id, q]));
    const ids = new Set();
    for (const item of s.items) {
      if (!item || typeof item !== 'object') return false;
      const q = bank.get(item.qid);
      if (!q || ids.has(item.qid) || !Array.isArray(item.order) || item.order.length !== q.options.length || [...item.order].sort((a,b) => a-b).some((v,i) => v !== i)) return false;
      ids.add(item.qid);
    }
    if (!Number.isInteger(s.current) || s.current < 0 || s.current >= s.items.length || typeof s.answers !== 'object' || !s.answers || typeof s.completed !== 'boolean' || !Number.isFinite(s.startedAt) || typeof s.id !== 'string') return false;
    if (s.mode === 'exam' && (!Number.isFinite(s.deadline) || s.deadline <= s.startedAt)) return false;
    return Object.entries(s.answers).every(([id, answer]) => ids.has(id) && Number.isInteger(answer) && answer >= 0 && answer < bank.get(id).options.length);
  }
  function score(session, questions) {
    const bank = new Map(questions.map(q => [q.id, q]));
    const result = {correct: 0, wrong: 0, skipped: 0, discussion: 0, answered: 0, graded: 0, earned: 0, possible: 0};
    for (const item of session.items) {
      const q = bank.get(item.qid);
      if (!q) continue;
      const answered = Object.hasOwn(session.answers, q.id);
      if (answered) result.answered++;
      if (q.status === 'discussion') {result.discussion++; continue;}
      result.graded++;
      result.possible += q.points;
      if (!answered) result.skipped++;
      else if (session.answers[q.id] === q.correct) {result.correct++; result.earned += q.points;}
      else result.wrong++;
    }
    result.percent = result.possible ? Math.round(result.earned / result.possible * 100) : 0;
    return result;
  }
  function applyResult(progress, session, questions) {
    const next = {...progress};
    const bank = new Map(questions.map(q => [q.id, q]));
    for (const item of session.items) {
      const q = bank.get(item.qid);
      if (!q || q.status === 'discussion') continue;
      const old = next[q.id] || {attempts: 0, correct: 0};
      const correct = Object.hasOwn(session.answers, q.id) && session.answers[q.id] === q.correct;
      next[q.id] = {attempts: old.attempts + 1, correct: old.correct + Number(correct), lastCorrect: correct, lastAt: session.endedAt};
    }
    return next;
  }
  function wrongIds(progress) { return Object.entries(progress).filter(([,p]) => p.lastCorrect === false).map(([id]) => id); }
  function formatTime(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0');
  }
  return {shuffle, createSession, validSession, score, applyResult, wrongIds, formatTime};
});
