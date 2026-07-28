# 物理器材资源参考目录

本目录用于存放尚未进入运行时程序的数据源与参考资料。

适合放在这里的内容：
- CSV 初稿
- 导入前清洗版 CSV
- 字段映射说明
- 资源编码草案
- 图片采集清单

不适合放在这里的内容：
- 运行时直接读取的 TypeScript seed
- 打包进应用的图片
- 仅存在于本机临时目录的数据库导出

## 子目录约定

- `emotional-regulation/`：情绪调节器材
- `social-communication/`：社交沟通器材
- `fine-motor/`：精细动作器材
- `soothing-aids/`：安抚教具

## 文件命名建议

CSV 初稿建议带日期和状态，便于迭代追踪：

```text
2026-03-26-emotional-regulation-equipment-draft.csv
2026-03-26-social-communication-equipment-draft.csv
2026-03-26-fine-motor-equipment-draft.csv
2026-03-26-soothing-aids-equipment-draft.csv
```

## 推荐字段

建议 CSV 至少包含这些字段：

```text
resourceCode,moduleCode,resourceType,domain,name,description,abilityTags,imageFile,coverImage,notes,status
```

字段说明：
- `resourceCode`：稳定资源编码，后续建议作为图片命名和导入匹配主键
- `moduleCode`：建议值如 `emotional`、`social`
- `resourceType`：当前建议统一为 `equipment`
- `domain`：如 `emotional-regulation`、`social-communication`
- `name`：资源名称
- `description`：资源说明
- `abilityTags`：标签，建议用 `|` 分隔
- `imageFile`：原始图片文件名草案
- `coverImage`：后续程序实际引用路径，前期可留空
- `notes`：导入备注
- `status`：如 `draft`、`reviewed`、`ready`

## resourceCode 命名规则

不要继续绑定数据库 `legacy_id`。

统一使用稳定编码：

```text
{domain}-{slug}-{nnn}
```

示例：

```text
emotional-regulation-breathing-ball-001
social-communication-turn-taking-cards-001
fine-motor-tweezer-set-001
soothing-aids-weighted-lap-pad-001
```

规则：
- 小写字母、数字、连字符
- 不使用中文空格
- 不直接依赖导入顺序
- 同一资源换图时尽量不改 `resourceCode`

## 与运行时图片目录的关系

本目录中的 CSV 和草稿图片命名，最终会映射到：

- `assets/resources/images/physical-equipment/<domain>/`（运行时经 `resource://` 解析）

那一侧是运行时目录，只放已经确定可被程序引用的图片资源。

## 当前已落地的导入方案

当前代码已实现以下链路：

- 解析入口：
  - `src/database/physical-equipment-parser.ts`
  - `src/database/physical-equipment-data.ts`
- 数据库落点：
  - `sys_training_resource`
  - `sys_tags`
  - `sys_resource_tag_map`
- 初始化接入：
  - `src/database/init.ts`
- 现有库导入脚本：
  - `scripts/import-physical-equipment-resources.cjs`
  - `npm run import:physical-equipment -- --yes`

## 当前草稿 CSV 的真实导入规模

当前四份草稿 CSV 会被规范化为：

- `45 emotional-regulation`
- `50 social-communication`
- `35 fine-motor`
- `38 soothing-aids`
- 合计 `168` 条系统资源

## resourceCode 生成规则（当前实现）

如果输入 CSV 已显式提供 `resourceCode`，导入链路会直接使用该值。

如果当前草稿 CSV 仍是中文原始列头、尚未提供 `resourceCode`，当前实现会自动生成稳定编码：

```text
{domain}-box{xx}-seq{yyy}[-variant]
```

示例：

```text
emotional-regulation-box01-seq001
social-communication-box06-seq013
fine-motor-box18-seq026
soothing-aids-box29-seq038
```

说明：
- 这套编码不再依赖数据库 `legacy_id`
- 它基于草稿 CSV 的来源结构（domain / box / sequence）生成，便于先完成数据库导入与图片目录占位
- 后续如果你补齐了显式 `resourceCode` 列，现有导入链路会优先采用人工确定的编码
