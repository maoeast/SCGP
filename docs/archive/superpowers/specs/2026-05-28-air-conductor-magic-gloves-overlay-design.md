# Air Conductor Magic Gloves Overlay Design

Date: 2026-05-28
Status: approved in-session

## Goal

Reduce the cold "pose detection" feeling in Air Conductor by replacing the raw
full-body landmark rendering with a softer, game-like overlay.

## Chosen Direction

Direction B: "magic gloves"

- Hide face and non-essential pose landmarks by default
- Keep only simplified upper-body guidance for the conductor motion
- Turn both wrists into glowing "magic gloves"
- Render arm guidance as soft aurora-like ribbons instead of technical skeleton
  lines

## Constraints

- Do not change the gameplay data path:
  `GamePlay -> training_records -> training_session -> report_record`
- Keep mirrored coordinates consistent across:
  - mirrored video
  - pose overlay
  - particles
  - trails
  - ripples
  - beat trajectory layers
- Preserve enough positional clarity for children to understand where their
  hands are

## Implementation Scope

- Update `src/composables/usePoseTracker.ts`
  - replace raw MediaPipe full-landmark drawing with custom canvas rendering
  - remove default face-point exposure in the overlay
- Keep `src/components/games/pose/PoseCameraLayer.vue` as the mirrored carrier
  layer
- Add regression coverage for the new overlay contract

## Acceptance

- No face mesh / full landmark cloud is shown in the default Air Conductor pose
  camera layer
- The visible overlay reads as soft, playful, and wrist-centered
- Existing mirrored particle and rhythm effects still align with wrist movement
