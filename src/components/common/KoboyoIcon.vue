<script setup lang="ts">
/**
 * KoboyoIcon — koboyo.com 手绘 SVG 图标渲染组件。
 *
 * 图标资产为单色 `fill="currentColor"` SVG（src/assets/icons/ 下），
 * 本组件用 CSS mask 把图标按 alpha 通道裁出来，再以 background-color 着色，
 * 因此可跟随调用方任意指定颜色（入口主题色 / 卡片白色等）。
 *
 * 重要：调用方必须通过 `import x from '*.svg?no-inline'` 引入资产——`?no-inline`
 * 强制 Vite 输出为独立文件（注意：Vite 7 中 `?url` 已不再强制不内联，必须用
 * `?no-inline`）。不要省略该后缀：Vite 默认把小 SVG 内联为百分号编码 data URL
 * （data:image/svg+xml,%3csvg...），Chromium 的 CSS mask-image 对该形式渲染失败，
 * 图标会退化为纯色方块（实测：base64 形式正常、百分号编码形式失败）。
 */
import { computed } from 'vue'

interface Props {
  /** SVG 资产 URL（由 `import ... from '*.svg'` 提供） */
  src: string
  /** 图标宽高，number 视为 px */
  size?: number | string
  /** 着色（默认跟随文本色） */
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 40,
  color: 'currentColor',
})

const sizeStyle = computed(() => {
  const px = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { width: px, height: px }
})
</script>

<template>
  <span
    class="koboyo-icon"
    aria-hidden="true"
    :style="{
      ...sizeStyle,
      backgroundColor: color,
      WebkitMaskImage: `url('${src}')`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url('${src}')`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }"
  />
</template>

<style scoped>
.koboyo-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
</style>
