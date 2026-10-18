(function (root) {
  "use strict";

  const STORAGE_KEY = "dva-study-history-v1";
  const DOMAIN_WEIGHTS = { 1: 0.32, 2: 0.26, 3: 0.24, 4: 0.18 };

  function shuffle(arr, rng = Math.random) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function groupBy(list, keyOf) {
    const groups = new Map();
    for (const item of list) {
      const key = keyOf(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return groups;
  }

  function pickBalanced(questions, count, rng = Math.random) {
    const queues = shuffle([...groupBy(questions, (q) => q.topic).values()], rng).map((g) => shuffle(g, rng));
    const target = Math.min(count, questions.length);
    const picked = [];
    while (picked.length < target) {
      for (const queue of queues) {
        if (picked.length === target) break;
        if (queue.length) picked.push(queue.pop());
      }
    }
    return picked;
  }

  function isCorrect(question, selected) {
    const correct = [];
    question.options.forEach((o, i) => { if (o.correct) correct.push(i); });
    const chosen = new Set(selected);
    return chosen.size === correct.length && correct.every((i) => chosen.has(i));
  }

  function tally(bucket, key, ok) {
    const cell = bucket[key] || (bucket[key] = { correct: 0, total: 0 });
    cell.total++;
    if (ok) cell.correct++;
  }

  function scoreAttempt(questions, answers) {
    const out = { correct: 0, total: questions.length, byTopic: {}, byDomain: {}, results: [] };
    for (const question of questions) {
      const selected = answers[question.id] || [];
      const ok = isCorrect(question, selected);
      if (ok) out.correct++;
      tally(out.byTopic, question.topic, ok);
      tally(out.byDomain, question.domain, ok);
      out.results.push({ question, selected, ok });
    }
    return out;
  }

  function topicStats(history, n = 5) {
    const stats = {};
    for (const [topic, entries] of groupBy(history, (e) => e.topic)) {
      const recent = entries.slice().sort((a, b) => b.t - a.t).slice(0, n);
      stats[topic] = { accuracy: recent.filter((e) => e.ok).length / recent.length, count: recent.length };
    }
    return stats;
  }

  function weakTopics(stats, threshold = 0.8) {
    return Object.keys(stats)
      .filter((topic) => stats[topic].accuracy < threshold)
      .sort((a, b) => stats[a].accuracy - stats[b].accuracy);
  }

  function pickWeak(allQuestions, history, count = 15, rng = Math.random) {
    const weak = new Set(weakTopics(topicStats(history)));
    const lastAnswer = {};
    for (const e of history.slice().sort((a, b) => a.t - b.t)) lastAnswer[e.q] = e.ok;
    const tiers = [[], [], []];
    for (const q of allQuestions) {
      if (!weak.has(q.topic)) continue;
      const last = lastAnswer[q.id];
      tiers[last === false ? 0 : last === undefined ? 1 : 2].push(q);
    }
    return tiers.flatMap((tier) => shuffle(tier, rng)).slice(0, count);
  }

  function domainQuotas(count, weights) {
    const domains = Object.keys(weights);
    const quotas = {};
    let assigned = 0;
    for (const d of domains) {
      quotas[d] = Math.floor(count * weights[d]);
      assigned += quotas[d];
    }
    const byFraction = domains.slice().sort((a, b) => (count * weights[b] % 1) - (count * weights[a] % 1));
    for (let i = 0; assigned < count && byFraction.length; i++, assigned++) {
      quotas[byFraction[i % byFraction.length]]++;
    }
    return quotas;
  }

  function pickExam(allQuestions, count = 65, weights = DOMAIN_WEIGHTS, rng = Math.random) {
    const quotas = domainQuotas(count, weights);
    const byDomain = groupBy(allQuestions, (q) => String(q.domain));
    const picked = [];
    for (const d of Object.keys(quotas)) {
      picked.push(...pickBalanced(byDomain.get(d) || [], quotas[d], rng));
    }
    if (picked.length < count) {
      const taken = new Set(picked);
      const rest = allQuestions.filter((q) => !taken.has(q));
      picked.push(...pickBalanced(rest, count - picked.length, rng));
    }
    return picked;
  }

  function storage() {
    return globalThis.localStorage;
  }

  function loadHistory() {
    try {
      const data = JSON.parse(storage().getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function appendHistory(entries) {
    try {
      storage().setItem(STORAGE_KEY, JSON.stringify(loadHistory().concat(entries)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function resetHistory() {
    try {
      storage().removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function historyEntries(scoreResult, setIdOf, now) {
    return scoreResult.results.map((r) => ({
      q: r.question.id,
      set: setIdOf(r.question.id),
      topic: r.question.topic,
      ok: r.ok,
      t: now,
    }));
  }

  const api = {
    STORAGE_KEY,
    DOMAIN_WEIGHTS,
    shuffle,
    pickBalanced,
    isCorrect,
    scoreAttempt,
    topicStats,
    weakTopics,
    pickWeak,
    pickExam,
    loadHistory,
    appendHistory,
    resetHistory,
    historyEntries,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.StudyQuiz = api;
})(typeof window !== "undefined" ? window : globalThis);
