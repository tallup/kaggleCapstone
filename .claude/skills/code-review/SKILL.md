---
name: code-review
description: Review code changes for bugs, performance issues, security vulnerabilities, and best practices
user_invocable: true
---

# Code Review Skill

When invoked, perform a thorough code review of the current changes (or specified files/PR).

## Steps

1. **Gather context**: Run `git diff` (unstaged) and `git diff --cached` (staged) to see all current changes. If the user provides a PR number, use `gh pr diff <number>` instead.

2. **Review each changed file** for:
   - **Bugs**: Logic errors, off-by-one errors, null/undefined access, race conditions, missing error handling at system boundaries
   - **Performance**: N+1 queries, unnecessary re-renders, missing indexes, loading full collections when aggregates suffice, missing pagination
   - **Security**: SQL injection, XSS, command injection, insecure deserialization, hardcoded secrets, missing auth checks
   - **Laravel-specific**: Missing eager loading, global scope issues, missing validation on request input, unsafe mass assignment
   - **React-specific**: Missing dependency arrays in hooks, stale closures, missing keys in lists, unnecessary state, prop drilling that should be context
   - **Code quality**: Dead code, duplicated logic, overly complex conditionals, unclear naming, missing types on public interfaces

3. **Rate severity** of each finding:
   - **CRITICAL**: Will cause bugs, data loss, or security vulnerabilities in production
   - **HIGH**: Performance issues or logic errors that affect user experience
   - **MEDIUM**: Code quality issues that increase maintenance burden
   - **LOW**: Style suggestions, minor improvements

4. **Output format**: Present findings grouped by file, with:
   - File path and line number
   - Severity tag
   - Clear description of the issue
   - Suggested fix (code snippet when helpful)

5. **Summary**: End with a brief verdict:
   - Total findings by severity
   - Whether the changes are safe to merge or need fixes first
   - Top 1-3 most important items to address

## Guidelines
- Focus on what matters. Don't nitpick formatting or style if there are real bugs.
- Be specific. "This might cause issues" is not helpful. "This query inside a foreach on line 45 causes N+1; use eager loading" is.
- If the changes look good, say so. Don't manufacture issues.
- Consider the broader context of the Evergreen app (Laravel 12 + React 19 + Filament, multi-tenant care home system).
