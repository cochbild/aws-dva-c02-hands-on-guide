const { test } = require("node:test");
const assert = require("node:assert");
const Q = require("../../study/assets/quiz.js");

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeQuestion(id, topic, domain, correctIdx = [0]) {
  return {
    id,
    topic,
    domain,
    stem: "stem " + id,
    options: [0, 1, 2, 3, 4].map((i) => ({ text: "o" + i, correct: correctIdx.includes(i), why: "w" })),
    explanation: "e",
  };
}

function countBy(list, key) {
  const out = {};
  for (const item of list) out[key(item)] = (out[key(item)] || 0) + 1;
  return out;
}

test("shuffle returns a new array with the same items", () => {
  const src = [1, 2, 3, 4, 5, 6];
  const out = Q.shuffle(src, mulberry32(1));
  assert.notStrictEqual(out, src);
  assert.deepStrictEqual([...out].sort(), src);
  assert.deepStrictEqual(src, [1, 2, 3, 4, 5, 6]);
});

test("pickBalanced takes 5 per topic from 3 topics of 10", () => {
  const qs = [];
  for (const t of ["a", "b", "c"]) for (let i = 0; i < 10; i++) qs.push(makeQuestion(t + i, t, 1));
  const picked = Q.pickBalanced(qs, 15, mulberry32(2));
  assert.strictEqual(picked.length, 15);
  assert.deepStrictEqual(countBy(picked, (q) => q.topic), { a: 5, b: 5, c: 5 });
});

test("pickBalanced returns all unique questions when the bank is small", () => {
  const qs = [1, 2, 3, 4].map((i) => makeQuestion("q" + i, "t" + (i % 2), 1));
  const picked = Q.pickBalanced(qs, 15, mulberry32(3));
  assert.strictEqual(picked.length, 4);
  assert.strictEqual(new Set(picked.map((q) => q.id)).size, 4);
});

test("isCorrect needs an exact set match", () => {
  const single = makeQuestion("s", "t", 1, [2]);
  assert.strictEqual(Q.isCorrect(single, [2]), true);
  assert.strictEqual(Q.isCorrect(single, [1]), false);
  const multi = makeQuestion("m", "t", 1, [1, 3]);
  assert.strictEqual(Q.isCorrect(multi, [1, 3]), true);
  assert.strictEqual(Q.isCorrect(multi, [3, 1]), true);
  assert.strictEqual(Q.isCorrect(multi, [1]), false);
  assert.strictEqual(Q.isCorrect(multi, [1, 3, 4]), false);
  assert.strictEqual(Q.isCorrect(multi, []), false);
});

test("scoreAttempt counts unanswered as wrong and sums by topic and domain", () => {
  const qs = [
    makeQuestion("q1", "a", 1, [0]),
    makeQuestion("q2", "a", 2, [1]),
    makeQuestion("q3", "b", 2, [2]),
    makeQuestion("q4", "b", 3, [3]),
  ];
  const r = Q.scoreAttempt(qs, { q1: [0], q2: [0], q3: [2] });
  assert.strictEqual(r.correct, 2);
  assert.strictEqual(r.total, 4);
  assert.deepStrictEqual(r.byTopic, { a: { correct: 1, total: 2 }, b: { correct: 1, total: 2 } });
  assert.deepStrictEqual(r.byDomain, {
    1: { correct: 1, total: 1 },
    2: { correct: 1, total: 2 },
    3: { correct: 0, total: 1 },
  });
  assert.deepStrictEqual(r.results.map((x) => x.ok), [true, false, true, false]);
  assert.deepStrictEqual(r.results[3].selected, []);
  assert.strictEqual(r.results[0].question, qs[0]);
});

test("topicStats uses only the newest n entries per topic", () => {
  const history = [];
  for (let i = 0; i < 7; i++) history.push({ q: "q" + i, set: "s", topic: "a", ok: i >= 2, t: 1000 + i });
  const stats = Q.topicStats(history.reverse());
  assert.deepStrictEqual(stats, { a: { accuracy: 1, count: 5 } });
});

test("weakTopics treats 0.8 as not weak and lists worst first", () => {
  const stats = {
    ok: { accuracy: 0.8, count: 5 },
    low: { accuracy: 0.6, count: 5 },
    worst: { accuracy: 0.2, count: 5 },
  };
  assert.deepStrictEqual(Q.weakTopics(stats), ["worst", "low"]);
});

test("pickWeak returns nothing when no topic is weak", () => {
  const qs = [makeQuestion("q1", "a", 1)];
  const history = [{ q: "q1", set: "s", topic: "a", ok: true, t: 1 }];
  assert.deepStrictEqual(Q.pickWeak(qs, history, 15, mulberry32(4)), []);
  assert.deepStrictEqual(Q.pickWeak(qs, [], 15, mulberry32(4)), []);
});

test("pickWeak prefers missed, then unseen, then right, and skips other topics", () => {
  const qs = [
    makeQuestion("missed", "a", 1),
    makeQuestion("unseen", "a", 1),
    makeQuestion("right", "a", 1),
    makeQuestion("other", "b", 1),
  ];
  const history = [
    { q: "right", set: "s", topic: "a", ok: false, t: 1 },
    { q: "right", set: "s", topic: "a", ok: true, t: 2 },
    { q: "missed", set: "s", topic: "a", ok: true, t: 1 },
    { q: "missed", set: "s", topic: "a", ok: false, t: 3 },
    { q: "other", set: "s", topic: "b", ok: true, t: 4 },
    { q: "other", set: "s", topic: "b", ok: true, t: 5 },
  ];
  const picked = Q.pickWeak(qs, history, 15, mulberry32(5));
  assert.deepStrictEqual(picked.map((q) => q.id), ["missed", "unseen", "right"]);
  assert.deepStrictEqual(Q.pickWeak(qs, history, 2, mulberry32(5)).map((q) => q.id), ["missed", "unseen"]);
});

test("pickExam fills domain quotas of 21/17/15/12", () => {
  const qs = [];
  for (let i = 0; i < 400; i++) qs.push(makeQuestion("q" + i, "t" + (i % 20), (i % 4) + 1));
  const picked = Q.pickExam(qs, 65, Q.DOMAIN_WEIGHTS, mulberry32(6));
  assert.strictEqual(picked.length, 65);
  assert.strictEqual(new Set(picked.map((q) => q.id)).size, 65);
  assert.deepStrictEqual(countBy(picked, (q) => q.domain), { 1: 21, 2: 17, 3: 15, 4: 12 });
});

test("pickExam fills a short domain from the other domains", () => {
  const qs = [];
  for (let i = 0; i < 300; i++) qs.push(makeQuestion("a" + i, "t" + (i % 15), (i % 3) + 1));
  for (let i = 0; i < 5; i++) qs.push(makeQuestion("d" + i, "td", 4));
  const picked = Q.pickExam(qs, 65, undefined, mulberry32(7));
  assert.strictEqual(picked.length, 65);
  assert.strictEqual(new Set(picked.map((q) => q.id)).size, 65);
  assert.strictEqual(picked.filter((q) => q.domain === 4).length, 5);
});

function fakeStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function withStorage(fake, fn) {
  const had = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true, writable: true });
  try {
    fn();
  } finally {
    if (had) Object.defineProperty(globalThis, "localStorage", had);
    else delete globalThis.localStorage;
  }
}

test("storage failures never throw", () => {
  const boom = () => { throw new Error("blocked"); };
  withStorage({ getItem: boom, setItem: boom, removeItem: boom }, () => {
    assert.deepStrictEqual(Q.loadHistory(), []);
    assert.strictEqual(Q.appendHistory([{ q: "x" }]), false);
    assert.strictEqual(Q.resetHistory(), false);
  });
});

test("corrupt or non-array stored JSON loads as an empty history", () => {
  const fake = fakeStorage();
  withStorage(fake, () => {
    fake.setItem(Q.STORAGE_KEY, "{not json");
    assert.deepStrictEqual(Q.loadHistory(), []);
    fake.setItem(Q.STORAGE_KEY, '{"a":1}');
    assert.deepStrictEqual(Q.loadHistory(), []);
  });
});

test("appendHistory and resetHistory round-trip", () => {
  const fake = fakeStorage();
  withStorage(fake, () => {
    const a = { q: "q1", set: "s", topic: "t", ok: true, t: 1 };
    const b = { q: "q2", set: "s", topic: "t", ok: false, t: 2 };
    assert.strictEqual(Q.appendHistory([a]), true);
    assert.strictEqual(Q.appendHistory([b]), true);
    assert.deepStrictEqual(Q.loadHistory(), [a, b]);
    assert.strictEqual(Q.resetHistory(), true);
    assert.deepStrictEqual(Q.loadHistory(), []);
  });
});

test("historyEntries maps each result to a storage entry", () => {
  const qs = [makeQuestion("q1", "a", 1, [0]), makeQuestion("q2", "b", 2, [1])];
  const score = Q.scoreAttempt(qs, { q1: [0] });
  const entries = Q.historyEntries(score, (id) => "set-" + id, 1760000000000);
  assert.deepStrictEqual(entries, [
    { q: "q1", set: "set-q1", topic: "a", ok: true, t: 1760000000000 },
    { q: "q2", set: "set-q2", topic: "b", ok: false, t: 1760000000000 },
  ]);
});
