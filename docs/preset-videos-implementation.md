# 预置视频资料功能实现文档

> 功能：在资源中心-教学资料中预置 389 个视频资料（约 5.1GB 原始文件），视频通过自解压包离线安装，不计入主程序体积。

## 一、功能概述

### 1.1 用户视角

- **已解压场景**：用户在「资源中心 → 教学资料」看到 389 个预置视频缩略图，点击播放正常
- **未解压场景**：仅显示缩略图、名称、维度等元数据，点击播放提示"视频文件缺失，请安装预置视频资料包"

### 1.2 安装流程

1. 用户收到 `scgp-preset-videos.exe`（体积以实际压缩结果为准）
2. 双击运行，选择 SCGP 安装目录（如 `D:\Program Files\scgp\`）
3. 自动解压到 `{installDir}/resources/assets/resources/videos/`
4. 重启 SCGP，视频资料立即可用

## 二、技术方案

### 2.1 路径设计

**双路径解析机制**（`resource-file-service.ts`）：

- **用户上传文件**：`teaching-materials/{uuid}.mp4` → `{userData}/resources/teaching-materials/{uuid}.mp4`
- **预置视频**：`assets/resources/videos/{dimensionCode}/{fileName}` → `{installDir}/resources/assets/resources/videos/{dimensionCode}/{fileName}`

判断规则：`file_path` 以 `assets/` 开头即为预置资源（只读），否则为托管资源（可写）。

### 2.2 数据库结构

**teaching_material 表**（389 条预置记录由 `seedPresetTeachingMaterials` 写入）：

```sql
INSERT INTO teaching_material (
  title,                  -- 视频名称（去 .mp4 后缀）
  dimension_code,         -- 业务维度：soothing-aids | emotional-regulation | ...
  module_code,            -- 所属模块：sensory | emotional | cognitive | ...
  file_name,              -- 文件名：三色安抚灯.mp4
  file_path,              -- 相对路径：assets/resources/videos/soothing-aids/三色安抚灯.mp4
  file_size_bytes,        -- 文件大小（字节）
  file_type,              -- 固定为 'video/mp4'
  is_preset,              -- 固定为 1（预置标记）
  created_at,
  updated_at
) VALUES (...);
```

**索引**：`idx_teaching_material_preset` 专用于快速查询预置资料。

### 2.3 Electron IPC 新增

| API                   | 功能                           | 返回值        |
| --------------------- | ------------------------------ | ------------- |
| `getAppResourcesPath` | 获取 `process.resourcesPath`   | `Promise<string>` |

调用示例：
```typescript
const resourcesPath = await window.electronAPI.getAppResourcesPath()
// 返回：D:\Program Files\scgp\resources
```

### 2.4 数据源

**预置数据清单**：`src/data/preset-teaching-materials.json`
- 389 条记录
- 按 7 个业务维度分组（安抚教具、情绪调节、感官训练、生活自理、社交沟通、精细动作、认知发展）
- 每条包含 `title`, `dimensionCode`, `moduleCode`, `fileName`, `filePath`, `fileSizeBytes`

**视频源文件**：`G:\SCGP_Rec\Video\带水印\`（不计入 Git，不打入主程序）

## 三、构建与打包

### 3.1 验证数据完整性

```bash
node scripts/test-preset-videos.cjs
```

**检查项**：
- JSON 格式正确性
- 必填字段完整性
- 路径格式符合 `assets/resources/videos/{dimensionCode}/{fileName}` 规范
- 源文件存在性
- 文件大小一致性

**输出示例**：
```
✅ JSON 文件加载成功，共 389 条记录

📊 数据统计:
按维度分组:
  - soothing-aids: 29 个
  - emotional-regulation: 32 个
  - sensory-training: 64 个
  - life-skills: 131 个
  - social-communication: 51 个
  - fine-motor: 32 个
  - cognitive-development: 50 个

总计: 389 个, 5218.62 MB
```

### 3.2 打包自解压文件

```bash
node scripts/package-preset-videos.cjs
```

**前置条件**：
- 安装 7-Zip（`C:\Program Files\7-Zip\7z.exe`）
- 视频源文件位于 `G:\SCGP_Rec\Video\带水印\`

**流程**：
1. 在 `temp-videos/` 创建目标目录结构 `assets/resources/videos/{dimensionCode}/`
2. 复制所有视频文件到对应目录
3. 使用 7-Zip 压缩为 `.7z` 格式（`-mx=5` 中等压缩）
4. 合并 `7z.sfx` + SFX 配置 + 压缩包 → `dist/scgp-preset-videos.exe`
5. 清理临时文件

**输出**：`dist/scgp-preset-videos.exe`（体积以实际压缩结果为准）

**SFX 配置**：
- 标题：「SCGP 星愿能力发展平台 - 预置视频资料库」
- 提示：引导用户选择 SCGP 安装目录
- 解压路径：相对于用户选择的目录，自动创建 `resources/assets/resources/videos/`

## 四、主程序构建排除

### 4.1 .gitignore 规则

```gitignore
# 预置视频源文件（约 5.1GB，不计入版本控制）
assets/resources/videos/
```

### 4.2 Electron Builder 配置

**确认** `package.json` 的 `build.extraResources.filter` 显式排除 `assets/resources/videos/`，避免打包到主程序：

```json
{
  "extraResources": [
    {
      "from": "assets/resources",
      "to": "assets/resources",
      "filter": ["**/*", "!videos/**/*"]
    }
  ]
}
```

**验证**：主程序安装包体积应 < 100MB（不含视频）。

## 五、交付清单

### 5.1 代码改动

| 文件                              | 改动                                      |
| --------------------------------- | ----------------------------------------- |
| `electron/main.mjs`               | 新增 `get-app-resources-path` IPC handler |
| `electron/preload.mjs`            | 暴露 `getAppResourcesPath` 到渲染进程     |
| `env.d.ts`                        | 添加 `getAppResourcesPath` 类型声明       |
| `src/types/electron.d.ts`         | 添加 `getAppResourcesPath` 类型声明       |
| `src/utils/resource-file-service.ts` | 实现双路径解析（`assets/` 前缀特殊处理） |
| `src/database/init.ts`            | 新增 `seedPresetTeachingMaterials` 函数   |

**统计**：7 个文件，+126 行，-3 行

### 5.2 数据文件

| 文件                                      | 说明                      | 纳入 Git |
| ----------------------------------------- | ------------------------- | -------- |
| `src/data/preset-teaching-materials.json` | 389 条预置视频元数据（约 67KB） | ✅        |
| `scripts/test-preset-videos.cjs`          | 数据验证脚本              | ✅        |
| `scripts/package-preset-videos.cjs`       | 自解压文件打包脚本        | ✅        |
| `docs/preset-videos-guide.md`             | 用户使用指南              | ✅        |
| `docs/preset-videos-implementation.md`    | 技术实现文档（本文档）    | ✅        |

### 5.3 可交付物

- ✅ 代码改动已完成，`npm run type-check` 通过
- ✅ 数据验证脚本可用
- ✅ 打包脚本可用
- 🔲 **待生成**：`dist/scgp-preset-videos.exe`（需执行 `node scripts/package-preset-videos.cjs`）

## 六、验证步骤

### 6.1 开发环境验证

1. **启动应用**：`npm run dev`
2. **检查数据库**：打开应用后，执行 SQL 查询
   ```sql
   SELECT COUNT(*) FROM teaching_material WHERE is_preset = 1;
   -- 预期：389
   ```
3. **查看界面**：进入「资源中心 → 教学资料」，应看到 389 个视频缩略图
4. **点击播放**：提示"视频文件缺失"（因为开发环境没有物理文件）

### 6.2 生产环境验证

1. **构建主程序**：`npm run build:electron`
2. **安装主程序**：安装到 `D:\Program Files\scgp\`
3. **运行自解压包**：双击 `scgp-preset-videos.exe`，选择 `D:\Program Files\scgp\`
4. **验证解压结果**：
   ```powershell
   dir "D:\Program Files\scgp\resources\assets\resources\videos"
   # 应看到 7 个业务维度目录，共 389 个 .mp4 文件
   ```
5. **启动应用并播放**：视频正常播放

## 七、已知限制与未来优化

### 7.1 当前限制

- 预置视频必须手动安装（用户需要额外步骤）
- 视频文件无法自动更新（需重新发布自解压包）
- 删除预置视频会静默失败（`deleteManagedFile` 对 `assets/` 前缀返回 `false`）

### 7.2 优化方向

- **在线下载**：首次启动时提供"下载预置资料"选项，后台下载并解压
- **增量更新**：仅下载新增或变更的视频
- **CDN 分发**：将自解压包托管到 CDN，提供下载链接

## 八、故障排查

### 8.1 视频无法播放

**症状**：点击视频提示"视频文件缺失"

**排查**：
1. 检查物理文件是否存在：
   ```powershell
   dir "{installDir}\resources\assets\resources\videos\soothing-aids\三色安抚灯.mp4"
   ```
2. 检查数据库路径：
   ```sql
   SELECT file_path FROM teaching_material WHERE title = '三色安抚灯';
   -- 预期：assets/resources/videos/soothing-aids/三色安抚灯.mp4
   ```
3. 检查路径解析逻辑：在 `resource-file-service.ts` 的 `resolveAbsolutePath` 打断点

### 8.2 自解压包制作失败

**症状**：`node scripts/package-preset-videos.cjs` 报错

**常见原因**：
- 7-Zip 未安装或不在 `C:\Program Files\7-Zip\`
- 视频源文件路径错误（不在 `G:\SCGP_Rec\Video\带水印\`）
- 磁盘空间不足（临时目录至少需要约 5.1GB，另需预留压缩包输出空间）

**解决方案**：
- 安装 7-Zip：https://www.7-zip.org/
- 检查源文件路径：`dir "G:\SCGP_Rec\Video\带水印"`
- 清理磁盘空间

## 九、相关文档

- [用户使用指南](./preset-videos-guide.md) — 面向终端用户的安装说明
- [资源文件生命周期设计](../docs/plans/2026-07-15-a4-resource-file-lifecycle-plan.md) — 托管路径 vs 预置路径的架构设计

---

**文档版本**：v1.0  
**更新时间**：2026-07-21  
**负责人**：Kiro (Claude Code)
