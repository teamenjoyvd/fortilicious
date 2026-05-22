# GCR — Gemini Code Review
Invoked via the `GCR` command in a BUILD session given a PR number.

## Steps
1. **Fetch:** Call `get_pull_request_reviews` and `get_pull_request_comments` to fetch all inline feedback.
2. **Checkout:** Read affected files from the PR's head branch (`PR.head.ref`) — not from `main` or specific SHAs.
3. **Address:** Apply all HIGH-priority comments. Apply MEDIUM-priority comments unless there is a clear, stated reason not to.
4. **Commit:** Push all fixes in a single commit. Message: `[ID] fix: address Gemini PR<N> review comments`.
5. **Report:** Provide a simple status list: ✅ Applied / ⚠️ Skipped (reason) for each comment.
