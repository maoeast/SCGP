# license-generator-tauri Tauri 并行迁移规划

日期：2026-04-20
状态：规划中，当前仅固定兼容边界，不替换已可用的 `license-generator-dist`

## 1. 当前结论

- 可以并行启动 `license-generator-tauri`，但只能作为新的发码工具分支，不能替换当前已交付的 Electron 版。
- 本轮迁移的第一优先级不是 UI，而是发码协议 100% 兼容。
- 当前客户端已经把许可证验证逻辑写死在 `src/utils/license-manager.ts` 和 `src/utils/activation-manager.ts`，因此 Tauri 版不得改签名协议、字段语义、模块白名单和授权消费链。

## 2. 协议硬兼容清单

以下条目属于硬约束。Tauri 版只要有一项偏离，就不能视为可上线替代品。

### 2.1 许可证字段合同

许可证 JSON 负载继续只使用以下字段：

- `t`: 许可证类型，只允许 `trial` 或 `full`
- `v`: 许可证版本，当前必须固定为 `1.0`
- `m`: 机器码；试用码固定为 `*`
- `c`: 创建时间戳，毫秒
- `e`: 过期时间戳，毫秒；永久授权必须为 `null`
- `am`: 顶层授权模块数组
- `p`: 永久标记；试用码不写该字段，正式永久码写 `true`，按天正式码写 `false`

当前真实负载形态必须保持如下：

| 场景 | `t` | `m` | `e` | `am` | `p` |
| --- | --- | --- | --- | --- | --- |
| 试用码 | `trial` | `*` | `c + 7天` | 选中的顶层模块 | 不写 |
| 正式码（按天） | `full` | 实际机器码 | `c + N天` | 选中的顶层模块 | `false` |
| 正式码（永久） | `full` | 实际机器码 | `null` | 选中的顶层模块 | `true` |

明确禁止：

- 不得新增 `permanent` 作为新的 `t`
- 不得把 `am` 改名
- 不得把时间戳改成秒、字符串日期或别的编码
- 不得删除 `v`

### 2.2 签名与封装合同

Tauri 版必须继续输出与当前实现一致的签名协议：

- 密钥算法：`RSA-2048`
- 摘要算法：`SHA-256`
- 签名填充：`PKCS#1 v1.5`
- 公钥格式：`SPKI PEM`
- 私钥格式：`PKCS#8 PEM`
- 签名输入：许可证 JSON 的 UTF-8 字节
- 二进制封装：`4字节大端长度 + JSON字节 + 原始签名字节`
- 外层编码：Base64
- 展示格式：每 5 个字符一组，并保留 `SPED-` 前缀

明确禁止：

- 不得改成 `RSA-PSS`
- 不得改成 `SHA-512`
- 不得改成 JWS/JWT
- 不得改成十六进制或 URL-safe Base64
- 不得去掉 4 字节长度头
- 不得改 `SPED-` 前缀

### 2.3 密钥兼容合同

- Tauri 版必须复用当前 Electron 发码工具所使用的同一套密钥材料。
- 不允许在迁移过程中重新 `init` 一套新密钥后直接发码。
- 只要客户端内嵌公钥不变，Tauri 版就必须继续使用与之配对的现有私钥。
- 若未来要轮换密钥，必须作为独立专题，同时修改客户端内嵌公钥与发码工具，不在本次迁移范围内。

## 3. 授权兼容清单

### 3.1 顶层模块白名单

当前许可证顶层授权只认：

- `sensory`
- `emotional`
- `social`
- `cognitive`
- `life_skills`

Tauri 版必须保持同一白名单，不得新增、重命名或删除任何编码。

### 3.2 fine_motor 兼容规则

- `fine_motor` 当前不是顶层授权模块。
- `fine_motor` 继续并入 `sensory` 授权链。
- Tauri 版 UI 不得新增 `fine_motor` 勾选项。
- Tauri 版协议层不得输出 `fine_motor` 到 `am`。

当前代码中的真实消费关系：

- 训练入口 `fine-motor` 的 `moduleCode` 仍是 `ModuleCode.SENSORY`
- `fine_motor` 量表授权仍挂在 `sensory`
- `儿心量表Ⅱ` 虽然覆盖精细动作、社交沟通、生活自理标签页，但授权判断仍挂在 `sensory`

### 3.3 其他授权说明

- `SDQ` 是共享量表，`emotional` 与 `social` 任一授权即可放开。
- `life_skills` 继续承接 `S-M` 和 `WeeFIM`。
- `cognitive` 当前仍按顶层授权位处理，不得在 Tauri 迁移文档里表述为“完整已交付模块”。

## 4. GUI 与行为兼容清单

这些不是签名协议本体，但属于首版 Tauri 需要维持的外部行为。

- 保持单窗口桌面工具形态，不依赖主应用运行。
- 首轮仍以 Windows 为主，不要求本轮同时覆盖 macOS / Linux。
- 默认输出目录继续为 `Documents/SCGP-License-Generator`。
- 继续自动保存 `.txt` 发码记录文件。
- 保留当前 3 类操作：生成激活码、复制激活码、从剪贴板读取机器码。
- 如补齐“在资源管理器中定位输出文件”，行为应与当前 Electron 版等价。
- 模块勾选区继续只展示 5 个顶层模块，默认全选。

## 5. 可行性评估

基于当前代码，Tauri 并行迁移是可行的，原因如下：

- 现有 GUI 是独立的 `HTML + CSS + 原生 JS`，没有绑定主应用的 Vue 运行时。
- 当前桌面特权接口很窄，主要只有 5 类：读取配置、生成激活码、读写剪贴板、显示输出路径。
- 最大迁移风险集中在签名实现和密钥复用，而不是界面结构。

当前主要风险：

1. Rust 侧如果签名字节、长度头或 Base64 格式有任何偏差，现有客户端会直接验签失败。
2. 若 Tauri 工程误生成新密钥，当前客户端内嵌公钥将无法验证新发出的码。
3. 若把 `fine_motor` 错当成独立授权模块，会造成 UI、发码记录、客户端授权判断三处口径分裂。

结论：

- 可以做
- 但必须以“协议回归测试优先”推进
- 并且在 Tauri 版完成前，`license-generator-dist` 继续作为唯一稳定发码工具

## 6. 推荐迁移路径

### Phase 0：冻结协议基线

- 以当前 `license-generator-dist/generate-license.js` 作为协议基线实现
- 以当前 `src/utils/license-manager.ts` 作为客户端验签基线实现
- 以当前 `src/stores/auth.ts`、`src/utils/training-entry.ts`、`src/features/assessment/assessment-scale-catalog.ts` 作为授权消费基线

### Phase 1：搭建 `license-generator-tauri` 骨架

- 新建独立目录，不侵入 `license-generator-dist`
- 保持并行开发，不替换现有 Electron 安装包链路
- 前端优先复用现有 `index.html`、`renderer.js`、`styles.css` 的结构与交互

### Phase 2：迁移桌面能力到 Tauri Command

首批需要对齐的命令面：

- `get_config`
- `generate_license`
- `copy_text`
- `read_clipboard_text`
- `reveal_in_folder`

其中 `generate_license` 必须严格复刻当前入参与返回结构，至少保留：

- `type`
- `machineId`
- `days`
- `allowedModules`
- `artifact.formattedKey`
- `artifact.outputPath`
- `artifact.summary`

### Phase 3：做协议金样回归

至少补以下验证：

1. Tauri 版生成的试用码可被当前客户端正常验证。
2. Tauri 版生成的按天正式码可被当前客户端正常验证。
3. Tauri 版生成的永久正式码可被当前客户端正常验证。
4. `am` 缺失、模块越界、机器码不匹配时，客户端表现与当前一致。
5. `fine_motor` 不会出现在发码 UI、许可证负载和持久化结果中。

### Phase 4：打包与并行验收

- 独立打包 Tauri Windows 安装包
- 与现有 Electron 发码工具并行保留一段观察期
- 观察期内不删除 `license-generator-dist`

## 7. 本轮非目标

以下事项不属于本轮 Tauri 并行迁移：

- 替换主应用 Electron 壳
- 修改客户端验签逻辑
- 调整许可证字段设计
- 新增 `fine_motor` 顶层授权
- 重构主应用授权体系
- 轮换公私钥

## 8. 验收口径

只有同时满足以下条件，Tauri 版才算进入可试用状态：

- 对同一台机器发出的码，当前客户端可直接激活成功
- 授权模块只出现 5 个顶层编码
- `fine_motor` 仍由 `sensory` 放开
- 试用、按天、永久三类码都通过现有客户端验签
- 不修改 `src/utils/license-manager.ts` 的协议判断分支
- 不影响现有 `license-generator-dist` 发码和打包能力

## 9. 当前参考实现

- `license-generator-dist/generate-license.js`
- `license-generator-dist/main.js`
- `license-generator-dist/preload.js`
- `license-generator-dist/renderer.js`
- `src/utils/license-manager.ts`
- `src/utils/activation-manager.ts`
- `src/stores/auth.ts`
- `src/utils/training-entry.ts`
- `src/features/assessment/assessment-scale-catalog.ts`
