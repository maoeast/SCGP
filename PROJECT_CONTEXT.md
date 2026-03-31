# PROJECT_CONTEXT.md

> 鑱岃矗锛氬綋鍓嶆湁鏁堢殑鍏ㄥ眬涓婁笅鏂囨憳瑕侊紝琛ュ厖椤圭洰浜嬪疄銆佷富绾胯繘灞曞拰褰撳墠鍐崇瓥銆?> 浣曟椂闃呰锛氳瀹?`AGENTS.md` 涓?`.continue-here.md` 鍚庯紝浠嶉渶瑕佽ˉ鍏ㄥ叏灞€鑳屾櫙鏃躲€?> 涓嶈礋璐ｏ細鎵挎媴鍘嗗彶娴佹按鏃ュ織锛涘巻鍙插唴瀹瑰簲杞叆 `docs/logs/`銆乣docs/CHANGELOG.md` 鎴?git history銆?
> 鐢ㄩ€旓細褰撳墠鏈夋晥鍗忎綔涓婁笅鏂囨憳瑕併€?> 璇诲彇绛栫暐锛氫笉鍐嶄綔涓烘瘡娆℃柊浼氳瘽榛樿棣栬鏂囦欢銆傞粯璁ゅ厛璇?`AGENTS.md`銆乣docs/planning/2026-03-23-scgp-context-bootstrap.md`銆乣README.md`锛涘彧鏈夊湪闇€瑕佸欢缁伐浣滆儗鏅椂鍐嶈鏈枃浠躲€?> 鍘嗗彶璇存槑锛氭棫鐗堥暱绡囧伐浣滄棩蹇椾笌闃舵娴佹按宸蹭粠楂橀鍏ュ彛绉诲嚭锛屽巻鍙叉憳瑕佽 `docs/logs/2026-03-26-project-context-archive.md`锛屾洿缁嗚妭鐨勫畬鎴愰」瑙?`docs/CHANGELOG.md` 涓?git history銆?
## 1. 褰撳墠椤圭洰浜嬪疄

- 褰撳墠姝ｅ紡浜у搧鍚嶇О锛歚SCGP / 鏄熸効鑳藉姏鍙戝睍骞冲彴`
- 鍘嗗彶闃舵鍚嶇О锛?  - `鐢熸椿鑷悊閫傚簲缁煎悎璁粌绯荤粺`
  - `鎰熷畼鑳藉姏鍙戝睍绯荤粺 (SIC-ADS)`
- 鎶€鏈爤锛歚Electron + Vue 3 + TypeScript + Vite + SQL.js`
- 褰撳墠鏁版嵁搴撲富绾匡細娓叉煋杩涚▼鍐?`sql.js` + `SQLWrapper` 闃叉姈淇濆瓨
- 褰撳墠鎸佷箙鍖栦富绾匡細娓叉煋杩涚▼瀵煎嚭鏁版嵁搴擄紝缁?IPC 浜ょ粰 Electron Main 鍘熷瓙鍐欏叆
- 褰撳墠璧勬簮涓绘ā鍨嬶細`sys_training_resource + sys_tags + sys_resource_tag_map`
- 褰撳墠璇勪及涓婚摼锛歚AssessmentContainer + ScaleDriver`
- 褰撳墠妯″潡绯荤粺锛氬凡鏈?`ModuleRegistry`
- 褰撳墠璺敱鐜板疄锛氫粛浠ラ潤鎬佽矾鐢辫〃涓轰富锛屼笉鏄敞鍐岃〃鍔ㄦ€佽閰?
## 2. 褰撳墠浜у搧鐜板疄

褰撳墠浠ｇ爜涓荤嚎宸茬粡鍏峰浠ヤ笅鍙繍琛岃兘鍔涳細

- 瀛︾敓绠＄悊
- 鑳藉姏璇勪及
- 娓告垙璁粌
- 鍣ㄦ潗璁粌
- 璁粌璁板綍
- 璁粌璁″垝
- 鎶ュ憡鐢熸垚
- 璧勬簮涓績
- 绯荤粺绠＄悊
- 鐝骇绠＄悊涓庡鐢熷垎鐝?- 鏈湴璐﹀彿鐧诲綍銆佹縺娲汇€佹洿鏂版帴鍏ャ€佸浠芥仮澶?
蹇呴』鎸佺画璁颁綇鐨勭幇瀹烇細

- `sensory` 浠嶆槸褰撳墠鏈€瀹屾暣鐨勪笟鍔′富閾?- `emotional` 宸叉湁鍙繍琛岄摼璺紝浣嗕粛澶勪簬鎸佺画琛ュ叏涓?- `social`銆乣life_skills` 绛変粛涓嶆槸瀹屾暣鍙氦浠樻ā鍧?- 涓嶈鎶婃湭鏉ユā鍧楃洰鏍囨€佸啓鎴愬綋鍓嶅凡瀹炵幇鐜扮姸

## 3. 褰撳墠宸茬‘璁ょ殑閲嶈鍙樻洿

### 3.1 鍣ㄦ潗璁粌鍏ュ彛涓?physical-equipment

- physical-equipment CSV 瀵煎叆閾捐矾宸茶惤鍦?- 褰撳墠鍥涗唤 physical-equipment 鑽夌 CSV 宸茶鑼冨寲鍏ュ簱
- 鍣ㄦ潗璁粌鍐呴儴鍏ュ彛宸插浐瀹氫负 6 涓細
  - `sensory-integration`
  - `emotional-regulation`
  - `social-communication`
  - `fine-motor`
  - `soothing-aids`
  - `life-skills`
- 椤跺眰鎺堟潈妯″瀷淇濇寔涓嶅彉锛?  - 浠嶆寜鐪熷疄涓氬姟 `moduleCode`
  - `fine-motor` / `soothing-aids` 娌℃湁琚彁鍗囦负椤跺眰鎺堟潈妯″潡
- 鍣ㄦ潗璁粌蹇€熷綍鍏ュ乏渚у垎绫诲凡鏀逛负鐪熷疄婧愬垎绫诲彛寰勶紝涓嶅啀鏄剧ず `catalog-group / entry-group` 鏍囩

### 3.2 棣栭〉

- 棣栭〉鐢ㄦ埛鍙鏍囬宸叉敼涓猴細`棣栭〉鐪嬫澘`
- 棣栭〉鍓爣棰樺凡鏀逛负锛歚鑱氱劍浠婂ぉ瑕佸仛鐨勮瘎浼般€佽缁冧笌骞查鎻愰啋锛岀敤鐪熷疄涓氬姟鏁版嵁鏀寔涓€绾垮喅绛栥€俙

### 3.3 training-entry hard-cut 褰撳墠杩涘害

- `training_records` 涓?`equipment_training_records` 宸茶ˉ榻?`entry_code`
- 娓告垙璁粌鏂板啓鍏ュ凡鍐欏叆 `entry_code`
- 鍣ㄦ潗璁粌鏂板啓鍏ュ凡鍐欏叆 `entry_code`
- 璁粌璁板綍鑿滃崟 / 缁熻 / 闈㈡澘宸叉寜 `entry_code` 缁熻涓庣瓫閫?- `src/views/equipment/Records.vue` 宸叉敼涓?entry-aware 璁板綍椤?- `ModuleTrainingRecords -> EquipmentRecords` 宸茶兘鎼哄甫 `recordId` 杩涘叆瀵瑰簲璁板綍
- clean local dev DB 宸查噸寤哄苟瀹屾垚鏈€灏忓啓鍏ラ獙璇侊細
  - 1 鏉℃父鎴忚褰曢獙璇?`entry_code = emotional-regulation`
  - 1 鏉″櫒鏉愯褰曢獙璇?`entry_code = fine-motor`
- `SQLWrapper` 宸蹭慨澶嶁€滀繚瀛樺悗閿欒閲嶅鍐嶈Е鍙戜繚瀛樷€濈殑鐘舵€佹満闂
- `equipment_training_records` 鐨勫綋鍓?schema/init 鍙ｅ緞宸叉敼鍥炴纭祫婧愪富绾匡細
  - `equipment_id -> sys_training_resource(id)`

## 4. 褰撳墠娲昏穬鏈畬鎴愪富绾?
褰撳墠涓嬩竴鏉＄湡姝ｇ殑澶ф敼鍔紝涓嶆槸鍗曢〉淇ˉ锛岃€屾槸锛?
- 缁熶竴 `娓告垙璁粌 / 鍣ㄦ潗璁粌 / 璁粌璁板綍`
- 鏀跺彛涓哄悓涓€濂?6 涓?internal training entries

褰撳墠宸茬‘璁ょ殑瀹炴柦杈圭晫锛?
- 涓嶈€冭檻鏃ц缁冭褰曞吋瀹?- 鏃ц缁?/ 娓告垙 / 鍣ㄦ潗璁板綍鍏佽鐗╃悊鍒犻櫎
- 涓嶅仛鈥滄棫 `module_code` 鎺ㄦ柇鍒版柊 entry鈥濆吋瀹瑰眰
- 淇濇寔椤跺眰 `moduleCode` 鎺堟潈妯″瀷涓嶅彉

褰撳墠宸插仛鐨勫噯澶囷細

- 宸叉柊澧炲叡浜叆鍙ｆā鍨嬭捣鐐癸細`src/utils/training-entry.ts`
- `src/utils/equipment-training-entry.ts` 宸茶鏀舵暃涓哄吋瀹瑰寘瑁呭眰

褰撳墠灏氭湭瀹屾垚鐨勫叧閿偣锛?
- 鏃у巻鍙茶褰?hard-cut 鐨勬渶缁堟敹鍙ｆ柟妗堣繕鏈畬鍏ㄦ槑纭細
  - 鐩存帴鐗╃悊鍒犻櫎锛屾垨
  - 鎻愪緵涓€娆℃槑纭?reset 璺緞
- 浠嶉渶缁х画鎺掓煡鏄惁杩樻湁 remaining old module-based record/detail flow
- 娓告垙璧勬簮鐪熷疄瑕嗙洊浠嶄笉瀹屾暣锛?  - 褰撳墠鐪熷疄鍙敤浠嶄互 sensory games + emotional scenes / care scenes 涓轰富
  - `social-communication / fine-motor / soothing-aids / life-skills` 杩樹笉鏄畬鏁存父鎴忓唴瀹逛氦浠樻€?- 濡傚悗缁粛澶嶇幇鍘熷瓙鍐欏叆绔炴€佹棩蹇楋紝鍐嶇户缁敹鍙?Electron Main 鐨?`save-database-atomic` 涓茶鍖?
## 5. 褰撳墠鏄庣‘鍐崇瓥

- 椤跺眰鏀惰垂 / 鎺堟潈缁х画鎸夌湡瀹炰笟鍔℃ā鍧楋細
  - `sensory`
  - `emotional`
  - `social`
  - `life_skills`
  - `cognitive`
- `fine-motor`銆乣soothing-aids` 绛夊睘浜庡唴閮ㄨ缁冨叆鍙ｏ紝涓嶆槸椤跺眰鎺堟潈妯″潡
- 鏂拌祫婧愬尮閰嶄笌鍥剧墖瑙ｆ瀽浼樺厛鎸?`meta_data.resourceCode`
- 鏃ц褰曚笉鍋氣€滄棫 `module_code` 鎺ㄦ柇鍒版柊 `entry_code`鈥濆吋瀹瑰眰
- 鏂囨。涓庣粨璁哄繀椤讳互褰撳墠浠ｇ爜鐜板疄涓哄噯锛屼笉浠ユ棫瑙勫垝鎴栫洰鏍囨€佹浛浠ｇ幇鐘?
## 6. 褰撳墠鎺ㄨ崘璇诲彇椤哄簭

榛樿鏂颁細璇濓細

1. `HANDOFF.md`
2. `AGENTS.md`
3. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
4. `README.md`
5. `.continue-here.md`

鎸夐渶鍐嶈锛?
6. `PROJECT_CONTEXT.md`
7. `docs/planning/2026-03-13-scgp-current-prd.md`
8. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
9. `重构实施技术规范.md`

## 7. 缁存姢瑙勫垯

- 鏈枃浠跺彧淇濈暀褰撳墠鏈夋晥涓婁笅鏂囷紝涓嶅啀绉疮闀挎祦姘存棩蹇?- 宸插畬鎴愬巻鍙蹭簨椤逛紭鍏堣繘鍏ワ細
  - `docs/CHANGELOG.md`
  - `docs/logs/2026-03-26-project-context-archive.md`
  - git history
- `HANDOFF.md` is now the single top-level routing doc for new sessions and should stay short
- 濡傛灉鏈枃浠跺啀娆℃槑鏄捐啫鑳€锛屽簲缁х画鎶婂巻鍙插唴瀹硅縼鍑猴紝鑰屼笉鏄湪杩欓噷鍫嗙Н

## 8. 2026-03-30 Working Update

- A unified training-resource copy workflow is now part of current code reality.
- Source of truth for pre-release training-resource copy is:
  - `docs/references/resource-copy/2026-03-30-training-resource-copy.csv`
- Generated runtime override map is:
  - `src/data/generated-training-resource-copy.ts`
  - do not edit the generated file directly
- Current covered resource families:
  - sensory equipment
  - sensory games
  - emotional games
  - `emotion_scene`
  - `care_scene`
  - physical-equipment resources
- Existing local DBs can be synced by stable key through:
  - `npm run resource-copy:sync -- --dry-run`
  - `npm run resource-copy:sync -- --yes`
- Stable keys now matter more than names for copy sync:
  - `legacyId`
  - `taskId`
  - `gameCode`
  - `sceneCode`
  - `resourceCode`
- Important constraint:
  - do not casually reorder `src/database/equipment-data.ts`, because current sensory-equipment copy keys still depend on the legacy array order

## 9. 2026-03-31 Resource-Center Follow-up

- resource-center smoke verification is now confirmed against the live local dev DB:
  - after app relaunch and `Ctrl+R`, `emotion_scene = 80`
  - after app relaunch and `Ctrl+R`, `care_scene = 60`
  - sensory `equipment_data` resources checked for ability-tag coverage: `63 / 63`
- teaching materials now have a second-layer UI filter in addition to business dimension:
  - `video`
  - `image`
  - `document`
  - `other`
- important implementation boundary:
  - second-layer teaching-material categories are derived from existing `file_type`
  - do not add a separate persisted category field unless future runtime verification proves `file_type` is insufficient
- important zero-state constraint:
  - the teaching-material file-category filter should remain visible even when `teaching_material` is empty
  - current local dev DB still has `0` teaching-material rows, so non-zero category counts still need runtime verification with imported files

## 10. 2026-03-31 Training Workspace Layout Fix

- equipment quick-entry and game lobby now share a split-workspace scroll pattern:
  - page root: `workspace-page`
  - split container: `workspace-split`
  - left/right panes: `workspace-pane`
  - top-aligned content cards: `workspace-pane-card`
- implementation landed in:
  - `src/assets/layout.css`
  - `src/views/equipment/QuickEntry.vue`
  - `src/views/games/GameLobby.vue`
- behavior target:
  - left resource lists scroll independently
  - right data-entry / preview pane stays in the visible workspace instead of being pushed off-screen by outer-page scrolling
  - wheel scrolling should stop at the pane boundary via `overscroll-behavior: contain`
- reference doc:
  - `docs/reports/2026-03-31-training-workspace-layout-scroll-guideline.md`

## 11. 2026-03-31 Class Management Academic-Year Source

- class management now has an independent academic-year source:
  - table: `sys_academic_year`
  - init path: `src/database/init.ts`
  - API surface: `src/database/class-api.ts`
- important boundary:
  - academic years are no longer inferred only from existing classes
  - admins can create academic years before any class exists
  - editing an academic year now propagates to:
    - `sys_class.academic_year`
    - `student_class_history.academic_year`
- current class-management grade taxonomy now spans 12 levels:
  - preschool: `小班 / 中班 / 大班`
  - school age: `一年级 ~ 六年级`
  - post-school age: `七年级（初一）~ 九年级（初三）`
## 12. 2026-03-31 Date-Picker Standardization and Training-Plan Module Ownership

- Element Plus global locale is now configured to `zh-cn` in:
  - `src/main.ts`
- shared date-picker defaults now live in:
  - `src/utils/date-picker.ts`
- important UI constraint:
  - new or updated active business pages should reuse:
    - `STANDARD_DATE_PICKER_PROPS`
    - `STANDARD_DATE_RANGE_PICKER_PROPS`
  - avoid adding new ad-hoc date-picker props unless behavior genuinely needs to differ
- active business pages aligned this round include:
  - `src/views/plan/PlanList.vue`
  - `src/views/Reports.vue`
  - `src/components/AddStudentDialog.vue`
  - `src/views/equipment/Records.vue`
  - `src/views/admin/StudentClassAssignment.vue`
  - `src/views/training-records/components/EquipmentRecordsPanel.vue`
  - `src/views/training-records/components/GameRecordsPanel.vue`
- training-plan ownership is no longer treated as only `all / sensory / emotional / social`
- normalized training-plan module values now live in:
  - `src/utils/training-plan-module.ts`
- important compatibility boundary:
  - preserve old stored values through normalization instead of destructive migration
  - supported legacy aliases include:
    - `sensory`
    - `emotional`
    - `social`
    - `life_skills`

## 13. 2026-03-31 Student Management UI Alignment and Data Boundaries

- `src/views/Students.vue` is now aligned to the same admin-page visual language used by:
  - `src/views/admin/ClassManagement.vue`
  - `src/views/admin/StudentClassAssignment.vue`
- student-management now relies on current class snapshot fields already stored on `student`:
  - `current_class_id`
  - `current_class_name`
  - these fields are now included in the student list query path through:
    - `src/database/api.ts`
    - `src/stores/student.ts`
- important avatar boundary:
  - active student-management UI only allows two display states:
    - real uploaded photo
    - gender-colored initial avatar fallback
  - do not reintroduce a third grey generic avatar state in new student-list UI work
- important data-entry boundary:
  - `src/components/AddStudentDialog.vue` no longer auto-generates and persists placeholder avatar images into `avatar_path`
  - newly saved or edited diagnosis values are normalized to the current nine canonical diagnosis categories used by the student-management filters and color pills
- important compatibility boundary:
  - historical rows may still contain older long-form diagnosis strings or previously generated fallback avatar data URLs
  - current page/dialog behavior normalizes these at display/edit time; no destructive migration has been run
