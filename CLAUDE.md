@AGENTS.md

# Project docs — read these first, keep them updated
- @PROJECT_MEMORY.md — current state, decisions, conventions, owner's plan, next steps
- `ARCHITECTURE.md` — structure, data model, request flows (read when touching code)
- `ISSUES_RESOLVED.md` — bug log; append every issue found and how it was fixed

At the end of each session that changes anything: update PROJECT_MEMORY.md (state, decisions, next steps),
ARCHITECTURE.md (if structure/flows changed), and ISSUES_RESOLVED.md (new issues/fixes).
Verify with: `npx tsc --noEmit && npm run lint && npm test && npm run build`.
