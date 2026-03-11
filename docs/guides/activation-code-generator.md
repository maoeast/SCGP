# 激活码生成工具使用文档

## 概述

这是一个用于生成和管理系统激活码的命令行工具，支持多种激活类型和灵活的生成方式。

## 快速开始

### 交互式模式（推荐）

```bash
npm run generate:activation
```

按照提示依次选择：
1. 激活类型（永久/教育版/企业版/试用版）
2. 是否绑定特定机器码
3. 生成数量
4. 是否导出到文件及文件格式

## 命令行参数

### 完整参数列表

| 参数 | 简写 | 说明 | 示例 |
|------|------|------|------|
| `--interactive` | `-i` | 启用交互式模式 | `-i` |
| `--type <类型>` | `-t` | 指定激活类型 | `-t full` |
| `--machine <码>` | `-m` | 绑定指定机器码 | `-m A1B2C3D4` |
| `--count <数量>` | `-c` | 批量生成数量（1-100） | `-c 10` |
| `--output <文件>` | `-o` | 导出到文件 | `-o codes.json` |
| `--help` | `-h` | 显示帮助信息 | `-h` |

## 激活类型说明

| 类型代码 | 类型名称 | 有效期 | 适用场景 | 前缀标识 |
|----------|----------|--------|----------|----------|
| `full` | 永久激活 | 永久有效 | 正式授权用户 | FULL |
| `education` | 教育版 | 365天（1年） | 教育机构、学校 | EDU |
| `enterprise` | 企业版 | 1095天（3年） | 企业用户 | ENT |
| `trial` | 试用版 | 7天 | 试用评估 | TRIAL |

## 激活码格式

```
SPED-XXXX-XXXX-XXXX-XXXX
```

### 格式说明

| 位置 | 内容 | 说明 |
|------|------|------|
| 第1段 | `SPED` | 产品前缀（固定） |
| 第2段 | `FULL`/`EDU`/`ENT`/`TRIAL` | 类型标识 |
| 第3段 | 4位字符 | 机器码绑定部分（绑定机器时为机器码哈希） |
| 第4段 | 4位随机字符 | 随机码 |
| 第5段 | 4位字符 | 数字签名（HMAC-SHA256） |

### 示例激活码

```
SPED-FULL-A1B2-C3D4-E5F6
SPED-EDU7-X9Y8-Z7W6-V5U4
SPED-ENT3-M1N2-B3V4-C5X6
```

## 使用示例

### 示例1：生成单个永久激活码

```bash
node scripts/generate-activation.js -t full
```

输出：
```
🔑 激活码:
   SPED-FULL-A1B2-C3D4-E5F6

📦 类型:
   永久激活 (full)

📝 描述:
   永久有效，无时间限制

🖥️  机器码:
   未绑定

⏰ 有效期:
   永久有效
```

### 示例2：生成10个教育版激活码

```bash
node scripts/generate-activation.js -t education -c 10
```

输出：
```
✅ 成功生成 10 个激活码:

  1. SPED-EDU7-A1B2-C3D4-E5F6
  2. SPED-EDU7-X9Y8-Z7W6-V5U4
  3. SPED-EDU7-M1N2-B3V4-C5X6
  ...
```

### 示例3：为指定机器码生成绑定激活码

```bash
node scripts/generate-activation.js -t full -m A1B2C3D4E5F6
```

说明：生成的激活码将只在该机器码上有效。

### 示例4：批量生成并导出为JSON

```bash
node scripts/generate-activation.js -t enterprise -c 5 -o codes.json
```

生成的JSON文件格式：
```json
[
  {
    "code": "SPED-ENT3-A1B2-C3D4-E5F6",
    "type": "enterprise",
    "typeName": "企业版",
    "description": "有效期3年，适用于企业用户",
    "machineCode": "未绑定",
    "validDays": 1095,
    "expiresAt": "2027-12-26T10:30:00.000Z",
    "generatedAt": "2024-12-26T10:30:00.000Z"
  }
]
```

### 示例5：导出为CSV格式（方便Excel打开）

```bash
node scripts/generate-activation.js -t full -c 20 -o codes.csv
```

生成的CSV文件格式：
```csv
激活码,类型,类型名称,机器码,有效期(天),过期时间,生成时间
SPED-FULL-A1B2-C3D4-E5F6,full,永久激活,未绑定,永久,永久,2024-12-26 10:30:00
```

### 示例6：导出为纯文本格式

```bash
node scripts/generate-activation.js -t education -c 5 -o codes.txt
```

生成的TXT文件格式：
```
SPED-EDU7-A1B2-C3D4-E5F6 - 教育版
SPED-EDU7-X9Y8-Z7W6-V5U4 - 教育版
```

## 导出文件格式对比

| 格式 | 扩展名 | 优点 | 适用场景 |
|------|--------|------|----------|
| JSON | `.json` | 结构化数据，包含完整信息 | 程序处理、数据备份 |
| CSV | `.csv` | 表格格式，Excel可直接打开 | 人工查看、打印记录 |
| TXT | `.txt` | 纯文本，只包含激活码 | 快速分发、简单记录 |

## 机器码说明

### 什么是机器码？

机器码是用于唯一标识一台设备的特征码，基于浏览器指纹生成。

### 如何获取机器码？

1. 在系统中打开激活管理页面（如有）
2. 或运行以下命令查看当前机器码：
   ```bash
   # 在浏览器控制台中运行
   # （系统激活页面会显示）
   ```

### 机器码绑定的影响

- **未绑定**：激活码可在任意设备上使用
- **已绑定**：激活码只能在指定机器码的设备上激活使用

## 常见问题

### Q1: 生成的激活码在哪里验证？

激活码验证逻辑在 `src/utils/activation-manager.ts` 中的 `validateActivationCode()` 方法。

### Q2: 如何批量生成大量激活码？

```bash
# 一次最多生成100个
node scripts/generate-activation.js -t full -c 100 -o batch1.json
```

如需更多，可多次运行命令。

### Q3: 激活码会重复吗？

不会。每次生成的激活码都包含随机部分和基于时间戳的签名，确保唯一性。

### Q4: 可以修改激活码的有效期吗？

可以。修改 `scripts/generate-activation.js` 中的 `LICENSE_TYPES` 配置：

```javascript
const LICENSE_TYPES = {
  custom: {
    name: '自定义版',
    prefix: 'CUSTOM',
    days: 30,  // 修改这里的天数
    description: '有效期30天'
  }
};
```

### Q5: 如何查看已生成的激活码历史？

激活历史存储在数据库的 `activation` 表中，可通过系统的激活管理页面查看。

## 安全建议

1. **妥善保管**：生成的激活码文件应妥善保管，避免泄露
2. **记录分发**：建议记录每个激活码的分发情况
3. **定期审计**：定期检查激活使用情况，发现异常及时作废
4. **使用绑定**：对于重要客户，建议使用机器码绑定功能

## 技术细节

### 签名算法

激活码使用 HMAC-SHA256 算法进行数字签名，密钥为：

```
SPED-SAFE-EDU-2025-SECRET-KEY
```

### 随机字符集

使用排除易混淆字符的字符集：

```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

排除了：`0`（零）、`O`（字母O）、`I`（字母I）、`1`（数字1）

## 开发相关

### 文件位置

- 生成工具：`scripts/generate-activation.js`
- 验证逻辑：`src/utils/activation-manager.ts`
- 管理界面：`src/views/ActivationAdmin.vue`

### 添加新的激活类型

1. 编辑 `scripts/generate-activation.js`
2. 在 `LICENSE_TYPES` 中添加新类型
3. 重新运行生成命令

## 更新日志

### v1.0.0 (2024-12-26)
- 初始版本
- 支持四种激活类型
- 支持交互式和命令行两种模式
- 支持导出JSON、CSV、TXT三种格式
- 支持机器码绑定
- 支持批量生成

## 联系与反馈

如有问题或建议，请联系开发团队。
