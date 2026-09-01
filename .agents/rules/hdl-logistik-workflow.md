# HDL LOGISTIK V2 — GLOBAL DEVELOPMENT WORKFLOW
# ONE-PROMPT IMPLEMENT → RELEASE → VISUAL QA

This document serves as the mandatory, active workflow policy for all future tasks and patches in **HDL LOGISTIK V2**.

---

## 1. Project Identity & Boundaries
- **Project**: HDL LOGISTIK V2
- **Directory**: `/Users/mymac/Documents/HDL-LOGISTIK`
- **Repository**: `hdllogistic-app/hdllogistik.app`
- **Branch**: `main`
- **Isolation**: NEVER touch, read, modify, or interact with the `NEXTGEN` project.

---

## 2. Default Workflow (No Schema Changes)
For tasks that do NOT alter the database schema:
1. Audit related code and dependencies.
2. Implement requested requirements.
3. Update/create relevant unit test assertions.
4. Run full regression test suite:
   - `npm run test:auth`
   - `npm run test:manifest`
   - `npm run test:scheduling`
   - `npm run test:settings`
5. Run static checks & build verification:
   - `npx prisma validate`
   - `npx prisma generate`
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`
6. Audit Git status & diff (`git diff`, `git diff --stat`, `git status --short`). Ensure no `.env`, credentials, or temporary files are included.
7. Stage & commit with concise, descriptive commit messages (e.g. `feat: ...`, `fix: ...`).
8. Push to `origin/main`.
9. Confirm production deployment / Railway build status.
10. Conduct Visual QA & Functional QA across responsive layouts, alignment, spacing, modals, dropdowns, buttons, loading states, empty states, and formatting.
11. Auto-fix any discovered UI or functional issues, re-verify, re-commit, re-push, and re-QA until **CLEAN**.
12. Output the standardized Final Report.

---

## 3. Database / Schema Safety Gate
For tasks requiring database schema alterations (new models, fields, enums, relations, unique constraints, indexes):
1. Audit existing `prisma/schema.prisma`.
2. Patch `prisma/schema.prisma`.
3. Generate official migration DDL SQL script using `npx prisma migrate diff`.
4. Audit migration DDL SQL for non-destructiveness (must NOT contain `DROP`, `DELETE`, `TRUNCATE` unless explicitly requested).
5. Run regression test suite, TypeScript check, ESLint, and production build.
6. **STOP** and request approval with `SCHEMA / MIGRATION APPROVAL REQUIRED`.
7. Once explicitly **APPROVED**:
   - Commit & push to `main`.
   - Verify production migration application (`npx prisma migrate status`).
   - Proceed to Visual QA & Functional QA.

---

## 4. Final Report Standard Format
```text
IMPLEMENTATION
- [Summary of changes]

TEST
- [Auth: X passed, Manifest: Y passed, Scheduling: Z passed, Settings: W passed]

BUILD
- [Result & compilation time]

GIT
- Commit: [hash] [message]
- Push: [Branch & status]

RAILWAY
- Deploy Status: [Status / Online]

PRODUCTION QA
- Visual QA Result: [Clean]
- Functional QA Result: [Clean]

AUTO-FIX
- [Auto-fixes performed if any]

DATABASE
- [No schema change / Approved migration applied]

FINAL STATUS:
PRODUCTION CLEAN
```
