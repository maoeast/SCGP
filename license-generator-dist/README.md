# SCGP 激活码生成工具

用于为 `SCGP / 星愿能力发展平台` 生成试用或正式激活码。

当前支持两种使用方式：

- Electron 单窗口 GUI
- Node.js CLI 发码脚本

## 当前授权口径

许可证 payload 中的 `am` 字段，兼容承载两类 code：

- 旧口径：顶层业务模块 code
- 新口径：`EntitlementCode` 能力包 code

主程序当前已切到 `entitlement-first` 判权。新发码应优先写入新的 `EntitlementCode`。

## 推荐写入的 EntitlementCode

- `sensory_integration`
- `emotional`
- `social_communication`
- `fine_motor`
- `soothing_aids`
- `life_skills`
- `cognitive`

省略 `--modules` 时，默认授权以上全部能力包。

## 兼容说明

- 旧码中的 `sensory / emotional / social / cognitive / life_skills` 仍会被主程序兼容展开。
- 发码工具、发码说明、售后口径都应改为新的能力包 code，不再继续以“模块授权”作为主口径。
- `moduleCode` 在主程序里继续表示数据归属；`EntitlementCode` 表示访问控制。

## 能力包对应关系

| EntitlementCode | 中文名称 | 主要覆盖范围 |
| --- | --- | --- |
| `sensory_integration` | 感官统合 | 感官统合训练主链、相关量表与资源 |
| `emotional` | 情绪发展 | 情绪行为、情绪调节、情绪场景训练及相关量表/资源 |
| `social_communication` | 社交沟通 | 社交沟通训练入口、相关量表与资源 |
| `fine_motor` | 精细动作 | 精细动作独立授权包，数据归属仍为 `sensory` |
| `soothing_aids` | 安抚系统 | 安抚教具/安抚训练独立授权包，数据归属仍为 `emotional` |
| `life_skills` | 生活自理 | 自理训练主链、`task_training`、相关量表与资源 |
| `cognitive` | 认知发展 | 预留授权位，当前仍为占位能力包 |

## GUI 用法

### 1. 安装依赖

```bash
npm install
```

### 2. 本地运行 GUI

```bash
npm run electron:dev
```

### 3. 打包 Windows EXE

```bash
npm run electron:build
```

说明：

- GUI 默认输出目录为当前 Windows 用户的 `Documents/SCGP-License-Generator`
- 每次生成都会自动保存一份 `.txt` 记录文件

## CLI 用法

### 1. 生成试用码

```bash
node generate-license.js --trial
```

指定能力包子集：

```bash
node generate-license.js --trial --modules sensory_integration emotional
node generate-license.js --trial --modules sensory_integration,social_communication
```

说明：

- 试用码默认有效期 7 天
- 不绑定机器码

### 2. 生成按天数授权的正式码

```bash
node generate-license.js --machine <机器码> --days <天数>
```

指定能力包子集：

```bash
node generate-license.js --machine ABC123DEF456 --days 365 --modules sensory_integration,social_communication
```

### 3. 生成永久正式码

```bash
node generate-license.js --machine <机器码> --permanent
```

指定能力包子集：

```bash
node generate-license.js --machine ABC123DEF456 --permanent --modules fine_motor soothing_aids
```

### 4. 初始化密钥

```bash
node generate-license.js --init
```

首次运行时如果缺少密钥，会自动生成 `license-generator-dist/.keys/private.pem` 和 `license-generator-dist/.keys/public.pem`。

## `--modules` 参数规则

- 推荐传入新的能力包编码：
  `sensory_integration / emotional / social_communication / fine_motor / soothing_aids / life_skills / cognitive`
- 支持逗号分隔：`--modules sensory_integration,social_communication`
- 支持空格分隔：`--modules sensory_integration social_communication`
- 会自动去重
- 如果传入白名单外 code，脚本会直接报错并拒绝发码

## 输出内容

每次生成激活码时会：

- 输出授权能力包列表
- 生成标准 `SPED-...` 格式激活码
- 自动落一份 `.txt` 记录文件
- CLI 模式默认写到当前目录
- GUI 模式默认写到 `Documents/SCGP-License-Generator`

## 机器码获取

1. 客户端打开应用
2. 进入激活页面
3. 复制页面显示的机器码
4. 将机器码填入发码工具

## 注意事项

- `.keys/private.pem` 是签名私钥，必须妥善保管
- 正式码与机器码绑定，更换机器后需要重新发码
- 新发码请统一使用 `EntitlementCode`
- 若需兼容旧客户，可继续读取旧模块 code，但不要再作为默认发码口径
