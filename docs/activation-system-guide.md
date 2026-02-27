# 激活系统使用指南

## 📋 系统概述

本项目已集成基于 RSA 数字签名技术的专业激活系统，具有以下特点：

- **安全性高**：使用 RSA 2048位密钥对，私钥签名，公钥验证
- **防篡改**：激活码包含数字签名，任何篡改都会导致验证失败
- **机器绑定**：正式激活码严格绑定机器硬件，防止盗版
- **试用支持**：提供7天免费试用，不绑定机器
- **灵活授权**：支持试用、限时（如1年、3年）和永久激活

## 🚀 激活码生成

### 工具位置

项目根目录下的 `license-generator-dist` 文件夹

### 使用方法

#### 方式1：使用批处理文件（Windows）

1. **生成试用码（7天）**
   - 双击运行：`1-生成试用码.bat`
   - 激活码不绑定机器，任何人都可以使用

2. **生成正式激活码**
   - 双击运行：`2-生成正式码.bat`
   - 按提示输入机器码和天数
   - 输入 `0` 表示永久激活

#### 方式2：使用命令行

```bash
cd license-generator-dist

# 1. 生成试用码（7天）
node generate-license.js --trial

# 2. 生成限时激活码（例如365天）
node generate-license.js --machine <机器码> --days 365

# 3. 生成永久激活码
node generate-license.js --machine <机器码> --permanent

# 4. 初始化密钥（首次使用自动执行）
node generate-license.js --init
```

### 示例

```bash
# 为机器码 "F5E8D9C2A1B3" 生成1年授权
node generate-license.js --machine F5E8D9C2A1B3 --days 365

# 为机器码 "X9Y8Z7W6V5U4" 生成永久授权
node generate-license.js --machine X9Y8Z7W6V5U4 --permanent

# 生成试用码
node generate-license.js --trial
```

## 🔑 如何获取机器码

1. 客户打开应用程序
2. 进入"激活管理"页面（仅管理员可见）
3. 在"当前机器信息"卡片中查看机器码
4. 点击"复制"按钮复制机器码

## ⚠️ 重要提示

### 安全注意事项

1. **妥善保管私钥**
   - 私钥文件位于 `.keys/private.pem`
   - 绝对不要泄露或分发私钥
   - 建议将 `.keys` 文件夹备份到安全位置
   - 如果私钥丢失，所有已生成的激活码将失效

2. **公钥分发**
   - 公钥文件 `public-key.pem` 已复制到项目 `public` 目录
   - 打包时会自动包含公钥文件
   - 客户端使用公钥验证激活码，不需要私钥

3. **激活码特性**
   - 试用码：不绑定机器，7天有效期
   - 正式码：严格绑定机器硬件信息
   - 永久码：永久有效，但仍然绑定机器
   - 限时码：到期后需重新激活

4. **生成记录**
   - 每次生成都会创建 `.txt` 文件
   - 文件名包含机器码和时间戳
   - 建议妥善保存这些记录

## 🔧 技术细节

### 激活码格式

```
SPED-XXXXX-XXXXX-XXXXX-XXXXX...
```

- 前缀：`SPED-`
- 主体：Base64编码的数据，包含：
  - 4字节数据长度
  - JSON格式的许可证数据
  - RSA签名（256字节）

### 许可证数据结构

```typescript
{
  t: 'trial' | 'full',  // 类型：试用或正式
  v: '1.0',              // 版本
  m: string,             // 机器码（试用码为 '*'）
  c: number,             // 创建时间戳
  e: number | null,      // 过期时间戳（null表示永久）
  p?: boolean            // 是否永久激活
}
```

### 验证流程

1. 反格式化激活码（移除 SPED- 和分隔符）
2. Base64解码
3. 提取数据和签名
4. 使用RSA公钥验证签名
5. 验证机器码匹配（试用码除外）
6. 检查是否过期

## 🛠️ 开发说明

### 代码结构

- `src/utils/license-manager.ts` - 客户端许可证验证逻辑
- `src/utils/activation-manager.ts` - 激活管理器，整合验证和数据库存储
- `src/stores/auth.ts` - 认证状态管理
- `src/views/Activation.vue` - 激活页面
- `src/views/ActivationAdmin.vue` - 激活管理页面
- `public/public-key.pem` - RSA公钥文件

### 数据库表结构

```sql
CREATE TABLE activation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_code TEXT NOT NULL,
  activation_code TEXT NOT NULL UNIQUE,
  license_data TEXT NOT NULL,  -- JSON格式的许可证数据
  expires_at TEXT,             -- 过期时间（NULL表示永久）
  is_valid INTEGER DEFAULT 1,  -- 是否有效
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## ❓ 常见问题

### Q1：如何重新生成密钥对？

```bash
cd license-generator-dist
node generate-license.js --init
```

**警告**：重新生成密钥后，之前的所有激活码都将失效！

### Q2：如何查看已生成的激活码？

查看 `license-generator-dist` 目录下的 `.txt` 文件。

### Q3：客户说激活码无效？

检查以下几点：
1. 机器码是否正确（区分大小写）
2. 激活码是否完整复制（包括 SPED- 前缀）
3. 客户是否在正确的机器上使用
4. 激活码是否已过期
5. 检查控制台是否有错误信息

### Q4：如何批量生成激活码？

可以编写批处理脚本或 Node.js 脚本，循环调用生成命令。

### Q5：测试环境如何使用？

直接使用试用激活码进行测试，无需绑定机器。

## 📞 技术支持

如有问题，请联系技术支持部门。

---

**版本**：2.0.0（RSA签名版本）
**更新日期**：2025-12-29
**作者**：Claude Code
