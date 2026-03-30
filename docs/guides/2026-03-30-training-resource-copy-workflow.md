# 训练资源统一文案操作说明

> 职责：说明如何统一维护资源中心里训练资源的名称与描述文案，并同步到现有数据库与正式交付版本。  
> 适用范围：感官器材、感官游戏、情绪调节游戏、情绪行为场景、physical-equipment 器材。  
> 最后更新：2026-03-30

## 1. 目的

现在训练资源文案已经收口到一套统一流程，目标是：

- 所有训练资源文案只改一份主表
- 新初始化数据库自动吃到最新文案
- 已有本地数据库可按稳定键批量同步文案
- 避免因为改标题或描述而生成重复资源

## 2. 这套流程里的关键文件

主编辑文件：

- `docs/references/resource-copy/2026-03-30-training-resource-copy.csv`

生成文件：

- `src/data/generated-training-resource-copy.ts`
  - 由脚本生成
  - 不要手工编辑

公共稳定键与 CSV 解析：

- `src/utils/training-resource-copy.ts`

脚本入口：

- `npm run resource-copy:export`
- `npm run resource-copy:build`
- `npm run resource-copy:sync`

## 3. 资源唯一键规则

每一行文案都靠 `resourceKey` 绑定到真实资源，不靠名称匹配。

- 感官器材：`sensory-equipment:<legacyId>`
  - 例：`sensory-equipment:1`
- 感官游戏：`sensory-game:<taskId>`
  - 例：`sensory-game:1`
- 情绪调节游戏：`emotional-game:<gameCode>`
  - 例：`emotional-game:G01_BALLOON`
- 情绪场景：`emotion-scene:<sceneCode>`
- 表达关心：`care-scene:<sceneCode>`
- physical-equipment：`physical-equipment:<resourceCode>`

注意：

- `resourceKey` 是稳定键，不要随意修改。
- 感官器材当前仍依赖 `equipment-data.ts` 的 `legacy_id` 顺序；不要无意义重排那份数组。

## 4. CSV 字段说明

主表字段如下：

- `resourceKey`：稳定键，必须唯一
- `origin`：来源类型，用于识别资源链路
- `moduleCode`：资源所属模块
- `resourceType`：资源类型，如 `equipment` / `game` / `emotion_scene`
- `name`：资源显示名称
- `description`：资源描述
- `previewDescription`：当前主要给情绪调节游戏使用
- `repeatPlayHint`：当前主要给情绪调节游戏使用

除非明确需要，不要改 `origin`、`moduleCode`、`resourceType`。

## 5. 日常改文案流程

适用于“我要修改正式交付前的训练资源文案”。

1. 编辑 `docs/references/resource-copy/2026-03-30-training-resource-copy.csv`
2. 保存后运行：

```bash
npm run resource-copy:build
```

3. 再运行：

```bash
npm run type-check
```

4. 启动应用，验证资源中心展示是否符合预期

这一步会把 CSV 编译到 `src/data/generated-training-resource-copy.ts`，运行时和新数据库初始化都会读取它。

## 6. 同步现有本地数据库

适用于“当前本机已经有数据库，想把新文案批量同步进去”。

先看计划，不写库：

```bash
npm run resource-copy:sync -- --dry-run
```

确认后再真实写入：

```bash
npm run resource-copy:sync -- --yes
```

说明：

- 脚本会自动给数据库做备份
- 只更新匹配到稳定键的资源
- 不会因为这次同步额外新增重复资源
- 目前会同步这些字段：
  - `name`
  - `description`
  - 情绪调节游戏的 `previewDescription`
  - 情绪调节游戏的 `repeatPlayHint`
  - 情绪场景 / 表达关心里的 `metadata.title`

可选参数：

```bash
npm run resource-copy:sync -- --db "<数据库路径>" --yes
npm run resource-copy:sync -- --user-data-dir "<Electron userData 目录>" --dry-run
```

## 7. 正式交付前推荐流程

如果目标是“给客户出最终安装包”，推荐按下面顺序走：

1. 在 `docs/references/resource-copy/2026-03-30-training-resource-copy.csv` 完成最终文案修改
2. 运行 `npm run resource-copy:build`
3. 运行 `npm run type-check`
4. 用干净数据库启动应用，做资源中心验收
5. 确认无误后再打包

如果最终交付使用的是全新初始化数据库，通常不需要对客户数据库单独跑 `resource-copy:sync`。

## 8. 什么时候用 `resource-copy:export`

`resource-copy:export` 用于从当前代码现状导出一份完整模板。

初始化模板或导出到临时文件：

```bash
npm run resource-copy:export -- --out .tmp/training-resource-copy.csv
```

只有在你明确要“用当前代码重新覆盖主 CSV”时，才对正式主表用 `--force`：

```bash
npm run resource-copy:export -- --force
```

注意：

- 如果当前主 CSV 已经有人手工改过，直接 `--force` 会覆盖它。
- 更稳的做法是先导出到临时文件，再人工比对合并。

## 9. 当前覆盖范围

目前这套统一文案链已经覆盖：

- 感官器材
- 感官游戏
- 情绪调节游戏
- 情绪场景
- 表达关心场景
- physical-equipment 器材

教学资料不在这条链路里。

## 10. 常见问题

### 10.1 改了 CSV，为什么界面没变？

先确认两件事：

- 有没有运行 `npm run resource-copy:build`
- 当前看的是否是旧数据库；如果是旧数据库，还需要运行 `npm run resource-copy:sync -- --yes`

### 10.2 可以直接改 `generated-training-resource-copy.ts` 吗？

不可以。那是生成文件，下一次 build 会被覆盖。

### 10.3 这套流程会不会制造重复资源？

正常不会。

- 现有数据库同步是按稳定键原地更新
- 新数据库初始化时，感官游戏、情绪调节游戏、情绪场景、physical-equipment 都已经接入稳定键同步逻辑

### 10.4 什么时候要特别小心？

下面几种情况要谨慎：

- 想修改 `resourceKey`
- 想批量重命名并同时调整底层稳定标识
- 想重排 `equipment-data.ts` 中旧感官器材的顺序
- 想用 `resource-copy:export -- --force` 直接覆盖现有主 CSV

这几种都可能影响既有映射关系，操作前应先做备份并走 dry-run。
