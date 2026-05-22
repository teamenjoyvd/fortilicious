# GOTCHAS — agentic

Read in full during SHAPE and GATHER. Add new entries here immediately when a sharp edge or common mistake is discovered — never inline in code comments alone.

| Topic | Rule |
|---|---|
| Supabase `setAll` type | Do NOT derive from `CookieMethodsServer['setAll']` — `setAll` is optional so `Parameters<>` breaks. Use inline type: `{ name: string; value: string; options?: Record<string, unknown> }`. |
| Project gotcha | [Insert project-specific sharp edges here as they are discovered] |
