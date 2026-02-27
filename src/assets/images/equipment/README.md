# 器材图片使用说明

## 目录结构

```
src/assets/images/equipment/
├── images.ts          # 图片加载模块
├── README.md          # 本文件
├── tactile-1.webp     # 触觉-感官手环 (待添加)
├── tactile-2.webp     # 触觉-感官石 (待添加)
├── ...
└── integration-62.webp  # 最后一个器材 (待添加)
```

## 添加真实图片

### 1. 图片规格

| 属性 | 推荐值 |
|------|--------|
| 尺寸 | 96x96px 或 128x128px |
| 格式 | WebP（推荐）或 PNG |
| 单张大小 | < 20KB |
| 命名格式 | `{category}-{id}.webp` |

### 2. 命名规则

```
{category}-{id}.webp
```

**category**（主分类）：
- `tactile` - 触觉
- `olfactory` - 嗅觉
- `visual` - 视觉
- `auditory` - 听觉
- `gustatory` - 味觉
- `proprioceptive` - 本体觉
- `integration` - 综合

**示例**：
```
tactile-1.webp    # ID=1 的触觉器材（感官手环）
visual-30.webp    # ID=30 的视觉器材（流动光球）
```

### 3. 操作步骤

1. 准备图片文件（96x96px 或 128x128px 的 WebP 格式）
2. 重命名为 `{category}-{id}.webp`
3. 放入此目录 (`src/assets/images/equipment/`)
4. 运行 `npm run dev` 或 `npm run electron:dev`

### 4. 自动回退

如果图片文件不存在，系统会自动显示占位符（彩色背景 + 首字母），不会报错。

## 器材 ID 对照表

| ID | 分类 | 名称 | 文件名 |
|----|------|------|--------|
| 1-24 | tactile | 触觉系统套装 | `tactile-1.webp` ~ `tactile-24.webp` |
| 25-30 | olfactory | 嗅觉系统套装 | `olfactory-25.webp` ~ `olfactory-30.webp` |
| 31-37 | visual | 视觉系统套装 | `visual-31.webp` ~ `visual-37.webp` |
| 38-44 | auditory | 听觉系统套装 | `auditory-38.webp` ~ `auditory-44.webp` |
| 45-46 | gustatory | 味觉系统套装 | `gustatory-45.webp` ~ `gustatory-46.webp` |
| 47-48 | proprioceptive | 本体觉系统套装 | `proprioceptive-47.webp` ~ `proprioceptive-48.webp` |
| 49-62 | integration | 感官综合箱套装 | `integration-49.webp` ~ `integration-62.webp` |

## 图片处理工具推荐

- **压缩**：Squoosh (https://squoosh.app/)
- **批量处理**：ImageMagick (`convert input.png -quality 80 output.webp`)
- **在线工具**：TinyPNG、CloudConvert

## 注意事项

1. ✅ 图片会自动被 Vite 优化（压缩、hash 命名）
2. ✅ 无需手动更新代码，放入文件即可生效
3. ⚠️ 图片更改后需要重新构建 (`npm run build`)
4. ⚠️ 避免使用过大的图片，影响加载速度
