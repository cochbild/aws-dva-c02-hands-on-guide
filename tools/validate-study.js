const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const CHOOSE_WORDS = { 2: "(Choose two.)", 3: "(Choose three.)" };

function loadScript(context, file) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

function loadData(studyDir) {
  const window = {};
  const context = vm.createContext({ window });
  vm.runInContext("globalThis.window = window;", context);
  loadScript(context, path.join(studyDir, "registry.js"));
  const setsDir = path.join(studyDir, "sets");
  if (fs.existsSync(setsDir)) {
    for (const name of fs.readdirSync(setsDir).sort()) {
      const file = path.join(setsDir, name, "questions.js");
      if (fs.existsSync(file)) loadScript(context, file);
    }
  }
  return { sets: window.STUDY_SETS || [], banks: window.QUESTION_BANKS || [] };
}

function checkUnique(errors, kind, ids) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${id}: duplicate ${kind} id`);
    seen.add(id);
  }
}

function checkQuestion(errors, q) {
  const id = q.id;
  if (![1, 2, 3, 4].includes(q.domain)) errors.push(`Question ${id}: domain must be 1, 2, 3, or 4`);
  const options = Array.isArray(q.options) ? q.options : [];
  if (options.length < 4 || options.length > 6) errors.push(`Question ${id}: needs 4 to 6 options, has ${options.length}`);
  options.forEach((o, i) => {
    if (!o.text || !String(o.text).trim()) errors.push(`Question ${id}: option ${i + 1} has empty text`);
    if (!o.why || !String(o.why).trim()) errors.push(`Question ${id}: option ${i + 1} has empty why`);
  });
  if (!q.explanation || !String(q.explanation).trim()) errors.push(`Question ${id}: explanation is empty`);

  const correct = options.filter((o) => o.correct).length;
  const stem = q.stem || "";
  if (correct === 0) {
    errors.push(`Question ${id}: no correct option`);
  } else if (correct === 1) {
    if (stem.includes("(Choose")) errors.push(`Question ${id}: one correct option but the stem has "(Choose"`);
  } else if (!CHOOSE_WORDS[correct] || !stem.includes(CHOOSE_WORDS[correct])) {
    errors.push(`Question ${id}: ${correct} correct options but the stem lacks ${CHOOSE_WORDS[correct] || "a matching (Choose ...) phrase"}`);
  }
}

function validateStudy(studyDir) {
  const errors = [];
  const { sets, banks } = loadData(studyDir);
  const setsById = new Map(sets.map((s) => [s.id, s]));
  const topicSet = new Map();
  for (const s of sets) for (const t of s.topics || []) topicSet.set(t.id, s.id);

  checkUnique(errors, "set", sets.map((s) => s.id));
  checkUnique(errors, "topic", sets.flatMap((s) => (s.topics || []).map((t) => t.id)));
  const questions = banks.flatMap((b) => b.questions || []);
  checkUnique(errors, "question", questions.map((q) => q.id));

  for (const bank of banks) {
    if (!setsById.has(bank.setId)) errors.push(`Bank for unknown set: ${bank.setId}`);
  }

  const topicCounts = new Map();
  const byDomain = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const bank of banks) {
    for (const q of bank.questions || []) {
      if (setsById.has(bank.setId) && topicSet.get(q.topic) !== bank.setId) {
        errors.push(`Question ${q.id}: topic ${q.topic} is not a topic of set ${bank.setId}`);
      }
      topicCounts.set(q.topic, (topicCounts.get(q.topic) || 0) + 1);
      if (byDomain[q.domain] !== undefined) byDomain[q.domain]++;
      checkQuestion(errors, q);
    }
  }

  for (const s of sets) {
    const dir = path.join(studyDir, "sets", s.id);
    if (!banks.some((b) => b.setId === s.id)) errors.push(`Set ${s.id}: no question bank`);
    const sheetFile = path.join(dir, "sheet.html");
    const hasSheet = fs.existsSync(sheetFile);
    if (!hasSheet) errors.push(`Set ${s.id}: missing sheet.html`);
    const sheet = hasSheet ? fs.readFileSync(sheetFile, "utf8") : "";
    for (const t of s.topics || []) {
      if (hasSheet && !sheet.includes(`id="${t.id}"`) && !sheet.includes(`id='${t.id}'`)) {
        errors.push(`Topic ${t.id}: no element with this id in ${s.id}/sheet.html`);
      }
      if ((topicCounts.get(t.id) || 0) < 2) errors.push(`Topic ${t.id}: needs at least 2 questions`);
    }
  }

  return { errors, stats: { sets: sets.length, questions: questions.length, byDomain } };
}

module.exports = { validateStudy };

if (require.main === module) {
  const studyDir = process.argv[2] || "study";
  const { errors, stats } = validateStudy(studyDir);
  for (const e of errors) console.error(e);
  console.log(`Sets: ${stats.sets}, questions: ${stats.questions}, by domain: ${JSON.stringify(stats.byDomain)}`);
  if (errors.length) {
    console.error(`${errors.length} error(s)`);
    process.exit(1);
  }
}
