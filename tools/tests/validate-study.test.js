const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validateStudy } = require("../validate-study.js");

const FIXTURE = path.join(__dirname, "fixtures", "study");

function withStudy(edit, check) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "study-"));
  try {
    fs.cpSync(FIXTURE, dir, { recursive: true });
    edit({
      replace(file, from, to) {
        const full = path.join(dir, file);
        const text = fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
        assert.ok(text.includes(from), `fixture edit missing in ${file}: ${from}`);
        fs.writeFileSync(full, text.replace(from, to));
      },
      remove(file) {
        fs.rmSync(path.join(dir, file));
      },
    });
    check(validateStudy(dir), dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function assertError(result, ...needles) {
  assert.ok(
    result.errors.some((e) => needles.every((n) => e.includes(n))),
    `no error with ${needles.join(" + ")} in:\n${result.errors.join("\n")}`
  );
}

test("valid fixture has no errors and correct stats", () => {
  const result = validateStudy(FIXTURE);
  assert.deepStrictEqual(result.errors, []);
  assert.strictEqual(result.stats.sets, 2);
  assert.strictEqual(result.stats.questions, 8);
  assert.deepStrictEqual(result.stats.byDomain, { 1: 2, 2: 2, 3: 2, 4: 2 });
});

test("duplicate set id is reported", () => {
  withStudy(
    (s) => s.replace("registry.js", 'id: "s02-beta"', 'id: "s01-alpha"'),
    (r) => assertError(r, "s01-alpha", "duplicate")
  );
});

test("duplicate topic id across sets is reported", () => {
  withStudy(
    (s) => s.replace("registry.js", 'id: "beta-one"', 'id: "alpha-one"'),
    (r) => assertError(r, "alpha-one", "duplicate")
  );
});

test("duplicate question id across sets is reported", () => {
  withStudy(
    (s) => s.replace("sets/s02-beta/questions.js", 'id: "s02-001"', 'id: "s01-001"'),
    (r) => assertError(r, "s01-001", "duplicate")
  );
});

test("bank for a set missing from the registry is reported", () => {
  withStudy(
    (s) => s.replace("sets/s02-beta/questions.js", 'setId: "s02-beta"', 'setId: "s09-ghost"'),
    (r) => assertError(r, "s09-ghost")
  );
});

test("registry set without a bank is reported", () => {
  withStudy(
    (s) => s.remove("sets/s02-beta/questions.js"),
    (r) => assertError(r, "s02-beta", "bank")
  );
});

test("registry set without sheet.html is reported", () => {
  withStudy(
    (s) => s.remove("sets/s02-beta/sheet.html"),
    (r) => assertError(r, "s02-beta", "sheet.html")
  );
});

test("a set does not need quiz.html", () => {
  withStudy(
    () => {},
    (r) => assert.deepStrictEqual(r.errors, [])
  );
});

test("question topic outside its set is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", 'id: "s01-001", topic: "alpha-one"', 'id: "s01-001", topic: "beta-one"'),
    (r) => assertError(r, "s01-001", "beta-one")
  );
});

test("topic without an id in sheet.html is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/sheet.html", 'id="alpha-two"', 'id="other"'),
    (r) => assertError(r, "alpha-two", "sheet.html")
  );
});

test("topic id with single quotes in sheet.html is accepted", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/sheet.html", 'id="alpha-two"', "id='alpha-two'"),
    (r) => assert.deepStrictEqual(r.errors, [])
  );
});

test("topic with fewer than 2 questions is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", 'id: "s01-003", topic: "alpha-two"', 'id: "s01-003", topic: "alpha-one"'),
    (r) => assertError(r, "alpha-two", "at least 2")
  );
});

test("domain outside 1 to 4 is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", 'id: "s01-001", topic: "alpha-one", domain: 1', 'id: "s01-001", topic: "alpha-one", domain: 5'),
    (r) => assertError(r, "s01-001", "domain")
  );
});

test("fewer than 4 options is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", '      { text: "Option 3", correct: false, why: "Reason 3." },\n      ],\n      explanation: "Rule tested by s01-001."', '      ],\n      explanation: "Rule tested by s01-001."'),
    (r) => assertError(r, "s01-001", "options")
  );
});

test("question with no correct option is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", '{ text: "Option 0", correct: true, why: "Reason 0." },', '{ text: "Option 0", correct: false, why: "Reason 0." },'),
    (r) => assertError(r, "s01-001", "correct")
  );
});

test("option with empty text is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", '{ text: "Option 1", correct: false, why: "Reason 1." }', '{ text: "", correct: false, why: "Reason 1." }'),
    (r) => assertError(r, "s01-001", "text")
  );
});

test("option with empty why is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", '{ text: "Option 1", correct: false, why: "Reason 1." }', '{ text: "Option 1", correct: false, why: "" }'),
    (r) => assertError(r, "s01-001", "why")
  );
});

test("empty explanation is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", 'explanation: "Rule tested by s01-001."', 'explanation: ""'),
    (r) => assertError(r, "s01-001", "explanation")
  );
});

test("two correct options with a wrong Choose count is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", "(Choose two.)", "(Choose three.)"),
    (r) => assertError(r, "s01-002", "Choose")
  );
});

test("two correct options without a Choose phrase is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", " (Choose two.)", ""),
    (r) => assertError(r, "s01-002", "Choose")
  );
});

test("one correct option with a Choose phrase is reported", () => {
  withStudy(
    (s) => s.replace("sets/s01-alpha/questions.js", 'stem: "Which solution will meet these requirements?",\n      options: [\n      { text: "Option 0", correct: true', 'stem: "Which solution will meet these requirements? (Choose two.)",\n      options: [\n      { text: "Option 0", correct: true'),
    (r) => assertError(r, "s01-001", "Choose")
  );
});

const { examCapacityErrors } = require("../validate-study.js");

test("exam capacity check reports a domain with 5 of 12 questions", () => {
  const errors = examCapacityErrors({ 1: 30, 2: 20, 3: 20, 4: 5 });
  assert.strictEqual(errors.length, 1);
  assert.ok(errors[0].includes("Domain 4") && errors[0].includes("5") && errors[0].includes("12"), errors[0]);
  assert.deepStrictEqual(examCapacityErrors({ 1: 21, 2: 17, 3: 15, 4: 12 }), []);
});

test("exam capacity check reports a fixture with 5 domain-4 questions only with the exam option", () => {
  withStudy(
    (s) => {
      for (let n = 5; n <= 7; n++) {
        const id = "s01-" + String(n).padStart(3, "0");
        s.replace("sets/s01-alpha/questions.js", "\n] });", `
    { id: "${id}", topic: "alpha-two", domain: 4,
      stem: "Which solution will meet these requirements?",
      options: [
      { text: "Option 0", correct: true, why: "Reason 0." },
      { text: "Option 1", correct: false, why: "Reason 1." },
      { text: "Option 2", correct: false, why: "Reason 2." },
      { text: "Option 3", correct: false, why: "Reason 3." },
      ],
      explanation: "Rule tested by ${id}." },
] });`);
      }
    },
    (r, dir) => {
      assert.deepStrictEqual(r.errors, []);
      assert.strictEqual(r.stats.byDomain[4], 5);
      assertError(validateStudy(dir, { exam: true }), "Domain 4", "5", "12");
    }
  );
});
