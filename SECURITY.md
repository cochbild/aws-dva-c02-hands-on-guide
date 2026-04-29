# Security Policy

## Reporting a vulnerability

If you find a security issue in any of the lab code, templates, or scripts in this repo, please **do not open a public GitHub issue**.

Instead, email **dalecochran1968@gmail.com** with:

- A description of the issue
- The file(s) and line(s) involved
- Steps to reproduce, if applicable
- Any suggested mitigation

You can expect an acknowledgement within a few days. Once the issue is confirmed and fixed, it will be disclosed in the repo's release notes.

## Scope

This is an educational lab repo. The "security surface" is mostly:

- IaC templates (CloudFormation / SAM) that grant IAM permissions
- Sample Lambda code that handles untrusted input
- Shell scripts (`cleanup.sh`, `cleanup-all.sh`) that issue AWS CLI commands

Issues in those areas are in scope. General AWS service vulnerabilities should be reported directly to AWS via [aws.amazon.com/security/vulnerability-reporting](https://aws.amazon.com/security/vulnerability-reporting/).

## What this repo is not

These labs are designed for **personal/sandbox AWS accounts**. Do not deploy them to a shared or production account. Several labs intentionally use permissive IAM policies for teaching purposes — read each lab's `template.yaml` before deploying.
