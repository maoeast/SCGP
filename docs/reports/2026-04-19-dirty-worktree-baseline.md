# 2026-04-19 脏工作区基线

## 1. 当前结论

- 当前仓库共有 **4061** 个脏文件。
- 其中：
  - 已跟踪文件被修改：**4055**
  - 未跟踪文件：**6**
- 这说明主体不是本次会话新生成文件，而是仓库已存在的大面积未提交本地改动。

## 2. 顶层目录分布

| 目录 | 数量 | 说明 |
| --- | ---: | --- |
| `public` | 2175 | 最大头，主要是静态资源 |
| `src` | 615 | 产品源码 |
| `.codex` | 247 | Codex / GSD 工作流目录 |
| `assets` | 201 | 资源素材目录 |
| `.claude` | 181 | Claude 工作流目录 |
| `.gemini` | 144 | Gemini 工作流目录 |
| `.planning` | 135 | 规划与工作流目录 |
| `docs` | 85 | 文档目录 |

## 3. 已知最大脏文件来源

- `public/fontawesome`：**2126**
  - 当前已知最大的脏文件桶
  - 属于静态图标资源，不是业务模块代码

## 4. 产品源码分布（`src/`）

| 子目录 | 数量 |
| --- | ---: |
| `src/assets` | 228 |
| `src/views` | 112 |
| `src/components` | 83 |
| `src/database` | 70 |
| `src/utils` | 38 |
| `src/types` | 20 |
| `src/strategies` | 16 |

### 4.1 `src/views` 中已知模块

| 模块 | 数量 |
| --- | ---: |
| `emotional` | 33 |
| `assessment` | 18 |
| `devtools` | 8 |
| `_archived` | 7 |
| `resource-center` | 6 |
| `admin` | 4 |
| `equipment` | 4 |
| `games` | 4 |
| `training-records` | 4 |

### 4.2 `src/components` 中已知模块

| 模块 | 数量 |
| --- | ---: |
| `emotional` | 43 |
| `training` | 14 |
| `login` | 6 |
| `icons` | 5 |
| `games` | 3 |

## 5. 当前判断

- 当前脏工作区的主体不在本轮感统改造文件。
- 脏文件来源可以先分成 4 类：
  - 静态资源：如 `public/fontawesome`
  - 产品源码：如 `src/emotional`、`src/assessment`
  - AI / GSD 工作流目录：如 `.codex`、`.claude`、`.gemini`、`.planning`
  - 文档与归档：如 `docs`、`.archive`

## 6. 审计顺序建议

1. `public/fontawesome`
2. `.codex`
3. `.claude`
4. `.gemini`
5. `.planning`

## 7. 备注

- 当前基线只记录“已确认统计事实”，不是完整逐文件审计报告。
- 下一轮会话应先做抽样检查，再决定恢复、保留或归档策略。
