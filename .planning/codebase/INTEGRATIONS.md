# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Updates / Auto-Updater:**
- GitHub Releases - Hosted release artifacts
  - SDK/Client: `electron-updater`
  - Implementation: `electron/handlers/update.js` & `src/services/UpdateService.ts`

## Data Storage

**Databases:**
- SQLite (Browser-side WASM)
  - Connection: Local disk file (e.g. `database.sqlite` in `userData` dir)
  - Client: `sql.js` (No-Native-Deps architecture)
  - Implementation: `src/database/sql-wrapper.ts` (Debounced atomic writes to Electron main process)

**File Storage:**
- Local filesystem only (`userData/resource_assets`)
  - Implementation: Accessed via custom protocol `resource://` intercepted in `electron/protocols/resource.ts`

**Caching:**
- None external. Uses `localStorage` and `sessionStorage` for UI state.

## Authentication & Identity

**Auth Provider:**
- Custom offline license & activation system
  - Implementation: `src/utils/license-manager.ts` and `src/utils/activation-manager.ts`
  - Cryptography: `crypto-js` & Web Crypto API

## Monitoring & Observability

**Error Tracking:**
- None configured (No Sentry or DataDog).
- Local console logging with safe log wrappers in main process (`electron/main.mjs`).

**Logs:**
- Custom debug/test UI panels (`src/views/devtools/`)

## CI/CD & Deployment

**Hosting:**
- Self-hosted desktop installs
- GitHub Releases

**CI Pipeline:**
- None specified (Likely manual `npm run build:electron:win`)

## Environment Configuration

**Required env vars:**
- None required to run. Uses `VITE_DEV_TOOLS` to toggle test panels.

**Secrets location:**
- Not applicable for end-user app. License keys generated via external script (`scripts/generate-activation.js`).

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-02-28*
