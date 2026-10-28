# DocuMind — Project Memory

> Read this FIRST each session (then `ARCHITECTURE.md`, `ISSUES_RESOLVED.md`) instead of re-reading the codebase.
> Update at the end of every working session: state, decisions, next steps.

## Current state (2026-10-28)
- Code: builds, type-checks, lints clean, 10/10 tests pass, 0 npm vulnerabilities. Next 16.4.3.
- Runtime: **not usable end-to-end yet** —
  1. Supabase project in `.env.local` is unreachable (DNS fails) → DB + storage down. (OPEN-1)
  2. `ANTHROPIC_API_KEY` missing; only `GEMINI_API_KEY` present. (OPEN-2)
  3. Voyage key works (verified 1024-dim embedding).
- Local Node is v20.20.2 (works; Node 22 recommended).

## How to run / verify
```bash
npm install
npx tsc --noEmit && npm run lint && npm test && npm run build
npm run dev            # http://localhost:3000
```
Smoke test without auth: `/` → 200, `/dashboard` → 307, `/api/*` → 401.

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-10-28 | Use `@supabase/storage-js` instead of full `supabase-js` client | full client crashes on Node < 22 (Realtime WebSocket) |
| 2026-10-28 | No global ANN index on chunks; btree on `document_id` | all retrieval is per-document; IVFFlat + filter lost results |
| 2026-10-28 | Regenerated `package-lock.json` | `npm audit fix` crashes (npm bug); needed to clear vulns |

## Conventions
- Next 16: `proxy.ts` (not middleware.ts); `params` is a Promise. Check `node_modules/next/dist/docs/` before new APIs.
- API handlers: `requireDbUser()` first, scope every query by `user.id`, map `AuthError` → 401 via local `handleError`.
- DB access: `query` / `queryOne` from `lib/db.ts`, parameterised SQL only.
- Schema changes: edit `db/schema.sql` **and** add `db/migrations/NNN_*.sql` for existing DBs.
- Tests: `lib/**/*.test.ts` (Vitest, node). Pure functions only so far.
- UI tokens: `ink`, `ink-soft`, `paper`, `marker` (lime accent), `rule` (indigo), `muted`; `font-display`, `font-mono-label`.

## Owner's plan
_(pending — owner will explain goals and approach next session; record them here.)_

## Next steps
- [ ] Owner: restore/replace Supabase project, run schema + migration, create `documents` bucket.
- [ ] Owner: add `ANTHROPIC_API_KEY` or decide on Gemini.
- [ ] Hear owner's plan; record it above.
