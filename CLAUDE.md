# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GYMBAR is a multi-tenant SaaS for gym management (React + TypeScript + Vite + Firebase). UI/comments are in Spanish; keep new strings and comments in Spanish. Money is displayed for Cuba: currency `CUP` renders as `MN`.

## Commands

Run from the repo root (npm workspaces):

- `npm run dev` — Vite dev server for the app (`@gymbar/app`).
- `npm run build` — builds `@gymbar/shared` then `@gymbar/app` (app build is `tsc -b && vite build`).
- `npm run typecheck` — `tsc --noEmit` across all workspaces (includes `functions`).
- `npm run lint` — ESLint (flat config). CI/pre-commit expect **0 errors** (a few `react-refresh` warnings are known/accepted).
- `npm run test` — Vitest across workspaces. App tests: `npm run test --workspace=app`.
  - Single test: `npm run test --workspace=app -- <path-or-name>` (e.g. `... -- member.factory`). Watch: `npm run test:watch --workspace=app`.
- `npm run format` — Prettier write.
- Firestore rules tests (needs the emulator): `npm run test:emulator --workspace=@gymbar/rules-tests`.

App tests use a **separate `app/vitest.config.ts`** (not `vite.config.ts`) — a dual-Vite type conflict makes merging them break; keep them separate.

## Deploy (free / Spark plan)

Cloud Functions are **not deployed** (they need the paid Blaze plan). Deploy only rules, indexes, and hosting:

```
firebase deploy --only firestore:rules,firestore:indexes
npm run build && firebase deploy --only hosting
```

`firebase.json` intentionally has **no `functions` block**. The `functions/` workspace is kept for a possible future Blaze/server-authoritative mode but is currently dead code — do not assume any callable exists at runtime.

## Architecture

Monorepo: `app/` (the SPA), `functions/` (unused, see above), `packages/shared/` (`@gymbar/shared`: enums, Zod schemas, `money`), `packages/rules-tests/`.

**Clean architecture inside `app/src/`, three layers — never skip one:**
- `domain/` — entities, pure logic, and repository/service **interfaces**. No Firebase imports here.
- `data/` — two interchangeable implementations of every domain interface: `data/demo/` (in-memory) and `data/firestore/`. Selected by factories.
- `features/<name>/` — TanStack Query hooks (`api/`) + pages/components. **No business logic or Firebase in components**; go through domain interfaces via the factories.

**Demo vs Firebase is chosen at runtime** by `isFirebaseConfigured` (true when `VITE_FIREBASE_*` env vars are set). Factories are the only switch points: `getOperationalData()` (`data/operational.factory.ts`), `getMemberRepository()`, `getAuthGateway()`. With no env vars the app runs fully on a seeded in-memory `data/demo/demoStore.ts` — this is how it runs/tests without Firebase.

**Auth is a two-layer model (pattern borrowed from the sibling `contamypime` app), NOT custom claims:**
1. **One Firebase account per gym** — the account `uid` **is** the `organizationId`; all data lives under `/organizations/{uid}`. `AuthGateway.observeGym/signIn/createGym`.
2. **Internal staff users with a PIN** — roles (`admin`/`reception`/`trainer`) are app data under `staff/`, chosen after connecting the gym. PINs are SHA-256 hashed (`shared/lib/pin.ts`).
`SessionContext` combines both into a `Session`. Firestore rules are just `request.auth.uid == orgId` (see `firestore.rules`) — there are no role-based server checks; role gating is client-side (single trusted gym).

**Sensitive operations run client-side** via `FirestoreOperationsService` (`data/firestore/firestoreOperations.ts`) using Firestore transactions — renewMembership, cashbox, check-in, registerSale. The demo equivalent is `data/demo/demoOperations.ts`. Keep the two in sync when changing operation logic. Dashboard stats are also computed client-side by reading collections (no `counters/*` rollups exist without Functions).

**Conventions that bite if ignored:**
- Money is integer **cents** (`shared/money.ts`); never floats. `formatMoney` special-cases `CUP` → `MN`.
- Design tokens are **RGB channel triplets** in `app/src/styles/tokens.css`, consumed as `rgb(var(--color-x) / <alpha-value>)` in `tailwind.config.ts`. Using hex breaks Tailwind opacity modifiers.
- The default currency for new plans/products comes from org settings (`useOrgSettings`), not a constant.
- Cross-device sync is inherent to Firestore (persistent local cache + `experimentalAutoDetectLongPolling` for proxied networks); the cloud icon (`SyncIndicator`) shows honest status via snapshot `metadata.fromCache`.

## Design docs

Architecture/design rationale lives in `docs/00…13`. `docs/13-despliegue-firebase.md` is the current deploy + auth-model reference. The root `README.md` is outdated (says "design phase") — the app is built.

## Web-session note

When running as Claude Code on the web, the container is ephemeral and can revert the working tree to an older commit mid-session. Only pushed commits persist. Sync at start (`git fetch && git reset --hard origin/<branch>`) and push after each change.
