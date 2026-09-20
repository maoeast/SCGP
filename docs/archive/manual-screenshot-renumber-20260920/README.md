# 截图重编号修复归档（2026-09-20）

> 状态：**已完成**（提交见同批次 `fix(manual): 修复 09-10 重编号遗留的截图错位…`）
> 背景：2026-09-10 截图专项（`3e871e6`，211 → 217 张）在 plan / scenarios / 正文占位插入 6 行后，
> **只重映射了 approvals 元数据，没有同步改物理文件名**，导致 S082 起各段「图注 ↔ 图片内容」整体错位。

## 1. 错位规则（本次推导，可复现）

6 处插行的新编号：`S080 S081 S176 S177 S190 S210`（与 `3e871e6` 提交信息一致）。

- `k(p)` = 位置 ≤ p 的插行数
- 新槽位 p 的内容 = 文件名 `S(p − k(p))` 的图
- 旧编号 n → 新编号 t：不动点迭代 `t = n + k(t)`，等价于分段：
  - `n ≤ 79` → `+0`；`80..173` → `+2`；`174..185` → `+4`；`186..204` → `+5`；`205..211` → `+6`
- 因此错位偏移量随区段递增（+2/+4/+5/+6），**不是**统一偏移。

被 09-10 新采覆盖而工作区已无的 5 张（其原始内容仅在 git 历史）：

| 原编号 | 原始内容归位目标 | 新图注 |
|---|---|---|
| S080 | S082 | BRIEF DRAFT 报告 |
| S081 | S083 | CRT 结果与分组情况 |
| S176 | S180 | 保存并重新生成编辑态 |
| S177 | S181 | AI 生成报告入口 |
| S190 | S195 | 账号启停与删除菜单 |

第 6 张（原 S210「评估质量看板」的旧内容）已由 09-10 尾部复制落在 S216，无需恢复。
另：S148 是 09-10 的重拍件（占新槽位 148），其旧内容（旧场景 148）归位到 **S150**。

## 2. 脚本（按执行顺序）

| 文件 | 作用 | 备注 |
|---|---|---|
| `scgp-renumber-fix.mjs` | 121 张归位 + 5 张 git 恢复；带 dry-run（默认）与目的地安全护栏 | `node … --apply` 才写盘 |
| `scgp-renumber-fix2.mjs` | 补正 S148/S150（重拍件占位 vs 旧内容归位）；并做 217/217 终态断言 | 已执行 |
| `scgp-approvals-rebuild.mjs` | 重建 `screenshot-approvals.json`：sha256 按落盘文件重算、runId 还原为真实采集 run | 覆盖写入 approvals |

脚本内 `ROOT` 为本机绝对路径（`F:/Projects/SCGP`），复用时需改；`PARENT = 3e871e6~1` 为推导基准提交。
（Windows cmd 下写 `3e871e6^` 会被当转义符吃掉，务必用 `~1`。）

## 3. 校验

```bash
node scripts/manual/verify-user-manual-approved-screenshots.mjs   # → approvals: 217
npm run manual:screenshots:check                                   # → 217 场景 / 0 pending
```

终态断言（fix2）：217 个槽位的内容哈希 == 由 `3e871e6~1` 推导的期望值。

## 4. 遗留（继承自修复前，非本次引入）

1. **四组重复图**：S020/S021、S187/S188、S207/S208、S211/S213 字节完全相同，与基线 §2「同一张图片不得重复用于多个编号」冲突 → 待专项甄别（真同图 or 历史采集巧合）后重拍。
2. **runId 仅是溯源标签**：重编号条目的 `output/manual-screenshot-capture/runs/<runId>/screenshots/<id>.png` 与旧 run 目录已不可机械复核；`screenshot-approvals.json` 的 sha256 是与落盘图对齐的**唯一锚点**。
3. **`promote-user-manual-screenshots.mjs` 必须带 `--ids`**（限定本次采集范围）运行；不要全表重放——旧 run 工件目录已不存在，全表 `assertApprovedArtifact` 会抛错。
