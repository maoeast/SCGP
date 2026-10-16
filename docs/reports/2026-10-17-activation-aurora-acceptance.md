# 激活页极光背景与展示细节

> 用户已于本轮明确要求收尾，停止进一步打磨与性能排查。当前视觉保留；类型检查、指定视口、默认焦点、减少动态效果和截图已检查。**真实最小化 / 隐藏暂停未验收通过**：测试中原生窗口已最小化，但页面仍报告 visible，尚未定位原因；不得称该项通过。`acceptance.json` 最后一次尝试被失败结果覆盖，完整通过标记不可用；截图仍保留。性能数值仅为此前短时采样，不作为低配性能保证。

## 本次范围

- `src/views/Activation.vue`：新增纯 CSS 极光背景，调整卡片表面、描边与阴影；激活码输入框默认聚焦，用户开始鼠标/键盘操作后不再纠正焦点；空工作时间不显示，邮箱整项隐藏。
- `src/config/activation-page.ts`：Logo 指向用户提供的 `public/xc.png`，关闭继承系统 Logo，微信设为 `xuancankefu`，删除占位文字配置。
- 原有卡片结构、字号、间距、文案、激活处理均保留，仅包含本轮明确追加的 Logo / 客服 / 初始焦点调整。
- 工作区原有 `public/favicon.ico` 删除和 `public/xc.png` 文件保留，未修改素材本身。未提交、推送或发版。

## 背景实现

固定 `.aurora` 层为 z-index 0，卡片为 1；背景不接收鼠标事件。深蓝黑渐变底、四个青绿/翠绿/天蓝/靛紫柔光斑、一层低透明度竖向光幕和静态暗角，无图片背景、库、canvas、WebGL 或 backdrop-filter。

五个动画元素均使用 `will-change: transform`。光斑周期 26/28/34/38 秒，光幕 48 秒，负延迟错开相位；仅动画 transform，模糊、透明度、混合模式保持静态。固定负延迟提供相位差，不代表每次启动产生随机位置。

`prefers-reduced-motion: reduce` 时全部动画关闭，保留静态极光；`visibilitychange` 将隐藏页面设为 `.paused`，恢复可见后继续。监听器在卸载时清理，没有新增 IPC。

## 可调变量

均位于 `Activation.vue` 的非 scoped `:root` 样式中。

| 变量 | 默认值 | 用法 |
| --- | --- | --- |
| `--aurora-speed` | `1` | 时长倍数；`1.5` 更慢，`0.8` 更快，须为正数 |
| `--aurora-intensity` | `0.58` | 光斑亮度，建议 `0.45` 至 `0.65` |
| `--aurora-teal` | `#2dd4bf` | 青绿及光幕颜色 |
| `--aurora-green` | `#34d399` | 翠绿颜色 |
| `--aurora-blue` | `#38bdf8` | 天蓝颜色 |
| `--aurora-violet` | `#818cf8` | 靛紫颜色 |
| `--aurora-base` | 深蓝黑线性渐变 | 背景底色 |

## 验收与边界

- `npm run type-check` 通过；`git diff --check` 通过。
- 1280×720、1366×768、1280×720 的 125% / 150% 和 1366×768 的 150% 等效页面缩放，默认页无横纵滚动条，卡片中心偏差小于 1 CSS px；Logo 高度 28–32px，保持原比例。
- 输入框首次获得焦点，Tab 可正常移到粘贴按钮；没有默认选中复制机器码按钮。微信已显示，空工作时间及邮箱隐藏，无“待补充”。
- 卡片内文字的前景色和字号未变。按要求采用 96% 白底，在最暗背景上辅助文字的保守对比度仍约 5.1:1；相较原纯白底，数学对比度略低，仍高于 4.5:1。
- 截图、性能与窗口状态结果在 `output/playwright/activation-aurora/acceptance.json`；动态截图 `aurora-motion.png`，减少动态效果截图 `aurora-reduced-motion.png`。
- 缩放使用固定截图像素基准与 Electron 页面缩放模拟，没有切换 Windows 系统 DPI；4 倍 CPU 降速为 CDP 的 DevTools 同等设置，不能代表所有真实低配置电脑。
- 验收使用临时 userData，不修改日常数据库。尝试撤销 Playwright 后台运行开关、关闭聚焦模拟和直接启动 Electron 后，仍未取得可见性暂停通过证据；按用户要求停止排查。没有更改项目 Electron Main / Preload。

详细性能数值和真实窗口暂停结果以本次 `acceptance.json` 为准；这是同机短时采样，含开发环境原有开销。
