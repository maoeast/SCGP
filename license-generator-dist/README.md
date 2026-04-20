# SCGP 激活码生成工具

用于为 SCGP / 星愿能力发展平台生成试用或正式激活码。当前支持按 5 个顶层模块输出授权子集，写入许可证中的 `am` 字段。

## 顶层模块白名单

仅允许以下模块编码：

- `sensory`
- `emotional`
- `social`
- `cognitive`
- `life_skills`

省略 `--modules` 时，默认授权以上全部 5 个顶层模块。

## 前置要求

- Node.js 16+
- 首次使用前在当前目录执行 `npm install`

## 用法

### 1. 生成试用码

```bash
node generate-license.js --trial
```

指定模块子集：

```bash
node generate-license.js --trial --modules sensory emotional
node generate-license.js --trial --modules sensory,social
```

说明：

- 试用码默认有效期 7 天
- 不绑定机器码

### 2. 生成按天数授权的正式码

```bash
node generate-license.js --machine <机器码> --days <天数>
```

指定模块子集：

```bash
node generate-license.js --machine ABC123DEF456 --days 365 --modules sensory,social
```

### 3. 生成永久正式码

```bash
node generate-license.js --machine <机器码> --permanent
```

指定模块子集：

```bash
node generate-license.js --machine ABC123DEF456 --permanent --modules cognitive life_skills
```

### 4. 初始化密钥

```bash
node generate-license.js --init
```

首次运行时如果缺少密钥，会自动生成 `license-generator-dist/.keys/private.pem` 和 `license-generator-dist/.keys/public.pem`。

## `--modules` 参数规则

- 只认 5 个顶层模块编码：`sensory/emotional/social/cognitive/life_skills`
- 支持逗号分隔：`--modules sensory,social`
- 支持空格分隔：`--modules sensory social`
- 会自动去重
- 如果传入白名单外模块，脚本会直接报错并拒绝发码

## 输出内容

每次生成激活码时会：

- 输出激活码明文到终端
- 输出授权模块列表
- 在当前目录生成一份 `.txt` 记录文件
- 同步复制公钥到 `license-generator-dist/public-key.pem`

## 机器码获取

1. 客户端打开应用
2. 进入激活页面
3. 复制页面显示的机器码
4. 将机器码用于发码命令中的 `--machine`

## 注意事项

- `.keys/private.pem` 是签名私钥，必须妥善保管
- 正式码与机器码绑定，更换机器后需要重新发码
- 当前许可证顶层授权只消费 `sensory`、`emotional`、`social`、`cognitive`、`life_skills`
