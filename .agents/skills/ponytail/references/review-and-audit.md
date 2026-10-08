# Ponytail Review, Audit & Debt Workflows

This document details the diagnostic and verification workflows from the Ponytail framework.

---

## 1. Ponytail Review (`/ponytail-review`)

Review a change like the senior developer who will be paged when it breaks.
**Order of importance:** Correct > Safe > Holds under load > Tested > Fast > Lean.

### 1. Understand First
- Review what the user names: uncommitted/staged changes, a branch, a PR link, or files. (Default: uncommitted changes or the last commit).
- Read the diff, then the code it touches: callers of every changed function, functions called, tests, and README.
- Trace the real flow: where data enters, what is stored, what exits.
- When a signature, return value, or behavior changes, grep every caller.
- Determine expected load (single user, background script, or multi-tenant concurrent traffic) and declare it.

### 2. Look For
1. **Bug:** Wrong result, crash, missed edge cases (empty, zero, last item, rounding, time zones), caller broken by change, fix applied in one caller while shared function stays broken.
2. **Risk:** Security vulnerabilities (injection, weak randomness, hardcoded secrets, unsanitized user input), data loss (swallowed errors, out-of-order writes, missing transactions).
3. **Scale:** Check-then-write races, redundant work across processes, unbounded memory/lists, N+1 queries, $O(n^2)$ bottlenecks on large input.
4. **Missing Test:** Risky new logic (branch, parser, monetary calculations, auth/security, writes) with no failing test when broken. One good test beats arbitrary coverage percentages.
5. **Speed:** Real slowdowns are problems. Minor wins in hot loops are suggestions.
6. **Lean:**
   - **Delete:** Dead code, unused options, speculative features.
   - **Reuse:** Codebase already has this helper (name the path).
   - **Stdlib/Native:** Platform already does it; avoid adding a dependency for trivial utility code.
   - **YAGNI:** Interface with 1 implementation, unused config flags.
   - **Merge:** Near-copies that must change together.
   - **Split:** Functions mixing unrelated responsibilities (split by job, never by line count alone).

### 3. Check Before Reporting
- Every finding needs a concrete failure case: *"this input or situation leads to this wrong result"*. No case = no finding.
- Re-read lines and confirm caller existence, nullability, and usage before claiming dead code.
- A shortcut marked `// ponytail:` with a stated ceiling is an intentional decision, not a finding (unless expected load already crosses it).
- Propose the smallest fix that works (preferring deletions).
- No subjective style nitpicks or vague hand-waving.

### 4. Report Format
```markdown
What this change does: [2-3 sentences]

### Must Fix
1. **[Issue Title]** (`path/to/file.ext:L10-25`)
   - **What this is:** [1-2 sentences]
   - **Problem:** [Concrete failure case]
   - **Fix:** [Minimal code or deletion]
   - **If we skip it:** [Consequence]

### Should Fix
...

### Nice to Have
...

Verdict: Ship. (or: Verdict: Fix 1 and 3 first.)
Lean: -N lines possible.
Not checked: [Parts not read or unverified]
```

---

## 2. Ponytail Audit (`/ponytail-audit`)

Audit an entire codebase like the senior developer who just inherited it.
One-shot report, changes no code.

### 1. Map First
- Determine scope (folder, package, or whole repo).
- Review README, build/deploy config, dependencies, entry points (routes, CLI, jobs), and test suite.
- Identify assumed load.
- Trace primary critical flows end-to-end: input, auth, money, persistence, background jobs.

### 2. Inspect Categories
Apply the 6 inspection criteria: Bug, Risk, Scale, Missing Test, Speed, and Lean.
Rank findings across:
- **Must Fix:** Bugs, vulnerabilities, data loss, concurrency failures.
- **Should Fix:** Risky untested code, real bottlenecks, duplication, bloat.
- **Nice to Have:** Minor speed-ups, cleaner idioms.

Cap at 20 findings max. Every finding must include:
- What this is
- Concrete problem
- Minimal fix
- Risk if skipped

---

## 3. Ponytail Debt Ledger (`/ponytail-debt`)

Tracks intentional shortcuts marked with the Ponytail convention so deferrals don't rot into permanent technical debt.

### Comment Convention
```typescript
// ponytail: <ceiling>, <upgrade path>
// Example:
// ponytail: single-server in-memory store; migrate to Redis when clustering
```

### Scan Command
```bash
grep -rnE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build '(#|//|/[*]) ?ponytail:' .
```

### Ledger Output Format
`<file>:<line>, <what was simplified>. ceiling: <limit named>. upgrade: <trigger to revisit>.`

- Tag any marker missing a trigger with `[no-trigger]` to highlight rot risk.
- Finish with: `<N> markers, <M> with no trigger.` or `No ponytail: debt. Clean ledger.`
