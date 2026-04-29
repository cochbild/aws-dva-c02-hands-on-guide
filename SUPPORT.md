# Support

Need help with a lab? Here's where to look first.

## Lab-specific issues

Each lab folder has a `README.md` with the full theory, deploy steps, testing steps, and a "common gotchas" section. Re-read that carefully before reporting anything — most issues are covered.

## Things to check before opening an issue

1. **AWS credentials** — `aws sts get-caller-identity` returns your account?
2. **Region** — are you deploying to `us-east-1` (or did you override `AWS_REGION` consistently)?
3. **SAM version** — `sam --version` returns `1.x`?
4. **Python version** — `python3.12 --version` works? (Labs target 3.12; 3.11 and 3.13 should also work.)
5. **Stack name collisions** — did you previously deploy this lab and forget to run `cleanup.sh`?
6. **Free-tier exhaustion** — are you within your monthly free-tier limits for the service?
7. **Cleanup** — old lab stacks lingering? Run [`cleanup-all.sh`](cleanup-all.sh) at the repo root.

## Where to ask

- **Bugs in this repo** (template won't deploy, instructions wrong, script broken) — open a [GitHub issue](https://github.com/cochbild/aws-dva-c02-hands-on-guide/issues/new/choose)
- **Feature requests / new lab ideas** — open a GitHub issue using the feature request template
- **Security issues** — see [SECURITY.md](SECURITY.md), do **not** open a public issue
- **General AWS / DVA-C02 exam questions** — these labs aren't a substitute for the official AWS documentation or community forums; try [r/AWSCertifications](https://www.reddit.com/r/AWSCertifications/) or [AWS re:Post](https://repost.aws/)

## Response time

**Best-effort only.** This is a personal teaching repo maintained in spare time and there is no commitment to any response time frame. Issues and PRs may be reviewed when time allows, or not at all. If you need a fix urgently, fork the repo and patch it locally — that's the fastest path.
