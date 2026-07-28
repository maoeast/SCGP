# 物理器材图片目录

> 2026-07-28 起图片物理路径已统一：WebP 迁至 `assets/resources/images/physical-equipment/<domain>/`，运行时经 `resource://images/physical-equipment/<domain>/<resourceCode>.webp` 解析；本目录只保留解析模块 `images.ts`（含已落地 key 清单）与各 domain 说明，不再存放图片字节。

~~本目录用于存放将来会被程序直接引用的物理器材图片。~~（图片已迁出，见上方说明）

与 `src/assets/images/equipment/` 的关系：
- `equipment/`：当前感官器材的旧规则目录，依赖 `category + legacy_id`
- `physical-equipment/`：新规则目录，建议用于情绪调节、社交沟通、精细动作、安抚教具

## 新规则

新物理器材图片建议不再使用：

```text
{category}-{id}.webp
```

改为使用稳定 `resourceCode` 命名：

```text
{resourceCode}.webp
```

示例：

```text
emotional-regulation-breathing-ball-001.webp
social-communication-turn-taking-cards-001.webp
fine-motor-tweezer-set-001.webp
soothing-aids-weighted-lap-pad-001.webp
```

## 子目录约定

- `emotional-regulation/`
- `social-communication/`
- `fine-motor/`
- `soothing-aids/`

## 图片规格建议

- 推荐格式：`webp`
- 推荐尺寸：`128x128` 或 `256x256`
- 单张体积：尽量 `< 80KB`
- 背景：优先纯色或透明，保证资源中心卡片展示稳定

## 后续接入建议

后续代码应优先按 `resourceCode` 找图，而不是按数据库顺序编号找图。
这样导入 CSV 重排、插入新资源或删除旧资源时，不会导致整批图片映射失效。
