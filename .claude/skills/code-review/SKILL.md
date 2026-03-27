---
name: code-review
description: Review a PR or set of changes for code quality, correctness, and team standards. Use when user wants a code review, PR review, asks to review changes, or mentions "review this".
---

# Code Review

Perform a thorough code review on a PR or set of changes, producing actionable feedback organized by severity.

## Process

### 1. Gather the changes

Determine what to review:
- If given a PR number/URL: `gh pr diff <number>` and `gh pr view <number>`
- If reviewing local changes: `git diff` or `git diff <branch>`
- If given specific files: read those files

Also read the PR description or task file for context on intent.

### 2. Understand the context

Before reviewing line-by-line:
- What problem is this solving? (read PR description, linked issues, task files)
- What are the acceptance criteria?
- Which files are test files vs production code?

### 3. Review systematically

Check each area in order of importance:

#### Correctness
- Does the code do what the PR/task says it should?
- Are there logic errors, off-by-ones, missing edge cases?
- Are error conditions handled?
- Could this break existing functionality?

#### Security
- Any user input used without validation/sanitization?
- Secrets or credentials exposed?
- SQL injection, XSS, command injection risks?
- Overly permissive access controls?

#### Scope compliance
- Does the change stay within the stated goal?
- Any "while I'm here" changes that should be separate?
- Speculative features or premature abstractions?

#### Redundancy & reuse
- Does new code duplicate existing utilities?
- Could existing helpers be used instead?
- Are there repeated patterns that should be extracted?

#### Type safety & API design
- Are public interfaces well-typed?
- Are function signatures clear about what they accept and return?
- Any `any` types without justification?

#### Test quality
- Do tests verify behavior through public interfaces?
- Are tests coupled to implementation details?
- Are critical paths covered?
- Do tests read like specifications?

#### Style & consistency
- Does the code follow the patterns established in this repo?
- Naming conventions followed?
- File organization consistent with project structure?

### 4. Present findings

Organize feedback into three categories:

**Must fix** — Issues that should block merge:
- Bugs, security issues, correctness problems
- Breaking changes without migration
- Missing tests for critical paths

**Should fix** — Issues worth addressing but not blocking:
- Minor redundancy or missed reuse opportunities
- Style inconsistencies
- Weak typing that could be stronger

**Nit** — Optional improvements:
- Naming suggestions
- Minor readability improvements
- Alternative approaches to consider

For each finding:
- Reference the specific file and line(s)
- Explain *why* it's an issue (not just *what* to change)
- Suggest a concrete fix when possible

### 5. Summary

End with:
- Overall assessment (approve, request changes, or needs discussion)
- What the PR does well (acknowledge good work)
- The most important 1-2 items to address

## Adapting for team use

When used as part of a team code review workflow:
- Check the repo's `CLAUDE.md` for project-specific standards
- Reference team conventions when flagging issues
- Distinguish between objective issues (bugs) and subjective preferences (style)
- Be explicit about which standards come from the project vs general best practices
