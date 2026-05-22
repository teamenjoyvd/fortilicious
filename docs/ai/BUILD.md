# BUILD — Execution Mode
Default mode. Executes code changes against a CLAIM-completed issue.

## 1. Precondition
Verify the issue body has a checked `## Design Checklist` and `## Branch`. If missing, STOP.
(Antigravity Check: Also initialize/verify the `task.md` artifact in `C:\Users\fefence\.gemini\antigravity\brain\43df2aa7-2363-43af-a9ea-7c68fe1aaecd` at startup).

## 2. Stages

### READ & SHAPE (Read-only)
- Find in-progress issues (open PRs) or CLAIM-completed issues.
- Verify the DoD is coherent with the current codebase. Rely on `.cursor/rules/` and `docs/ai/RULES.md` for technical styling, RLS, and auth conventions. No codebase writes allowed.

### GATHER
Read only the specific `docs/ai/REF.md` sections required by the ticket (refer to the Section Map in `REF.md`).

### EXECUTE
- Code only what is required by the DoD. All changes target the feature branch.
- For large tasks (>100 lines), commit a skeleton with `// TODO:` items before implementing, and update the PR Session State to `IN PROGRESS`.

### VERIFY
- Verify DoD point-by-point.
- Check Vercel Preview is READY and CI is green. Ensure 390px mobile responsiveness.

### FINALIZE
- Add `Closes #<issue_number>` to the PR body. Mark the PR as ready for review.
- Update the PR description's `## Session State` block.
- Update `docs/ai/REF.md` if schema, routes, or env vars changed.

---

## PR Session State Template
The PR description is the handoff document:
```markdown
## Session State
**Agent Type:** Antigravity | Claude
**Status:** IN PROGRESS | DONE
**Completed:**
- [x] done task
**Next:** single specific action for next instance
```
