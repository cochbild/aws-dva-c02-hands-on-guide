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

  function isHistoryEntry(e) {
    return e !== null && typeof e === "object" && typeof e.q === "string" && typeof e.topic === "string" &&
      typeof e.ok === "boolean" && typeof e.t === "number" &&
      (e.src === undefined || typeof e.src === "string");
  }

  function loadHistory() {
    try {
      const data = JSON.parse(storage().getItem(STORAGE_KEY));
      return Array.isArray(data) ? data.filter(isHistoryEntry) : [];
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

  function historyEntries(scoreResult, setIdOf, now, src) {
    return scoreResult.results.map((r) => {
      const entry = { q: r.question.id, set: setIdOf(r.question.id), topic: r.question.topic, ok: r.ok, t: now };
      if (src) entry.src = src;
      return entry;
    });
  }

  function studySets() {
    return root.STUDY_SETS || [];
  }

  function allQuestions() {
    return (root.QUESTION_BANKS || []).flatMap((bank) =>
      bank.questions.map((q) => Object.assign({}, q, { setId: bank.setId })));
  }

  function setById(id) {
    return studySets().find((s) => s.id === id) || null;
  }

  function topicById(id) {
    for (const set of studySets()) {
      const topic = set.topics.find((t) => t.id === id);
      if (topic) return { set, topic };
    }
    return null;
  }

  // Display position -> original option index. Answers keep original indexes.
  function optionOrder(question, rng = Math.random) {
    return shuffle(question.options.map((_, i) => i), rng);
  }

  function unansweredNumbers(questions, answers) {
    const out = [];
    questions.forEach((q, i) => { if (!(answers[q.id] || []).length) out.push(i + 1); });
    return out;
  }

  function latestSetScore(history, setId) {
    const entries = history.filter((e) => e.set === setId && (e.src === undefined || e.src === "set"));
    if (!entries.length) return null;
    const t = Math.max(...entries.map((e) => e.t));
    const latest = entries.filter((e) => e.t === t);
    return { correct: latest.filter((e) => e.ok).length, total: latest.length, t };
  }

  // ---- Rendering (browser only). Data text goes in as text nodes, never as HTML.

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const child of children) if (child != null) node.append(child);
    return node;
  }

  function button(label, onclick) {
    return el("button", { type: "button", onclick }, label);
  }

  function homeLink() {
    return el("a", { href: "#home" }, "Home");
  }

  function show(container, ...nodes) {
    container.replaceChildren(...nodes);
    window.scrollTo(0, 0);
    container.tabIndex = -1;
    container.focus();
  }

  function message(container, text) {
    show(container, el("p", {}, text), el("p", {}, homeLink()));
  }

  function percent(correct, total) {
    return (total ? Math.round((100 * correct) / total) : 0) + "%";
  }

  function topicLink(topicId) {
    const found = topicById(topicId);
    if (!found) return topicId;
    return el("a", { href: found.set.path + "sheet.html#" + topicId }, found.topic.title);
  }

  function table(headers, rows) {
    return el("table", {},
      el("thead", {}, el("tr", {}, ...headers.map((h) => el("th", {}, h)))),
      el("tbody", {}, ...rows.map((cells) => el("tr", {}, ...cells.map((c) => el("td", {}, c))))));
  }

  function renderQuiz(container, questions, opts) {
    const form = el("form", { className: "quiz", noValidate: true });
    questions.forEach((q, n) => {
      const correctCount = q.options.filter((o) => o.correct).length;
      const multi = correctCount > 1;
      const card = el("fieldset", { className: "card" },
        el("legend", {}, "Question " + (n + 1) + " of " + questions.length),
        el("p", { className: "stem" }, q.stem),
        multi ? el("p", { className: "hint" }, "Select " + correctCount + " answers.") : null);
      for (const i of optionOrder(q)) {
        card.append(el("label", { className: "option" },
          el("input", { type: multi ? "checkbox" : "radio", name: q.id, value: String(i) }),
          el("span", {}, q.options[i].text)));
      }
      form.append(card);
    });
    const notice = el("p", { className: "notice", hidden: true });
    notice.setAttribute("role", "status");
    const submit = el("button", { type: "submit" }, "Submit");
    form.append(notice, submit);

    let pending = null;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const answers = {};
      for (const input of form.querySelectorAll("input:checked")) {
        (answers[input.name] = answers[input.name] || []).push(Number(input.value));
      }
      const missing = unansweredNumbers(questions, answers);
      if (missing.length && pending !== missing.join(",")) {
        pending = missing.join(",");
        notice.textContent = "Unanswered questions: " + missing.join(", ") +
          ". Unanswered questions count as wrong. Select \"Submit anyway\" to finish.";
        notice.hidden = false;
        submit.textContent = "Submit anyway";
        return;
      }
      opts.onSubmit(answers);
    });
    show(container, el("h1", {}, opts.title), form);
  }

  function renderResults(container, score, opts) {
    const ratio = (cell) => cell.correct / cell.total;
    const actions = () => el("p", { className: "actions" },
      button("Retake", opts.onRetake), el("a", { href: "#home", className: "button" }, "Home"));
    const nodes = [
      el("h1", {}, opts.title || "Results"),
      el("p", { className: "total" },
        "Score: " + score.correct + " of " + score.total + " (" + percent(score.correct, score.total) + ")"),
    ];
    if (opts.notice) nodes.push(el("p", { className: "notice" }, opts.notice));

    const topics = Object.keys(score.byTopic).sort((a, b) => ratio(score.byTopic[a]) - ratio(score.byTopic[b]));
    nodes.push(el("h2", {}, "By topic"), table(["Topic", "Correct", "Accuracy"], topics.map((id) => {
      const cell = score.byTopic[id];
      return [topicLink(id), cell.correct + " of " + cell.total, percent(cell.correct, cell.total)];
    })));
    if (opts.showDomains) {
      nodes.push(el("h2", {}, "By domain"), table(["Domain", "Correct", "Accuracy"],
        Object.keys(score.byDomain).sort().map((d) => {
          const cell = score.byDomain[d];
          return ["Domain " + d, cell.correct + " of " + cell.total, percent(cell.correct, cell.total)];
        })));
    }
    nodes.push(actions(), el("h2", {}, "Review"));

    score.results.forEach(({ question, selected, ok }, n) => {
      const chosen = new Set(selected);
      const status = ok ? "✓ Correct" : selected.length ? "✗ Incorrect" : "✗ Unanswered (counted as wrong)";
      const list = el("ul", { className: "review-options" });
      question.options.forEach((o, i) => {
        const marks = [];
        if (o.correct) marks.push("Correct answer");
        if (chosen.has(i)) marks.push("Your answer");
        list.append(el("li", { className: o.correct ? "is-correct" : chosen.has(i) ? "is-wrong" : "" },
          marks.length ? el("strong", { className: "mark" }, marks.join(", ") + ": ") : null,
          o.text,
          el("span", { className: "why" }, o.why)));
      });
      nodes.push(el("article", { className: "card result " + (ok ? "ok" : "bad") },
        el("h3", {}, (n + 1) + ". " + status),
        el("p", { className: "stem" }, question.stem),
        list,
        el("p", { className: "explanation" }, el("strong", {}, "Explanation: "), question.explanation),
        el("p", { className: "topic" }, "Topic: ", topicLink(question.topic))));
    });
    nodes.push(actions());
    show(container, ...nodes);
  }

  // Asks the questions, scores them, saves the attempt and shows the results.
  function runQuiz(container, picked, opts) {
    const questions = shuffle(picked);
    renderQuiz(container, questions, {
      title: opts.title,
      onSubmit(answers) {
        const score = scoreAttempt(questions, answers);
        const setIdOf = (id) => questions.find((q) => q.id === id).setId;
        const saved = appendHistory(historyEntries(score, setIdOf, Date.now(), opts.src));
        renderResults(container, score, {
          title: opts.resultsTitle,
          notice: saved ? "" : "Progress is not saved in this browser.",
          onRetake: opts.onRetake,
        });
      },
    });
  }

  function mountSetQuiz(setId, container) {
    const set = setById(setId);
    if (!set) return message(container, "Set not found.");
    const bank = allQuestions().filter((q) => q.setId === setId);
    if (!bank.length) return message(container, set.title + ": no questions yet.");

    function start(picked) {
      runQuiz(container, picked, {
        title: set.title + " quiz",
        resultsTitle: set.title + " results",
        src: "set",
        onRetake: () => mountSetQuiz(setId, container),
      });
    }

    show(container,
      el("h1", {}, set.title + " quiz"),
      el("p", {}, "The question bank has " + bank.length + " questions."),
      el("p", { className: "actions" },
        button("Start " + Math.min(15, bank.length) + "-question quiz", () => start(pickBalanced(bank, 15))),
        button("Full bank (" + bank.length + " questions)", () => start(bank))),
      el("p", {}, el("a", { href: set.path + "sheet.html" }, "Study sheet"), " · ", homeLink()));
  }

  function mountWeakQuiz(container) {
    const stats = topicStats(loadHistory());
    const weak = weakTopics(stats);
    if (!weak.length) return message(container, "No weak topics yet. Take a set quiz first.");
    const picked = pickWeak(allQuestions(), loadHistory(), 15);
    if (!picked.length) return message(container, "The weak topics have no questions yet.");

    const rows = weak.map((id) => {
      const found = topicById(id);
      return [topicLink(id), found ? found.set.title : "", Math.round(stats[id].accuracy * 100) + "%"];
    });
    show(container,
      el("h1", {}, "Weak topics quiz"),
      el("p", {}, "This quiz uses " + picked.length + " questions from your weak topics."),
      table(["Topic", "Set", "Accuracy"], rows),
      el("p", { className: "actions" },
        button("Start " + picked.length + "-question quiz", () => runQuiz(container, picked, {
          title: "Weak topics quiz",
          resultsTitle: "Weak topics results",
          src: "weak",
          onRetake: () => mountWeakQuiz(container),
        }))),
      el("p", {}, homeLink()));
  }

  function mountHome(container) {
    const history = loadHistory();
    const bankSize = {};
    for (const q of allQuestions()) bankSize[q.setId] = (bankSize[q.setId] || 0) + 1;

    const setRows = studySets().map((set) => {
      const latest = latestSetScore(history, set.id);
      const links = el("span", { className: "links" }, el("a", { href: set.path + "sheet.html" }, "Study sheet"));
      if (bankSize[set.id]) links.append(" · ", el("a", { href: "#quiz/" + set.id }, "Quiz"));
      return [
        set.title,
        set.kind,
        bankSize[set.id] ? String(bankSize[set.id]) : "no questions yet",
        latest ? latest.correct + " of " + latest.total + " (" + percent(latest.correct, latest.total) + ")" : "not tested",
        links,
      ];
    });

    const stats = topicStats(history);
    const weak = weakTopics(stats);
    const weakList = weak.length
      ? el("ol", {}, ...weak.map((id) => el("li", {}, topicLink(id),
        " — " + Math.round(stats[id].accuracy * 100) + "% correct in the last " + stats[id].count + " answers")))
      : el("p", {}, "No weak topics.");
    const topicIds = studySets().flatMap((s) => s.topics.map((t) => t.id));
    const notTested = topicIds.filter((id) => !stats[id]).length;

    const resetArea = el("div", { className: "reset" });
    function showReset() {
      resetArea.replaceChildren(button("Reset progress", askReset));
    }
    function askReset() {
      resetArea.replaceChildren(
        el("p", {}, "Delete all saved quiz results? You cannot undo this."),
        el("p", { className: "actions" },
          button("Yes, delete", () => {
            if (resetHistory()) mountHome(container);
            else resetArea.replaceChildren(el("p", { className: "notice" }, "Progress could not be reset in this browser."));
          }),
          button("Cancel", showReset)));
    }
    showReset();

    show(container,
      el("h1", {}, "DVA-C02 study sheets and quizzes"),
      el("p", {}, "Read a study sheet, then take its quiz. Results are saved in this browser only."),
      el("h2", {}, "Sets"),
      table(["Set", "Kind", "Questions", "Latest score", "Links"], setRows),
      el("h2", {}, "Weak topics"),
      el("p", {}, "A topic is weak when fewer than 80% of its last 5 answers are correct."),
      weakList,
      weak.length ? el("p", {}, el("a", { href: "#weak" }, "Take a weak-topics quiz")) : null,
      el("p", {}, notTested + " of " + topicIds.length + " topics not tested."),
      el("h2", {}, "Progress"),
      resetArea);
  }

  function mountApp(container) {
    function route() {
      const hash = location.hash.slice(1);
      if (hash === "" || hash === "home") return mountHome(container);
      if (hash.startsWith("quiz/")) return mountSetQuiz(hash.slice(5), container);
      if (hash === "weak" || hash === "exam") {
        const mount = hash === "weak" ? api.mountWeakQuiz : api.mountExam;
        return mount ? mount(container) : message(container, "Not available yet.");
      }
      message(container, "Page not found.");
    }
    window.addEventListener("hashchange", route);
    route();
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
    allQuestions,
    setById,
    topicById,
    optionOrder,
    unansweredNumbers,
    latestSetScore,
    renderQuiz,
    renderResults,
    mountSetQuiz,
    mountWeakQuiz,
    mountHome,
    mountApp,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.StudyQuiz = api;
})(typeof window !== "undefined" ? window : globalThis);
