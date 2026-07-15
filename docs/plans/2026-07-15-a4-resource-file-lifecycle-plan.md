# 2026-07-15 A4 资源文件生命周期 + 备份收口 — 实施计划

> **文档类型**：可执行实施计划（新会话照此执行，无需重新调研）
> **来源**：`docs/reports/2026-07-15-unimplemented-gap.md` A4；基线调研已完成（证据见 §2）
> **日期**：2026-07-15
> **DoD**：资源增/替/删不再产生孤儿物理文件；备份可携带并恢复用户资源文件；存在孤儿 GC 维护动作；`npm run type-check` ✅；真机验证通过。

---

## 1. 范围决策（已与用户确认，锁定）

1. **推进范围**：Phase 1 + 2 + 3 **全做**，每阶段独立 conventional commit + `type-check`。
2. **备份格式**：**独立 zip 归档**（旁挂 `.res` 文件，主进程 deflate 打包，单独加密），不采用 base64 散装内嵌。
3. **死代码**：**确认无活引用即删**（删前必须 grep 复核零引用）。

依赖新增需用户一句话确认（见 §8）：推荐 `fflate`（纯 JS、无原生依赖、~8KB、Node/浏览器通用）。**未确认前不得 `npm install`。**

---

## 2. 调研结论与证据（file:line，执行时按此定位，不必重新测绘）

### 2.1 唯一正确根目录
- 协议 `resource://` 读取顺序：`userData/resources`（用户）→ `assets/resources`（预置），未命中返回 `-6`。`electron/main.mjs:495-551`、根目录定义 `main.mjs:264-267 getResourceRoot()`、预置根 `main.mjs:480-487 getPresetResourceRoot()`。
- **结论**：所有可写用户文件唯一正确根 = `userData/resources`。`TeachingMaterialFileManager` 用 `getUserDataPath()+'/resources'`（`teaching-material-file-manager.ts:112-113`）✅ 正确。

### 2.2 写盘链路（4 条，2 死 2 活）
| 链路 | 入口 | 根目录 | 状态 |
|---|---|---|---|
| A `SAVE_ASSET` IPC | `main.mjs:640-700`；调用方 `ResourceUpload.vue:250` | `userData/resources` ✅ | **死代码**（`ResourceUpload.vue` 全 src 无 import，唯一命中是 2026-04 code-review 文档） |
| B `ResourceManager.saveFile` | `resource-manager.ts:130-190`；调用方 `Resources.vue:539` | `getAppPath()`→生产=**安装目录/resources** ❌ | **死代码**（`Resources.vue` 路由 `router/index.ts:1095` 是 `redirect:'/resource-center'`+`hideInMenu`，组件从不挂载；import 是死 import） |
| C `TeachingMaterialFileManager` | `teaching-material-file-manager.ts:78-103`；调用方 `TeachingMaterials.vue:658`、`resource-importer.ts:146` | `userData/resources` ✅ | **活，健康**（删 DB 行后 `deleteManagedFile`，DB 写失败有文件回滚） |
| D AI 场景图主进程直写 | （已删除） | `userData/resources/uploaded/ai-scenes/` | **已移除（2026-07-15）**：AI 生图功能整体删除，链路 D 不复存在，孤儿源从根消除。详见 §3.5。 |

> `get-app-path` 生产 bug 坐实：`main.mjs:1127-1144` 返回 `path.dirname(process.execPath)+'/resources'`，既非 `userData/resources` 也非 `assets/resources` → 链路 B 生产环境写盘的文件协议读不到。链路 B 已死，无需修，直接删。

### 2.3 删除链路（孤儿主因）
- `sys_training_resource`：
  - `deleteResource(id)`（`resource-api.ts:601-622`）= **软删** `is_active=0`，不碰文件（**保留此语义，Phase 1 不动**）。
  - `hardDeleteResource(id)`（`resource-api.ts:650-662`）= 物理删 DB 行（tag_map、favorites、resource），**不碰物理文件** → Phase 1 钩入点。
  - 调用方（均不补删文件）：`stores/resource.ts:155`、`self-care-task-api.ts:97`、`TrainingResources.vue:1264,1542`、`admin/ResourceManager.vue:718,852`、`Resources.vue:738`（死）。
- `teaching_material`：`stores/teaching-materials.ts:136-157 deleteMaterial` 先删 DB 行再 `deleteManagedFile`（文件删失败仅日志不回滚，轻微风险，可顺手加固）。

### 2.4 资源引用存哪（抽引用用）
- `sys_training_resource`：
  - `cover_image TEXT`（`schema/sys-tables.sql:10-30`）：可能是 emoji、`resource:///...`、`resource://...` 或预置相对路径（注释 `sys-tables.sql:18` 与实现不符，以运行时为准）。
  - `meta_data` JSON 串：AI 图存 `imageUrl`（`resource-api.ts:556-558` 更新处、`745` 附近）。
  - `updateResource`（`resource-api.ts:530-591`）改 `cover_image`（`:552-555`）/`meta_data`（`:556-558`）—— Phase 1「替换即删旧」钩入点。
- `teaching_material`：`file_path TEXT NOT NULL UNIQUE`（`init.ts:3552-3573`）存**相对路径无 `resource://` 前缀**，展示时 `teaching-material-file-manager.ts:69-71 getFileUrl()` 现场拼。

### 2.5 备份现状
- `backup.ts:256-305 exportData` 仅 `SELECT *` 导表行 → JSON → `encryptData`（`crypto.ts:89-93`，JSON-based AES）→ 单个 `.dat`。
- `backup.ts:308-409 importData` 仅恢复行；`reconcileRestoredData`（`:212-253`）只重算班级 enrollment。
- **完全不碰 `userData/resources` 物理文件**；恢复后 `resource://` 全 `-6` 坏图，无兜底。

### 2.6 IPC 契约（`src/types/electron.d.ts`）
- 已有：`getUserDataPath`、`saveFile(path,Uint8Array)`、`deleteFile(path)`、`fileExists`、`ensureDir`、`readDir(path)→DirItem[]`、`readFileAsBase64`、`openFile`。
- **缺**：递归列目录、zip 打包/解包、二进制加密。Phase 2/3 需新增 IPC。
- 注意 `getAppPath` **未在 `electron.d.ts` 类型化**（遗留），删链路 B 时一并清。

### 2.7 托管路径判定规则（Phase 1/2/3 共用，关键安全边界）
- **托管（可删 / 进备份）**前缀：`uploaded/`、`teaching-materials/`。
- **预置（永不删 / 不进备份）**前缀：`docs/`、`images/`、`videos/`、`audio/`（app 内置，来自 `assets/resources`）。
- 依据：活写盘链路 C 写 `teaching-materials/`，链路 D 写 `uploaded/ai-scenes/`；链路 B（曾写 `images/` 等）已死。**执行前必须抽样核对 DB 实存路径**（见 §8 前置确认 P0）。

---

## 3. Phase 1 — 止血：删除/替换即清文件 + 死代码清理

> 目标：止住 `sys_training_resource` 这条主表的孤儿出血；统一托管路径判定。**不改协议、不改备份格式**。风险最低，先行。

### 3.1 新增托管路径工具 `src/utils/resource-file-refs.ts`
- `MANAGED_PREFIXES = ['uploaded/', 'teaching-materials/']`、`PRESET_PREFIXES = ['docs/','images/','videos/','audio/']`。
- `normalizeResourceUrl(v): string` — 把 `resource://`、`resource:///`、前导斜杠归一成相对路径；非资源（emoji/http/data/blob/空）返回 `''`。
- `isManagedResourcePath(rel): boolean` — 命中 `MANAGED_PREFIXES`。
- `extractResourceFileRefs(row): string[]` — 从 `cover_image` + 解析 `meta_data` JSON 递归取所有字符串值，归一后返回**托管**相对路径集合（去重；预置/外链跳过）。
- 单测：`npx jiti tests/resource-file-refs.test.ts`（新建，覆盖 emoji/`resource://`/`resource:///`/预置/外链/`meta_data` 嵌套）。

### 3.2 路径解析复用
- `TeachingMaterialFileManager.resolveManagedAbsolutePath(rel)`（`teaching-material-file-manager.ts:73-76`，根=`userData/resources`）已是正确实现。**抽公共**：新增 `src/utils/resource-file-service.ts` 暴露 `resolveAbsolutePath(rel)`、`deleteManagedFile(rel)`（调 `window.electronAPI.deleteFile`），`teaching-material-file-manager.ts` 改为复用它（去重，不破坏其对外 API）。

### 3.3 钩入 `hardDeleteResource`（`resource-api.ts:650-662`）
- 读行（`SELECT cover_image, meta_data FROM sys_training_resource WHERE id=?`）→ `extractResourceFileRefs` → 对每个托管 rel：**跨表引用计数**（`SELECT COUNT(*) FROM sys_training_resource WHERE cover_image LIKE '%<rel>%' OR meta_data LIKE '%<rel>%'`，且 `teaching_material.file_path = <rel>`）== 0 才 `deleteManagedFile(rel)` → 再删 DB 行（tag_map、favorites、resource）。
- 跨表计数确保共享文件不被误删（时间戳命名下罕见，但加这道防线）。
- 文件删失败：记 warn 不阻断 DB 删除（与 `teaching_material` 现状一致；GC 阶段兜底）。

### 3.4 钩入 `updateResource`（`resource-api.ts:530-591`）「替换即删旧」
- 仅当 `data.coverImage !== undefined` 或 `data.metadata !== undefined`：先读旧行 → `oldRefs=extractResourceFileRefs(oldRow)`；构造 `newRow={...oldRow, cover_image:data.coverImage??old, meta_data:data.metadata??old}` → `newRefs=extractResourceFileRefs(newRow)`；`toDelete = oldRefs − newRefs`；UPDATE 成功后对每个 `toDelete` 跨表计数==0 才删文件。
- 不改其它字段更新逻辑。

### 3.5 AI 候选图清理（链路 D）—— ⚠️ 已废弃（2026-07-15）

> **整体移除**：AI 生图功能（情绪场景 / 表达关心编辑器）经确认为忘删的未用功能，已整体删除 —— `src/services/scene-image-generation.ts`、`main.mjs` Gemini 生图基建、两 editor 的 AI 按钮 / 候选网格 / handlers，连同本节描述的 `purgeAbandonedSceneCandidates` / `ManagedFileRef` 清理 helper 一并移除。link D 孤儿源从根消除，比 regenerate 时机清理更干净；保留 `imageUrl` 手动输入。type-check ✅。下方原始方案保留作历史记录。

- ~~`EmotionSceneEditor.vue:773-776` / `CareExpressionEditor.vue:814` `applyGeneratedCandidate`：用户选中一张后，对其余候选 url 抽托管路径 → 跨表计数==0 → 删除（候选刚生成、必然零引用，可直接删）。~~
- ~~不改 `main.mjs:816-863` 生成逻辑（仍写多张候选供选）；仅渲染侧清理未选中。~~

### 3.6 死代码清理（删前 grep 复核零活引用）
- 删 `src/components/ResourceUpload.vue` + `electron/main.mjs:640-700 SAVE_ASSET` IPC + `electron/preload.mjs` 对应绑定。
- 删 `Resources.vue`：router 死 import `router/index.ts:30` + 评估 redirect 路由（`:1095`，可保留 redirect 兼容旧 URL，仅删 component import 与文件）。
- 删 `src/utils/resource-manager.ts`（`ResourceManager` 类）：grep 复核 `resourceManager`/`ResourceManager` 在活代码零引用后删；若 `getFileUrl`/`fileExists` 等有活调用方，迁移到 §3.2 公共 service 再删。

### 3.7 Phase 1 验证
- `npm run type-check`。
- 真机（Electron）：①硬删一个有封面/AI 图的资源 → 磁盘对应文件消失，预置图不动；②编辑替换封面 → 旧托管文件删、预置不动；③（AI 生图已移除，不再适用）；④软删→恢复 → 文件仍在。

---

## 4. Phase 2 — 备份纳入物理文件（独立 zip 归档）

> 目标：备份携带 `userData/resources` 托管文件，恢复后图片不再断链。备份版本 `2.0 → 3.0`，向后兼容 2.0。

### 4.1 加密二进制能力 `src/utils/crypto.ts`
- 现状 `encryptData`（`:89-93`）JSON-based，不能直接加密 zip 二进制。
- 新增 `encryptBytes(bytes: Uint8Array, key?): string` / `decryptBytes(payload: string, key?): Uint8Array | null`：用 CryptoJS 直接对 `WordArray`（`CryptoJS.lib.WordArray.create(bytes)`）AES 加密 → `toString()`（OpenSSL 格式 base64）；解密逆操作。**纯 crypto-js，无新依赖。**

### 4.2 主进程 zip 打包 IPC `electron/main.mjs` + `electron/preload.mjs` + `electron.d.ts`
- 依赖 `fflate`（待用户确认，见 §8）：`zipSync({ 'uploaded/...': {data}, 'teaching-materials/...': {data} }, {level:6})` → Uint8Array；`unzipSync(bytes)` 解包。
- IPC `pack-resource-archive`：递归遍历 `userData/resources`（仅 `uploaded/`、`teaching-materials/` 子树，跳过预置），读取每个文件字节 → `zipSync` → 返回 `{ zipBytes: Uint8Array, manifest: [{rel, size, crc}] }`。
- IPC `unpack-resource-archive(zipBytes)`：`unzipSync` → 逐文件 `fs.writeFile` 到 `userData/resources/<rel>`（先 `ensureDir`），返回 `{ restored: number, failed: [] }`。
- 递归列目录辅助：新增 `walk-dir` IPC（`readDir` 递归封装），Phase 3 GC 复用。
- preload 暴露 + `electron.d.ts` 类型补齐。

### 4.3 备份导出 `src/utils/backup.ts exportData`
- 新增可选参 `includeResources = true`。
- 流程：`pack-resource-archive` IPC → `encryptBytes(zipBytes)` → BackupData 增 `resourceArchive: { version:1, fileCount, totalBytes, checksum, payload: <加密base64串> }`；metadata 同步登记。
- **保持单 `.dat` 文件**：加密后的 zip 串作为 BackupData 一个字段，复用 `encryptData` 落单个 `.dat`。（"独立 zip 归档"= 用 zip 容器格式 + deflate 压缩，区别于散装 base64；载体仍单文件以保恢复简单。若用户坚持旁挂独立 `.res` 文件，改为 `downloadBackup` 额外写一个 `.res` + metadata 只放 manifest，恢复时按名读取——列为实现备注，默认走单文件。）
- `BACKUP_VERSION = '3.0'`；`SUPPORTED_BACKUP_VERSIONS` 加 `'3.0'`（保留 `'2.0'`/`'1.0'` 兼容）。

### 4.4 备份恢复 `src/utils/backup.ts importData`
- 恢复 DB 行后（现有逻辑）：若 `backupData.resourceArchive?.payload` 存在 → `decryptBytes` → `unpack-resource-archive` 写回 `userData/resources`。
- 2.0 备份无 `resourceArchive`：跳过、提示「旧备份不含资源文件，图片可能缺失」（不报错）。
- 解包失败：warn + 继续恢复 DB（不让资源文件失败阻断数据恢复）。

### 4.5 Phase 2 验证
- `npm run type-check`。
- 真机：导出备份 → 清库 + 清空 `userData/resources`（手动或临时）→ 恢复 → 资源图片/教具文件全部恢复可显；用 2.0 旧备份恢复不报错（仅提示）。
- 抽查：备份 `.dat` 体积合理（zip 压缩生效，非散装 base64 膨胀）。

---

## 5. Phase 3 — 孤儿 GC（维护动作）

> 目标：清理历史遗留 + 未来漂移的孤儿文件。非自动，用户触发。

### 5.1 新增 `src/utils/resource-reconcile.ts`
- `collectReferencedPaths(): Set<string>`：扫 `sys_training_resource`（cover_image + meta_data）+ `teaching_material.file_path`，归一取**托管**路径集。
- `collectDiskPaths(): Promise<string[]>`：`walk-dir` IPC 递归列 `userData/resources/uploaded` + `/teaching-materials`。
- `findOrphans(): Promise<{ orphans: string[], totalBytes }>`：磁盘 − 引用。
- `purgeOrphans(paths): Promise<{deleted, failed, freedBytes}>`：逐个 `deleteFile`。
- **dry-run 优先**：UI 先展示报告（文件数、占用、样例），用户确认才 purge。

### 5.2 维护入口
- 在资源管理/设置页加「资源文件体检」按钮（位置执行时定，候选 `admin/ResourceManager.vue` 或系统设置）：dry-run 报告 → 确认 → 清理。
- 不做启动自动清理（避免误删 + 性能抖动）。

### 5.3 Phase 3 验证
- `npm run type-check`。
- 真机：手动造孤儿（硬删资源后人为留文件 / AI 候选残留）→ 体检报告命中 → 确认清理 → 复检磁盘干净、引用文件完好。

---

## 6. 提交约定
- 每阶段一个 conventional commit（main 直提，本项目单人开发）：
  - Phase 1：`fix(resource): 资源删除/替换即清物理文件，移除死代码写盘链路`
  - Phase 2：`feat(backup): 备份纳入资源物理文件（zip 归档，v3.0）`
  - Phase 3：`feat(resource): 孤儿资源文件 GC 维护动作`
- 每阶段完成后回填 `docs/reports/2026-07-15-unimplemented-gap.md` A4 状态。
- 推送按用户指示。

---

## 7. 风险与前置确认（执行前必读）

| 编号 | 项 | 处置 |
|---|---|---|
| **P0** | `isManagedResourcePath` 规则（托管=`uploaded/`+`teaching-materials/`）基于「链路 B 已死」推断。若 DB 实存用户文件落在 `images/` 等预置前缀，会被误判预置→不删/不备份 | 执行 Phase 1 前：`SELECT cover_image, meta_data FROM sys_training_resource` + 抽样核对 `teaching_material.file_path`，确认活数据托管路径全在两前缀下；若不符，先扩规则再动手 |
| **P1** | 新增 `fflate` 运行时依赖 | 纯 JS、无原生、符合 AGENTS §5 禁止清单；但新增任何依赖需用户一句话确认。未确认前 Phase 2 阻塞；备选：手写 store-only zip（CRC32+本地头，无压缩，无依赖） |
| **P2** | 备份版本 3.0 向后兼容 | `SUPPORTED_BACKUP_VERSIONS` 保留 2.0/1.0；恢复缺 `resourceArchive` 时降级提示，不报错 |
| **P3** | `encryptBytes/decryptBytes` 正确性 | Phase 2 写单测：round-trip 二进制 + 与现有 `encryptData` 互不干扰 |
| **P4** | 跨表引用计数 LIKE 匹配可能漏（路径子串巧合） | 用归一后全等匹配 `file_path = rel`；`cover_image/meta_data` 用 `LIKE '%<rel>%'` + rel 含时间戳/uuid 基本无碰撞，可接受 |
| **P5** | 协议仍用弃用 `registerFileProtocol`（`main.mjs:495`） | **本计划不动**（低优先，非 A4 范围；记入 A8/技术债） |

---

## 8. 关键文件清单

**Phase 1**
- 新增：`src/utils/resource-file-refs.ts`、`src/utils/resource-file-service.ts`、`tests/resource-file-refs.test.ts`
- 改：`src/database/resource-api.ts`（`hardDeleteResource:650`、`updateResource:530`）
- 改：`src/views/resource-center/editors/EmotionSceneEditor.vue`、`CareExpressionEditor.vue`（AI 候选清理）
- 改/抽：`src/utils/teaching-material-file-manager.ts`（复用公共 service）
- 删：`src/components/ResourceUpload.vue`、`src/utils/resource-manager.ts`、`src/views/Resources.vue`（+ router 死 import）、`electron/main.mjs SAVE_ASSET`（:640-700）+ preload 绑定

**Phase 2**
- 改：`src/utils/crypto.ts`（`encryptBytes/decryptBytes`）、`src/utils/backup.ts`（v3.0 + 资源归档）、`electron/main.mjs` + `electron/preload.mjs`（zip IPC）、`src/types/electron.d.ts`、`package.json`（fflate，待确认）

**Phase 3**
- 新增：`src/utils/resource-reconcile.ts`；维护入口 UI（执行时定位）

---

## 9. 新会话启动指引

1. 读 `AGENTS.md` → 本计划 → `.continue-here.md`。
2. 查 Git 现场（`git status` / `git stash list` / `git log -5`）。
3. **先做 §7 P0**（抽样核对托管路径规则）再进 Phase 1。
4. 按阶段实施：每阶段 → `npm run type-check` → 回填 backlog A4 状态 → 独立 commit → （真机验证后）标 ✅。
5. 遇 §7 P1（fflate）阻塞时停下来问用户。
