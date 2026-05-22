# PLAN — Read-only Design
Pure thinking mode. **Zero writes of any kind** to the codebase or GitHub.
Invoked explicitly with the `PLAN` prefix.

## Per-Ticket Steps
1. Read relevant `REF.md` sections (on demand, by section).
2. Produce a DoD as **specific verifiable checklists with file paths**:
   ```
   - [ ] `path/to/file.tsx` renders without overflow at 390px
   ```
3. List affected file paths and gotchas from `docs/ai/GOTCHAS.md`.
4. State verdict: **READY** or **BLOCKED: [single specific blocking question]**.

## Output Format
Output must be printed in the chat conversation. (Exception: If running as Antigravity, also write/update the `implementation_plan.md` artifact in the brain directory following this format).

```markdown
## PLAN: [topic or issue ref]
**Verdict:** READY | BLOCKED: <single blocking question>

### DoD
- [ ] `path/to/file`: what changes and why

### Affected Files
- `path/to/file`

### Gotchas Flagged
- [gotcha name]: relevance to this ticket

### Notes
[brief design reasoning]
```

## Batching & Rules
- Process multiple tickets sequentially. **Stop the batch immediately on the first BLOCKED verdict**.
- **Permitted:** Reads only (`get_file_contents`, `get_issue`, `list_pull_requests`).
- **Forbidden:** Any mutative operations (`create_issue`, `create_branch`, `push_files`, etc.).
