# GSD 最小操作手册

适用对象：刚开始在本项目里使用 GSD，希望先把流程跑顺，不追求一次学全。

---

## 1. 先理解 GSD 在项目里的角色

GSD 是项目的流程账本，不是代码真相本身。

判断优先级建议按这个顺序：

1. 代码和可运行行为
2. Git 历史
3. `.planning/` 里的 GSD 记录

如果三者不一致，先修 `.planning/`，不要为了迎合 GSD 去改业务代码。

---

## 2. 你平时只需要记住这 6 个命令

### 看状态

```bash
$gsd-progress
```

用途：
- 看当前 milestone 进度
- 看当前 phase 是已完成、进行中还是未开始
- 看下一步应该 `discuss`、`plan` 还是 `execute`

### 查健康

```bash
$gsd-health
```

用途：
- 检查 `.planning/` 是否有坏状态
- 找出缺失文件、命名不规范、配置缺失等问题

自动修一遍：

```bash
$gsd-health --repair
```

---

## 3. 标准 phase 流程

一个标准 phase 通常这样走：

```bash
$gsd-discuss-phase <phase>
$gsd-plan-phase <phase>
$gsd-execute-phase <phase>
$gsd-verify-work <phase>
```

含义：

- `discuss-phase`
  - 讨论“怎么做才符合你的预期”
  - 产出 `*-CONTEXT.md`
  - 适合你对交互、内容结构、呈现方式有偏好时使用

- `plan-phase`
  - 把 phase 拆成可执行计划
  - 产出 `*-PLAN.md`

- `execute-phase`
  - 按计划执行
  - 完成后产出 `*-SUMMARY.md`

- `verify-work`
  - 做一轮 UAT 式确认

如果你已经有非常明确的 PRD，可以跳过 `discuss-phase`，直接：

```bash
$gsd-plan-phase <phase> --prd path/to/prd.md
```

---

## 4. 什么时候该用 discuss-phase

适合用的时候：
- 你知道要做什么，但还没想清楚“呈现形式”
- 你想提前锁定交互方式、信息密度、结构和边界
- 你怕规划出来的东西跟你想的不一样

不适合用的时候：
- 只是纯技术修复
- 只是改一个小 bug
- 已经有完整 PRD/验收标准

---

## 5. 什么时候该用 quick

小事直接用：

```bash
$gsd-quick
```

适用场景：
- 一个页面的小修复
- 一个组件的小增强
- 一次性问题处理

不要拿 `quick` 做：
- 跨多个模块的大改
- 新 phase 主流程
- 需要先研究再规划的复杂工作

---

## 6. 你最容易踩的坑

### 坑 1：文件命名不规范

GSD 很依赖命名约定：
- `*-PLAN.md`
- `*-SUMMARY.md`
- `*-CONTEXT.md`
- `*-RESEARCH.md`

大小写不对、后缀不对，工具就可能漏算。

### 坑 2：代码做完了，但没补 planning

典型表现：
- 实际功能已经上线
- `gsd-progress` 还显示未完成

这时应该补 `PLAN/SUMMARY`，不是去怀疑代码。

### 坑 3：ROADMAP 写了 phase，但目录里没工件

会导致：
- `gsd-health` 告警
- `gsd-progress` 路由混乱

### 坑 4：先手工改 `.planning`，再让 GSD 接管

如果手工改动没有遵守 GSD 约定结构，后面很容易出现“工具识别不一致”。

---

## 7. 每次开工前的最小检查

建议固定这样做：

```bash
$gsd-health
$gsd-progress
```

如果 `health` 不健康，先修健康，再继续 phase。

---

## 8. 每次做完后的最小检查

完成一个 phase 或子 phase 后，至少确认：

1. `ROADMAP.md` 状态是对的
2. phase 目录里有匹配的 `PLAN` 和 `SUMMARY`
3. `gsd-progress` 能正确给出下一步

---

## 9. 本项目当前推荐用法

对于 SCGP，这样用最稳：

1. 大功能按标准流程走：`discuss -> plan -> execute`
2. 小修复用 `quick`
3. 一旦感觉记录不准，先跑 `gsd-health`
4. 不要手工随意改 phase 文件名
5. 如果历史工作已经做完但没记账，补最小 planning 工件

---

## 10. 一句话版本

不知道下一步干什么时，先跑：

```bash
$gsd-progress
```

怀疑 GSD 记录不准时，先跑：

```bash
$gsd-health
```

开始一个正式 phase 时，按：

```bash
$gsd-discuss-phase <phase>
$gsd-plan-phase <phase>
$gsd-execute-phase <phase>
```
