# 情绪游戏布局与排障总结

日期：2026-03-20
适用范围：

- `src/views/emotional/games/**`
- `src/components/emotional/games/**`

## 1. 问题概述

在【音量魔法森林】开发过程中，出现过两个容易误判的问题：

1. 业务日志显示小动物已经被成功解锁，`visibleAnimalCount` 也正常增长，但画面里完全看不到小动物。
2. 小动物和引导角色已经显示出来，但被底部的半透明说明/操作面板遮住了一部分。

这两个问题本质上都不是状态机错误，而是布局参考系和层级避让错误。

## 2. 结论一：主体层必须真正铺满游戏区

如果某一层承载了绝对定位的角色、树木、引导卡片、火萤或其他主体元素，那么这层不能只写 `position: relative`，必须显式铺满游戏区：

```css
.forest-layer {
  position: absolute;
  inset: 0;
}
```

否则会出现：

- 状态机已经判定元素可见
- `visible count` 已经正常增长
- 但元素整体 `DOMRect.top` 是负数，真实位置已经跑到视口外

本次定位的关键证据：

- `visibleAnimalCount: 3`
- `animalsRect: 425,-375,1238x225`

这说明不是“没渲染”，而是“整块容器被错误定位到了屏幕上方”。

## 3. 结论二：底部面板必须按真实高度动态避让

底部说明区/按钮区不能再用固定的 `bottom: 30%`、`bottom: 240px` 之类的经验值去给主体腾空间。

正确做法：

1. 给底部面板加 `ref`
2. 读取它的真实 `DOMRect.height`
3. 用这个高度反推树木、角色和引导卡片的 `bottom`

推荐模式：

```ts
const panelRect = ref({ left: 0, top: 0, width: 0, height: 0 })

const panelSafeBottom = computed(() =>
  panelRect.value.height > 0 ? panelRect.value.height + 28 : 300
)

const treeRowBottom = computed(() => panelSafeBottom.value - 12)
const animalsBottom = computed(() => panelSafeBottom.value + 10)
const guideBearBottom = computed(() => panelSafeBottom.value + 130)
```

适用场景：

- 文案行数会变化
- 主按钮高度会变化
- 桌面端和移动端面板高度不同

## 4. 正确排障顺序

当出现“逻辑上应该显示，但画面里没有”的问题时，固定按这个顺序排查：

1. 先看状态机是否进入了预期阶段
2. 再看渲染数量是否真的增长
3. 再看关键容器的 `DOMRect`
4. 最后才怀疑透明度、颜色、美术素材或动画

不要一开始就怀疑：

- `v-if`
- 解锁逻辑
- 数据未写入

因为这次案例已经证明：业务逻辑完全正确，问题仍然可能纯粹出在布局参考系。

## 5. 临时调试手段

这次验证有效的临时调试方法：

1. 给关键容器加高对比 outline
2. 在屏幕角落显示一个小型调试条，输出：
   - `phase`
   - `showGuideBear`
   - `activeAnimalCount`
   - `visibleAnimalCount`
   - `mappedDb`
   - `stableMs`
   - `accumulatedMs`
   - `animalsRect`
   - `guideRect`
   - `panelRect`

使用原则：

- 只作为排障工具
- 问题定位完成后必须删除
- 不要把调试面板和日志带进正式交付

## 6. 下个游戏的强制检查项

开发新的情绪小游戏前，先检查：

- 主体承载层是否 `absolute + inset: 0`
- 绝对定位角色是否依附在真正铺满的参考容器上
- 底部说明面板是否通过真实高度做了动态避让
- 主体层、说明层、HUD 层之间是否存在遮挡
- 如果出现“逻辑已显示但画面看不到”，是否优先检查了 `DOMRect`

## 7. 本次可复用结论

这次问题已经验证：

- “元素不显示”不等于“业务逻辑没触发”
- “看不见角色”很多时候是容器参考系错误
- 带操作面板的情绪游戏，不应该靠固定百分比摆主体
- 这类页面应默认准备“可测量布局”，而不是“猜测布局”
