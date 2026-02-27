---
name: license-manager
description: 提供许可证生成、验证和管理功能。当用户需要生成许可证、验证激活码、管理激活信息或处理许可证相关逻辑时使用此 skill。
---

# 许可证管理 Skill

此 skill 提供感官综合训练与评估系统的许可证管理功能，包括许可证生成、验证、激活和管理。

## 何时使用

- 生成新的许可证密钥和激活码
- 验证用户输入的激活码
- 查询激活信息和过期状态
- 管理许可证的到期和续期
- 处理机器码验证
- 批量生成许可证
- 导出激活码列表

## 许可证系统概述

### 许可证类型

1. **试用版许可证**
   - 时限：30 天
   - 功能：部分功能限制
   - 无硬件绑定

2. **标准版许可证**
   - 时限：1 年
   - 功能：完整功能
   - 绑定一台机器

3. **企业版许可证**
   - 时限：永久或多年
   - 功能：完整功能 + 高级特性
   - 绑定多台机器

### 许可证数据结构

#### activation 表结构

```sql
CREATE TABLE IF NOT EXISTS activation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL UNIQUE,
  activation_code TEXT NOT NULL,
  activation_date DATE NOT NULL,
  expiry_date DATE,
  machine_code TEXT,
  status TEXT DEFAULT 'active'
)
```

**字段说明**：

- `license_key`: 许可证密钥（加密存储）
- `activation_code`: 激活码（用户可见，用于激活）
- `activation_date`: 激活日期
- `expiry_date`: 过期日期
- `machine_code`: 机器码（硬件指纹）
- `status`: 状态（'active', 'expired', 'revoked'）

## 使用方法

### 1. 生成许可证

#### 单个许可证生成

使用 `scripts/generate-license.js` 生成单个许可证：

```bash
node scripts/generate-license.js --type standard --days 365
```

生成的许可证包含：

- 许可证密钥（加密）
- 激活码（明文）
- 到期日期
- 机器码绑定选项

#### 批量许可证生成

```bash
node scripts/generate-license.js --batch --count 10 --type standard
```

### 2. 验证许可证

#### 激活码验证流程

1. **用户输入激活码**
2. **系统验证激活码格式**
3. **查询数据库检查激活码有效性**
4. **验证许可证状态**（是否过期、是否被撤销）
5. **验证机器码绑定**（如果已绑定）
6. **返回验证结果**

#### 机器码获取

使用 `scripts/get-machine-code.js` 获取当前机器的机器码：

```bash
node scripts/get-machine-code.js
```

机器码基于以下硬件信息生成：

- CPU 序列号
- 主板序列号
- MAC 地址
- 硬盘序列号

### 3. 激活许可证

#### 激活流程

1. **输入激活码**
2. **验证激活码有效性**
3. **获取机器码**
4. **检查是否允许在当前机器激活**
5. **保存激活信息到数据库**
6. **解锁应用功能**

#### API 调用示例

```typescript
import { activateLicense } from '@/utils/licenseManager'

// 激活许可证
const result = await activateLicense({
  activationCode: 'ABCD-1234-EFGH-5678',
  machineCode: await getMachineCode(),
})

if (result.success) {
  console.log('激活成功')
  console.log('过期日期:', result.expiryDate)
} else {
  console.error('激活失败:', result.message)
}
```

### 4. 检查许可证状态

#### 定期检查

应用启动时或使用定期检查许可证状态：

```typescript
import { checkLicenseStatus } from '@/utils/licenseManager'

// 检查许可证状态
const status = await checkLicenseStatus()

if (status.valid) {
  if (status.daysUntilExpiry <= 7) {
    // 提示用户即将过期
    showExpiryWarning(status.expiryDate)
  }
} else {
  // 许可证无效，限制功能
  showLicenseInvalidDialog()
}
```

### 5. 续期许可证

#### 续期流程

1. **生成新的激活码**
2. **验证原许可证**
3. **更新数据库中的激活信息**
4. **延长过期日期**

#### API 调用示例

```typescript
import { renewLicense } from '@/utils/licenseManager'

// 续期许可证
const result = await renewLicense({
  licenseKey: 'existing-license-key',
  days: 365,
})
```

## 核心功能模块

### 许可证生成器

参考 `scripts/generate-license.js`，实现以下功能：

- 生成加密的许可证密钥
- 生成用户可读的激活码
- 计算过期日期
- 应用许可证类型限制

### 激活验证器

参考 `references/license-validation-logic.md`，实现以下功能：

- 激活码格式验证
- 数据库查询验证
- 状态验证（过期、撤销）
- 机器码绑定验证
- 并发激活限制

### 机器码生成器

参考 `scripts/get-machine-code.js`，实现以下功能：

- 获取硬件信息
- 生成唯一机器码
- 跨平台支持（Windows/Mac/Linux）

## 数据查询

### 查询激活信息

使用 `references/license-queries.md` 中的查询：

- 查询当前激活状态
- 查询即将过期的许可证
- 查询指定机器的激活记录
- 统计激活数量

## 安全注意事项

- **许可证密钥加密存储**：使用 AES 加密算法
- **激活码格式验证**：防止无效输入
- **机器码绑定限制**：防止许可证滥用
- **定期状态检查**：防止非法使用
- **日志记录**：记录所有激活和验证操作

## 常见问题

### Q: 如何迁移许可证到新机器？

A: 先在旧机器撤销许可证，然后在新机器使用相同的激活码重新激活。

### Q: 许可证过期后如何处理？

A: 生成新的激活码或续期现有许可证，更新数据库中的过期日期。

### Q: 如何防止许可证被破解？

A: 使用硬件绑定、加密存储、在线验证、代码混淆等多种方式。

### Q: 如何批量管理企业许可证？

A: 生成新的激活码或续期现有许可证，更新数据库中的过期日期。

### Q: 如何防止许可证被破解？

A: 使用硬件绑定、加密存储、在线验证、代码混淆等多种方式。

### Q: 如何批量管理企业许可证？

A: 使用批量生成功能，记录每个激活码对应的客户和机器信息。

## 文件位置

- 许可证相关代码：`src/utils/licenseManager.ts`
- 数据库操作：`src/database/api.ts` 中的 LicenseAPI
- 激活界面：`src/views/Activation.vue`
- 配置文件：`src/config/license.config.ts`
