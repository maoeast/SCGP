# SCGP 激活码生成工具

用于为 SCGP / 星愿能力发展平台生成试用或正式激活码。当前支持两种使用方式：

- 面向非技术人员的 Electron 单窗口 GUI
- 仍可保留的 Node.js CLI 发码脚本

当前许可证顶层授权只认 5 个模块，并写入许可证中的 `am` 字段。

## 顶层模块白名单

仅允许以下模块编码：

- `sensory`
- `emotional`
- `social`
- `cognitive`
- `life_skills`

省略 `--modules` 时，默认授权以上全部 5 个顶层模块。

## 顶层授权模块对应关系

以下对应关系按当前代码现状整理，用于发码时判断应勾选哪些顶层授权模块，不按历史方案或目标态口径理解。

| 授权模块 | 中文名称 | 当前对应系统模块 / 板块 | 当前状态 |
| --- | --- | --- | --- |
| `sensory` | 感官训练 | 游戏训练：感官统合、精细动作；器材训练：感官训练、精细动作；训练记录：感官统合、精细动作；能力评估：`CSIRS`、`儿心量表Ⅱ`、`TGMD-3`、`GMFM-88`、`小肌肉功能发展评估量表`；资源中心：感官训练、精细动作 | 当前最完整业务主链 |
| `emotional` | 情绪行为 / 情绪调节 | 独立情绪模块入口；情绪场景训练、表达关心训练、会话总结、情绪小游戏、模块报告；游戏/器材/记录入口组：情绪调节、安抚教具；能力评估：`Conners-PSQ`、`Conners-TRS`、`CBCL`，以及共享量表 `SDQ`；资源中心：情绪行为、情绪调节、安抚教具 | 当前代码里已有独立业务路由和较完整页面 |
| `social` | 社交沟通 | 游戏训练入口组：社交沟通；器材训练入口组：社交沟通；训练记录入口组：社交沟通；能力评估：`SRS-2`，以及共享量表 `SDQ`；资源中心：社交沟通 | 当前主要以训练入口组、资源和评估归类存在，独立 `/social` 业务主线仍未完整落地 |
| `cognitive` | 认知训练 | 首页、资源管理、资源中心中的模块标签与筛选项里有“认知训练” | 当前主要是预留授权位，未见独立顶级业务路由、独立训练入口组或独立量表授权主链 |
| `life_skills` | 生活技能 / 生活自理 | 游戏训练入口组：生活自理；器材训练入口组：生活自理；训练记录入口组：生活自理；能力评估：`S-M量表`、`WeeFIM`；资源中心 / 教案维度：生活自理 | 当前通过训练入口组、量表和资源归类消费，没有独立顶级业务路由主线 |

补充说明：

- `SDQ` 是共享量表，`emotional` 和 `social` 任一授权即可放开。
- `儿心量表Ⅱ` 虽然会显示社交沟通、生活自理等标签页，但当前量表授权判断仍挂在 `sensory`。
- `cognitive` 当前不要对外表述为“已完整交付模块”，按代码看更接近预留的顶层授权码。

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
- 首轮 GUI 仅做 Windows 单窗口发码原型

## CLI 用法

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

- 输出授权模块列表
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
- 当前许可证顶层授权只消费 `sensory`、`emotional`、`social`、`cognitive`、`life_skills`
