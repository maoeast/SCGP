# 教学资料缩略图导入指南

本文档说明如何将外部缩略图批量导入到项目资源目录。

## 背景

- **源目录**: `G:\SCGP_Rec\Video\thumbnails`（按维度组织的 389 个视频缩略图）
- **目标目录**: `E:\VSC\H5\SIC-ADS\assets\resources\images\teaching-materials`
- **目标结构**: `{dimension-code}/{id}.jpg`

## 操作步骤

### 1. 启动应用导出教学资料数据

```bash
npm run dev
```

### 2. 在浏览器开发者工具 Console 中运行

```javascript
// 导出教学资料数据
const { materialsStore } = await import("@/stores/materials-store")
await materialsStore.loadTeachingMaterials()
const materials = materialsStore.teachingMaterials

// 直接下载为文件（推荐）
const blob = new Blob([JSON.stringify(materials, null, 2)], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'teaching-materials-export.json'
a.click()
URL.revokeObjectURL(url)
```

### 3. 将下载的 JSON 文件放到 scripts 目录

```bash
# Windows
move Downloads\teaching-materials-export.json scripts\teaching-materials-export.json
```

### 4. 运行缩略图复制脚本

```bash
node scripts/copy-thumbnails-to-project.mjs
```

脚本会：
1. 读取教学资料数据
2. 根据 `fileName` 和 `title` 匹配缩略图文件
3. 复制到 `assets/resources/images/teaching-materials/{dimension-code}/{id}.jpg`

## 匹配策略

脚本使用两种策略匹配缩略图：

1. **精确匹配**: 文件名完全匹配
2. **模糊匹配**: 移除前导序号后的标题匹配

例如：
- 资料标题: `10洗脸、洗手和洗脚（中）`
- 缩略图文件: `10洗脸、洗手和洗脚（中）.jpg` ✓ 精确匹配
- 或: `洗脸、洗手和洗脚（中）.jpg` ✓ 模糊匹配
