---
status: resolved
trigger: "器材训练记录页面没有任何数据显示，但应该显示训练数据"
created: 2026-02-28T10:00:00.000Z
updated: 2026-02-28T10:05:00.000Z
---

## Current Focus

hypothesis: getStudentRecords 查询没有返回 module_code 字段，导致前端过滤时全部被排除
test: 修复 getStudentRecords 添加 etr.module_code 到 SELECT 语句
expecting: 修复后记录能够正确显示
next_action: 等待用户验证修复

## Symptoms

expected: 器材训练记录页面应该显示学生的训练数据记录
actual: 页面显示没有任何数据
errors: 没有任何错误提示
reproduction: 1. 清空应用数据 2. 重新录入学生数据 3. 进行器材训练 4. 查看训练记录
started: 改造训练记录模块之后出现此问题。用户是在清空数据后重新录入，不涉及旧数据迁移

## Eliminated

<!-- APPEND only -->

## Evidence

- timestamp: 2026-02-28T10:00:15.000Z
  checked: EquipmentRecordsPanel.vue loadRecords 方法
  found: 该组件在 line 280/295 使用 r.module_code === props.moduleCode 过滤记录
  implication: 如果 module_code 为空或不匹配，记录将被过滤掉

- timestamp: 2026-02-28T10:00:20.000Z
  checked: QuickEntry.vue handleSubmit 方法 (line 300-309)
  found: 调用 api.createRecord 时没有传递 module_code 参数
  implication: module_code 需要在 createRecord 中从器材资源获取

- timestamp: 2026-02-28T10:00:25.000Z
  checked: EquipmentTrainingAPI.createRecord (api.ts line 1846-1851)
  found: 如果没有传入 module_code，会从 sys_training_resource 表查询获取
  implication: 需要确认 sys_training_resource 表中的数据是否有正确的 module_code

- timestamp: 2026-02-28T10:00:45.000Z
  checked: EquipmentTrainingAPI.getStudentRecords (api.ts line 1905-1928)
  found: SELECT 语句中没有包含 etr.module_code 字段
  implication: 这是根本原因 - 查询返回的记录没有 module_code，前端过滤时 r.module_code 为 undefined，与 props.moduleCode 比较永远为 false

- timestamp: 2026-02-28T10:01:30.000Z
  checked: api.ts line 1924-1925
  found: 已添加 etr.module_code 到 SELECT 语句
  implication: 修复已应用，查询现在会返回 module_code 字段

- timestamp: 2026-02-28T10:02:30.000Z
  checked: TypeScript 编译
  found: npx vue-tsc --noEmit 通过，无错误
  implication: 代码修改语法正确

## Resolution

root_cause: EquipmentTrainingAPI.getStudentRecords 方法的 SELECT 语句缺少 etr.module_code 字段，导致前端过滤时所有记录都被排除
fix: 在 getStudentRecords 的 SELECT 语句中添加 etr.module_code
verification: TypeScript 编译通过，用户在真实环境中确认修复有效，器材训练记录现在能够正确显示
files_changed:
  - E:/VSC/H5/SIC-ADS/src/database/api.ts
