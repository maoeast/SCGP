# Quick Task 260416-pug Summary

## Scope

Implemented `C03_XYLOPHONE / 星空八音盒` as a new cross-entry custom game for `soothing-aids` without extra refactor and without touching the known `S03_STORY_SEQ` drop-detection bug.

## Shipped Changes

- Added [XylophoneGame.vue](/home/maoea/projects/SCGP/src/components/emotional/games/XylophoneGame.vue) as a minimal calming music interaction:
  - five-note pentatonic bar tapping
  - local short-melody recording and playback
  - optional guided star-note follow prompts on difficulties 2-3
  - explicit manual completion path inside the game UI
- Added [XylophonePage.vue](/home/maoea/projects/SCGP/src/views/emotional/games/XylophonePage.vue) using the existing `GameContainer` + `buildCustomGameLaunchContext()` shell pattern.
- Added the static immersive route `/emotional/games/xylophone` in [index.ts](/home/maoea/projects/SCGP/src/router/index.ts).
- Extended [emotional-games-api.ts](/home/maoea/projects/SCGP/src/database/emotional-games-api.ts) so `C03_XYLOPHONE` records derive list-summary accuracy and average response time from guided prompt / tap interval metrics.
- Extended [GameRecordDetail.vue](/home/maoea/projects/SCGP/src/views/emotional/GameRecordDetail.vue) so `C03_XYLOPHONE` records render dedicated metric cards and raw-detail rows instead of falling back to generic display.

## Verification

- `npm run type-check:emotional` ✅

## Notes

- Quick-task artifacts are tracked locally in the working tree; no commit was created in this run because the repository already contained unrelated in-progress modifications.
- `S03_STORY_SEQ` remains unchanged and its pending todo stays active.
