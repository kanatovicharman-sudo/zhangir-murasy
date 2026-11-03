(function(root) {
  'use strict';
  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function pool(questions, config, stats = {}, bookmarks = []) {
    return questions.filter(q =>
      (config.group === 'all' || q.group === config.group) &&
      (config.points === 'all' || q.points === Number(config.points)) &&
      (config.scope !== 'wrong' || stats[q.id]?.lastCorrect === false) &&
      (config.scope !== 'bookmarks' || bookmarks.includes(q.id))
    );
  }
  function createSession(questions, config, now = Date.now(), random = Math.random) {
    const ordered = config.random ? shuffle(questions, random) : [...questions];
    const chosen = ordered.slice(0, config.count === 'all' ? ordered.length : Number(config.count));
    if (!chosen.length) throw new Error('EMPTY_POOL');
    return {
      version: 1, id: now.toString(36) + '-' + Math.floor(random() * 4294967296).toString(36),
      mode: config.mode,
      entries: chosen.map(q => ({id: q.id, options: shuffle(q.options, random)})),
      answers: {}, index: 0, startedAt: now,
      deadline: config.mode === 'exam' ? now + Number(config.minutes) * 60000 : null,
      finished: false, endedAt: null,
    };
  }
  function score(session, byId) {
    let correct = 0, earned = 0, max = 0, answered = 0;
    const details = session.entries.map(entry => {
      const q = byId[entry.id]; max += q.points;
      const selected = session.answers[entry.id];
      if (selected !== undefined) answered++;
      const isCorrect = selected === q.answer;
      if (isCorrect) { correct++; earned += q.points; }
      return {id: q.id, selected: selected ?? null, correct: isCorrect, points: isCorrect ? q.points : 0};
    });
    return {correct, earned, max, answered, total: session.entries.length,
      percent: max ? Math.round(earned / max * 100) : 0, details};
  }
  function validSession(value, byId) {
    if (!value || value.version !== 1 || typeof value.id !== 'string' || !value.id || !['training','exam'].includes(value.mode) ||
      !Array.isArray(value.entries) || !value.entries.length || value.entries.length > 120 ||
      !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers) ||
      !Number.isInteger(value.index) || value.index < 0 || value.index >= value.entries.length ||
      !Number.isFinite(value.startedAt) || value.startedAt < 0 ||
      typeof value.finished !== 'boolean') return false;
    const ids = new Set();
    for (const entry of value.entries) {
      const q = byId[entry.id];
      if (!q || ids.has(entry.id) || !Array.isArray(entry.options) || entry.options.length !== 4 ||
        new Set(entry.options).size !== 4 || !entry.options.every(o => q.options.includes(o))) return false;
      ids.add(entry.id);
    }
    if (!Object.entries(value.answers).every(([id, answer]) => ids.has(id) && byId[id].options.includes(answer))) return false;
    if (value.mode === 'exam' && (!Number.isFinite(value.deadline) || value.deadline <= value.startedAt)) return false;
    if (value.finished && (!Number.isFinite(value.endedAt) || value.endedAt < value.startedAt)) return false;
    return true;
  }
  function recordResult(progress, session, result, now = Date.now()) {
    if (progress.history.some(h => h.sessionId === session.id)) return progress;
    const stats = {...progress.stats};
    for (const d of result.details) {
      const prev = stats[d.id] || {attempts:0, correct:0};
      stats[d.id] = {attempts: prev.attempts + 1, correct: prev.correct + (d.correct ? 1 : 0), lastCorrect: d.correct, lastSeen: now};
    }
    return {...progress, stats, history: [{sessionId:session.id, startedAt:session.startedAt, at:now, mode:session.mode,
      total:result.total, correct:result.correct, earned:result.earned, max:result.max, percent:result.percent}, ...progress.history].slice(0,20)};
  }
  function remaining(session, now = Date.now()) {
    return session.deadline === null ? null : Math.max(0, Math.ceil((session.deadline - now) / 1000));
  }
  function clock(seconds) {
    return Math.floor(seconds / 60).toString().padStart(2,'0') + ':' + Math.floor(seconds % 60).toString().padStart(2,'0');
  }
  const api = {shuffle, pool, createSession, score, validSession, recordResult, remaining, clock};
  root.QuizCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
