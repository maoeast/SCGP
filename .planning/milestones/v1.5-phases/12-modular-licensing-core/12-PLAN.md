# PLAN: Modular Licensing Core

**Milestone:** v1.5  
**Phase:** 12  
**Status:** Completed  
**Date:** 2026-03-19

## Goal

Add strict module entitlements to the signed activation payload, local activation persistence, and auth-store state so modular licensing has one clean source of truth without any legacy full-access fallback path.

## Deliverables

1. `license-manager.ts` validates `am` (`allowedModules`) as a required signed payload field.
2. `activation` table stores `allowed_modules` separately from raw `license_data`.
3. `activation-manager.ts` reads, writes, and caches `allowedModules`.
4. `auth.ts` exposes `entitlements`, `allowedModules`, and `hasModuleAccess(moduleCode)`.
5. DEV mode injects `['sensory', 'emotional']` only when real activation is absent.

## Locked Constraints

- No backward compatibility fallback to full-module access.
- Missing `am` must be treated as invalid payload.
- DEV bypass must never leak into packaged production behavior.

## Execution Order

1. Extend signed payload type with `am`.
2. Add `allowed_modules` to schema and startup migration.
3. Wire `allowedModules` through activation verification, storage, and cache.
4. Add auth-store entitlement state and DEV-only mock entitlements.
5. Run targeted type-check filtering for the touched licensing files.

## Acceptance Targets

1. New activations persist authorized modules explicitly.
2. Auth store exposes deterministic module access checks.
3. Development can continue without real activation codes.
