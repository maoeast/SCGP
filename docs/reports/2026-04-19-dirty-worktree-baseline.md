# 2026-04-19 脏工作区基线

## 1. 当前结论

- 当前仓库共有 **4061** 个脏文件。
- 其中：
  - 已跟踪文件被修改：**4055**
  - 未跟踪文件：**6**
- 这说明主体不是本次会话新生成文件，而是仓库已存在的大面积未提交本地改动。

## 2. 顶层目录分布

| 目录 | 数量 | 说明 |
| --- | ---: | --- |
| `public` | 2175 | 最大头，主要是静态资源 |
| `src` | 615 | 产品源码 |
| `.codex` | 247 | Codex / GSD 工作流目录 |
| `assets` | 201 | 资源素材目录 |
| `.claude` | 181 | Claude 工作流目录 |
| `.gemini` | 144 | Gemini 工作流目录 |
| `.planning` | 135 | 规划与工作流目录 |
| `docs` | 85 | 文档目录 |

## 3. 已知最大脏文件来源

- `public/fontawesome`：**2126**
  - 当前已知最大的脏文件桶
  - 属于静态图标资源，不是业务模块代码

## 4. 产品源码分布（`src/`）

| 子目录 | 数量 |
| --- | ---: |
| `src/assets` | 228 |
| `src/views` | 112 |
| `src/components` | 83 |
| `src/database` | 70 |
| `src/utils` | 38 |
| `src/types` | 20 |
| `src/strategies` | 16 |

### 4.1 `src/views` 中已知模块

| 模块 | 数量 |
| --- | ---: |
| `emotional` | 33 |
| `assessment` | 18 |
| `devtools` | 8 |
| `_archived` | 7 |
| `resource-center` | 6 |
| `admin` | 4 |
| `equipment` | 4 |
| `games` | 4 |
| `training-records` | 4 |

### 4.2 `src/components` 中已知模块

| 模块 | 数量 |
| --- | ---: |
| `emotional` | 43 |
| `training` | 14 |
| `login` | 6 |
| `icons` | 5 |
| `games` | 3 |

## 5. 当前判断

- 当前脏工作区的主体不在本轮感统改造文件。
- 脏文件来源可以先分成 4 类：
  - 静态资源：如 `public/fontawesome`
  - 产品源码：如 `src/emotional`、`src/assessment`
  - AI / GSD 工作流目录：如 `.codex`、`.claude`、`.gemini`、`.planning`
  - 文档与归档：如 `docs`、`.archive`

## 6. 审计顺序建议

1. `public/fontawesome`
2. `.codex`
3. `.claude`
4. `.gemini`
5. `.planning`

## 7. 备注

- 当前基线只记录“已确认统计事实”，不是完整逐文件审计报告。
- 下一轮会话应先做抽样检查，再决定恢复、保留或归档策略。

## 8. 第一轮抽样审计结果（按优先顺序）

### 8.1 `public/fontawesome`

- 数量：**2126**
- diff 形态：
  - `git diff --shortstat -- public/fontawesome` 显示 `2126 files changed, 0 insertions(+), 0 deletions(-)`
  - `git diff --numstat -- public/fontawesome` 全部为 `0 0`
  - 抽样文件仅有 `old mode 100644 / new mode 100755`
  - 工作树抽样权限为 `777`，Git 索引中为 `100644`
- 当前判断：
  - 这是整桶静态资源权限位噪音，不是内容改动
  - 不属于业务代码，也没有保留价值
- 建议策略：**恢复**

### 8.2 `.codex`

- 数量：**247**
- diff 形态：
  - 主体仍是 `100644 => 100755` 的权限位噪音
  - 真实内容改动只出现在 `.codex/config.toml`
- `.codex/config.toml` 当前 diff：
  - 把 `config_file` 从 `/home/DONG/Mycode/SCGP/.codex/agents/...` 改成相对路径 `agents/...`
  - 删除了 `SessionStart` 的 `gsd-update-check.js` hook 配置
- 当前判断：
  - `.codex` 目录主体应视为权限位噪音
  - `.codex/config.toml` 属于真实内容改动，但它是“工具链配置修正候选”，不是本轮脏工作区清理中应直接混入的大桶噪音
  - 该改动虽然提升可移植性，但当前 `.codex` 其他文件内仍残留大量 `/home/DONG/...` 绝对路径引用，因此这不是完整闭环修复
- 建议策略：
  - **恢复** `.codex` 中除 `.codex/config.toml` 外的权限位噪音
  - **归档或拆分保留** `.codex/config.toml` 的内容 diff，后续作为独立工具链整理项单独评审

### 8.3 `.claude`

- 数量：**181**
- diff 形态：
  - 主体仍是 `100644 => 100755` 的权限位噪音
  - 真实内容改动只出现在 `.claude/settings.local.json`
- `.claude/settings.local.json` 当前 diff：
  - 新增了 `git --version`、`sudo apt-get *`、`gh auth *`、`ssh-keygen *`、`ssh -T git@github.com`、读取 `~/.ssh/**` 等本机权限白名单
- 当前判断：
  - 这是本地代理运行权限扩张，不是产品代码或仓库共享配置演进
  - 内容偏本机/环境定制，不适合作为当前仓库待保留业务变更
- 建议策略：
  - **恢复** `.claude` 中除 `.claude/settings.local.json` 外的权限位噪音
  - `.claude/settings.local.json` 采用 **归档后恢复** 或直接 **恢复**；不建议作为当前仓库共享改动保留

### 8.4 `.gemini`

- 数量：**144**
- diff 形态：
  - `git diff --shortstat -- .gemini` 显示 `144 files changed, 0 insertions(+), 0 deletions(-)`
  - `git diff --numstat -- .gemini` 全部为 `0 0`
  - 抽样文件仅有 `old mode 100644 / new mode 100755`
- 当前判断：
  - 纯权限位噪音，没有内容改动
- 建议策略：**恢复**

### 8.5 `.planning`

- 数量：**137**
- diff 形态：
  - `git diff --shortstat -- .planning` 显示 `137 files changed, 0 insertions(+), 0 deletions(-)`
  - `git diff --numstat -- .planning` 全部为 `0 0`
  - 抽样文件仅有 `old mode 100644 / new mode 100755`
- 当前判断：
  - 纯权限位噪音，不是规划内容变更
- 建议策略：**恢复**

## 9. 当前阶段性结论

- 在当前固定优先顺序内，共审计 **2835** 个脏文件。
- 其中：
  - 纯权限位噪音：**2833**
  - 真实内容改动：**2**
- 两个真实内容改动文件：
  - `.codex/config.toml`
  - `.claude/settings.local.json`

## 10. 建议执行矩阵

| 路径 | 建议策略 | 原因 |
| --- | --- | --- |
| `public/fontawesome` | 恢复 | 整桶静态资源权限位噪音 |
| `.codex` | 主体恢复，`config.toml` 单独归档/拆分 | 主体是权限噪音，`config.toml` 是未闭环的工具链配置修正候选 |
| `.claude` | 主体恢复，`settings.local.json` 归档后恢复或直接恢复 | 主体是权限噪音，内容改动偏本机权限定制 |
| `.gemini` | 恢复 | 纯权限位噪音 |
| `.planning` | 恢复 | 纯权限位噪音 |

## 11. 下一步建议

1. 先确认是否按上述矩阵执行第一批恢复。
2. 如果执行：
   - 恢复 `public/fontawesome`、`.gemini`、`.planning`
   - 恢复 `.codex`/`.claude` 的 mode-only 改动
   - 单独处理 `.codex/config.toml` 与 `.claude/settings.local.json`
3. 完成后再重新统计剩余脏工作区，进入下一批高风险目录审计。

## 12. 第一批恢复执行结果

- 已执行第一批恢复，覆盖：
  - `public/fontawesome`
  - `.gemini`
  - `.planning`
  - `.codex` 中除 `.codex/config.toml` 外的全部 mode-only 改动
  - `.claude` 中除 `.claude/settings.local.json` 外的全部 mode-only 改动
- 随后已恢复：
  - `.codex/config.toml`
  - `.claude/settings.local.json`
- 恢复后验证结果：
  - `git diff --name-only -- public/fontawesome .codex .claude .gemini .planning` 输出为空
  - 说明这 5 个目录当前已完全退出脏工作区

## 13. 已归档决策

### 13.1 `.codex/config.toml`

- 决策：**不保留，恢复**
- 归档理由：
  - 该 diff 的有效内容是把 `config_file` 改成相对路径，并移除 `SessionStart` 的 `gsd-update-check.js` hook
  - 但 `.codex` 体系内仍残留大量 `/home/DONG/...` 绝对路径引用，这不是闭环修复
  - 若后续要做 Codex/GSD 可移植性整理，应作为单独工具链修复项处理，而不是继续挂在脏工作区

### 13.2 `.claude/settings.local.json`

- 决策：**不保留，恢复**
- 归档理由：
  - 该 diff 的有效内容是新增本机代理权限白名单，如 `sudo apt-get *`、`gh auth *`、`ssh-keygen *`、`ssh -T git@github.com` 与读取 `~/.ssh/**`
  - 这类内容明显偏本机环境，不属于当前仓库共享改动

## 14. 恢复后的工作区体量

- 当前脏工作区总量：**1227**
- 其中：
  - 已跟踪修改：**1221**
  - 未跟踪文件：**6**
- 相比基线 `4061`，本轮已清除 **2834** 个脏文件。

## 15. 恢复后的剩余重心

- 当前最大剩余脏文件桶已经切换为产品源码：
  - `src`：**613**
  - 其中主要集中在：
    - `src/assets`：**228**
    - `src/views`：**112**
    - `src/components`：**83**
    - `src/database`：**70**
- `src/views` / `src/components` 中最需要优先抽样的业务区域：
  - `components/emotional`：**43**
  - `views/emotional`：**33**
  - `views/assessment`：**18**
  - `components/training`：**14**

## 16. 下一轮建议

1. 从 `src` 开始第二轮审计，不再回到已清空的低风险工具目录。
2. 建议顺序：
   - `src/assets`
   - `src/components/emotional`
   - `src/views/emotional`
   - `src/views/assessment`
   - `src/database`
3. 继续沿用“先抽样判断 diff 形态，再决定恢复 / 保留 / 归档”的方式，不直接假设这些源码改动都是同一类问题。

## 17. 第二轮执行结果

- 已完成第二轮与后续扩展审计，并执行恢复：
  - `src/assets`
  - `src/components/emotional`
  - `src/views/emotional`
  - `src/views/assessment`
  - `src/database`
  - `assets`
  - `public`
  - `.archive`
  - `build`
  - `electron`
  - `license-generator-dist`
  - `tests`
  - `package.json`
  - `vite.config.ts`
  - `tsconfig.app.json`
  - `tsconfig.emotional.json`
  - `tsconfig.json`
  - `tsconfig.node.json`
  - `test-sdq-e2e.py`
  - 上述目录外的大量根目录 mode-only 文件
- 已完成文档目录 mode-only 噪音恢复：
  - `docs/` 中除 `docs/INDEX.md`、`docs/reports/2026-04-19-dirty-worktree-baseline.md` 外，其余已跟踪文件均已恢复
- 已恢复本地生成/环境漂移文件：
  - `package-lock.json`
  - `sdq_assess.db`

## 18. `src` 的真实保留项

经过整桶清理后，`src` 中只保留一组自洽的 `CNBSR2016` 改动：

- 已跟踪：
  - `src/config/CNBSR2016FeedbackConfig.js`
  - `src/features/assessment/cnbsr2016/report-model.ts`
  - `src/strategies/assessment/Cnbsr2016Driver.ts`
- 未跟踪：
  - `src/config/CNBSR2016FeedbackConfig.d.ts`
  - `src/types/cnbsr2016-feedback.ts`

当前判断：

- 这 5 个文件属于同一工作项，不是权限位噪音。
- 目的主要有两类：
  - 为 `CNBSR2016` 反馈配置补充显式类型约束
  - 通过类型守卫收紧 `borderline | delayed` 干预分支，避免宽泛状态流入 IEP intervention 逻辑

验证：

- 已运行：
  - `export PATH=/home/shinecan/.config/nvm/versions/node/v24.14.1/bin:$PATH; npm run type-check`
- 结果：
  - `vue-tsc --build` 退出码为 `0`

建议策略：**保留**

## 19. `scripts` 的真实保留项

经过脚本目录清理后，只保留 5 个真实内容改动：

- `scripts/verify-cnbsr2016-feedback.mjs`
- `scripts/verify-cnbsr2016-item-bank.mjs`
- `scripts/verify-cnbsr2016-phase20-runtime.mjs`
- `scripts/verify-fine-motor-driver.mjs`
- `scripts/verify-sm-driver.mjs`

当前判断：

- 其中 3 个小改动把脚本中的 `/home/DONG/Mycode/SCGP` 绝对路径改成了基于 `import.meta.url` 的相对根路径解析，属于可移植性修正。
- `verify-cnbsr2016-feedback.mjs` 与 `verify-cnbsr2016-item-bank.mjs` 则明显从“轻量检查”扩展为“官方结构/状态/覆盖率/来源追踪校验”，与 `CNBSR2016` 工作项直接相关。

建议策略：**保留**

## 20. 文档真实保留项

当前文档侧只保留 3 个真实内容改动：

- `README.md`
- `docs/INDEX.md`
- `docs/reports/2026-04-19-dirty-worktree-baseline.md`

其中：

- `README.md`
  - 当前 diff 是把 `/home/DONG/Mycode/SCGP/...` 绝对本地路径链接改成仓库内相对链接
  - 判断：属于文档可移植性修正，**保留**
- `docs/INDEX.md`
  - 当前 diff 同样是把绝对本地路径改成相对链接
  - 判断：属于文档可移植性修正，**保留**
- `docs/reports/2026-04-19-dirty-worktree-baseline.md`
  - 为本轮新增和持续更新的审计报告
  - 判断：**保留**

## 21. 当前剩余未跟踪项

### 21.1 保留

- `src/config/CNBSR2016FeedbackConfig.d.ts`
- `src/types/cnbsr2016-feedback.ts`
- `docs/planning/生活自理小游戏细化 PRD.md`
- `docs/planning/社交_精细_安抚游戏_细化PRD.md`

判断：

- 前两者与 `CNBSR2016` 代码改动构成完整类型补充。
- 后两者是实质性 PRD/实施规格草稿，不像临时垃圾文件。

### 21.2 已删除垃圾项

- `.superpowers/brainstorm/**`
- `docs/planning/生活自理小游戏细化 PRD.mdZone.Identifier`

- 清理原因：
  - `.superpowers/brainstorm/**` 是本地 brainstorming 临时产物
  - `Zone.Identifier` 是典型 Windows 元数据残留，不属于仓库业务内容

## 22. 当前收敛状态

- 当前脏工作区总量：**16**
- 其中：
  - 已跟踪修改：**12**
  - 未跟踪：**4**
- 相比原始基线 `4061`，本轮累计已清除 **4045** 项脏工作区。

## 23. 当前保留矩阵

| 路径 | 建议策略 | 说明 |
| --- | --- | --- |
| `.continue-here.md` | 保留 | 当前续接入口，已更新到本轮状态 |
| `docs/reports/2026-04-19-dirty-worktree-baseline.md` | 保留 | 当前脏工作区审计基线与执行记录 |
| `README.md` | 保留 | 绝对路径链接改相对路径 |
| `docs/INDEX.md` | 保留 | 绝对路径链接改相对路径 |
| `src/config/CNBSR2016FeedbackConfig.js` | 保留 | `CNBSR2016` 类型/逻辑收紧 |
| `src/features/assessment/cnbsr2016/report-model.ts` | 保留 | `CNBSR2016` 干预状态守卫 |
| `src/strategies/assessment/Cnbsr2016Driver.ts` | 保留 | `CNBSR2016` 干预状态守卫 |
| `src/config/CNBSR2016FeedbackConfig.d.ts` | 保留 | `CNBSR2016` 配置类型声明 |
| `src/types/cnbsr2016-feedback.ts` | 保留 | `CNBSR2016` 配置类型定义 |
| `scripts/verify-cnbsr2016-feedback.mjs` | 保留 | `CNBSR2016` 验证脚本增强 |
| `scripts/verify-cnbsr2016-item-bank.mjs` | 保留 | `CNBSR2016` 验证脚本增强 |
| `scripts/verify-cnbsr2016-phase20-runtime.mjs` | 保留 | 去除绝对路径依赖 |
| `scripts/verify-fine-motor-driver.mjs` | 保留 | 去除绝对路径依赖 |
| `scripts/verify-sm-driver.mjs` | 保留 | 去除绝对路径依赖 |
| `docs/planning/生活自理小游戏细化 PRD.md` | 保留 | 新增 PRD 草稿 |
| `docs/planning/社交_精细_安抚游戏_细化PRD.md` | 保留 | 新增 PRD 草稿 |

## 24. 下一步建议

1. 当前脏工作区审计已经收口完成，剩余 16 项均为明确保留项。
2. 若继续推进实现或提交流程，建议把剩余改动拆成 3 组看待：
   - 审计文档：`.continue-here.md`、`docs/reports/2026-04-19-dirty-worktree-baseline.md`
   - 文档可移植性修正：`README.md`、`docs/INDEX.md`
   - `CNBSR2016` 代码与验证脚本：`src/*`、`scripts/verify-*`、对应类型文件
3. 后续如果要提交，优先避免把审计文档和 `CNBSR2016` 业务改动混成一个提交。
