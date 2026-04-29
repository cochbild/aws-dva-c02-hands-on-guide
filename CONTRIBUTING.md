# Contributing

Thanks for your interest in improving these labs. This is a personal study/teaching repo, so contributions are welcome but kept lightweight.

## What's in scope

Good contributions:

- **Bug fixes** — a template that won't deploy, a script that fails, broken instructions
- **Exam-accuracy fixes** — a fact in a README that's wrong or out of date with the current DVA-C02 blueprint
- **New labs in already-stubbed modules** (Modules 3–10 are partially stubbed)
- **Cost / cleanup improvements** — anything that makes a lab cheaper or safer to tear down

Out of scope (please don't open PRs for these):

- Style-only refactors
- Switching IaC tooling (the repo uses SAM by design)
- Adding lab content for non-DVA-C02 services

If you're unsure, open an issue first to discuss.

## Workflow

1. **Fork** the repo on GitHub
2. **Branch** from `main` with a descriptive name (e.g., `fix/lab-1-3-alias-typo`, `feature/module-5-lab-3-fifo`)
3. **Test** your change against a real AWS account — every lab must `sam build && sam deploy` cleanly and `cleanup.sh` must remove everything
4. **Commit** with a clear message (see below)
5. **Open a PR** against `main`

## Commit messages

Short, present-tense, and specific:

```
fix: lab-1-3 alias weight syntax in template.yaml
docs: clarify cold-start vs init-phase in module-1 README
feat: add lab-5-3 FIFO queue with deduplication
```

## Lab conventions

If you're adding or editing a lab, match what's in Module 1 / Module 2:

- Folder: `module-XX-name/lab-YY-name/`
- Files: `README.md`, `template.yaml`, `src/`, `cleanup.sh`
- Resource names prefixed `dva-` so `cleanup-all.sh` can sweep them
- Region defaults to `us-east-1`, overridable via `AWS_REGION`
- Python runtime: `python3.12`
- Free-tier-friendly; if a resource costs money, call it out in the lab README

## Testing your PR

Before opening a PR, run:

```bash
cd module-XX-name/lab-YY-name
sam build
sam deploy --guided
# follow the testing steps in README.md
./cleanup.sh
```

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
