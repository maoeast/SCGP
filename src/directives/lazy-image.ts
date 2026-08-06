/**
 * v-lazy-image 懒加载指令（原生 <img> 专用）
 *
 * 用法：
 *   <img v-lazy-image="url" />
 *   <img v-lazy-image="{ src: url }" />
 *
 * 行为：
 *   - 挂载时先移除真实 src（避免未进入视口就发起请求），进入视口前 200px
 *     才通过 IntersectionObserver 设置 src
 *   - 值变化时自动同步：尚未加载的更新待加载地址，已加载的直接更新 src
 *   - 不支持 IntersectionObserver 的环境自动降级为立即加载
 *
 * 注意：Element Plus 的 <el-image> 自带 lazy 属性，不需要也不应使用本指令。
 */
import type { Directive, DirectiveBinding } from 'vue'

export interface LazyImageValue {
  src: string
}

export type LazyImageBindingValue = string | LazyImageValue

// 提前预加载距离：进入视口前 200px 即开始加载，滚动时无感
const OBSERVER_ROOT_MARGIN = '200px'

function getSrc(binding: DirectiveBinding<LazyImageBindingValue>): string {
  const value = binding.value
  if (typeof value === 'string') {
    return value
  }
  return value?.src || ''
}

interface LazyImageElement extends HTMLImageElement {
  __lazyObserver?: IntersectionObserver
}

const lazyImageDirective: Directive<LazyImageElement, LazyImageBindingValue> = {
  mounted(el, binding) {
    const src = getSrc(binding)

    // 立即移除真实 src，避免未进入视口就发起请求
    el.removeAttribute('src')

    if (!src) {
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      // 降级：不支持 IntersectionObserver 的环境直接加载
      el.src = src
      return
    }

    el.dataset.lazySrc = src

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          const target = entry.target as LazyImageElement
          const pendingSrc = target.dataset.lazySrc
          if (pendingSrc) {
            target.src = pendingSrc
            delete target.dataset.lazySrc
          }
          observer.unobserve(target)
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN },
    )

    el.__lazyObserver = observer
    observer.observe(el)
  },
  updated(el, binding) {
    const src = getSrc(binding)

    // 尚未加载：仅更新待加载地址
    if (el.dataset.lazySrc !== undefined) {
      if (src) {
        el.dataset.lazySrc = src
      }
      return
    }

    // 已加载：直接同步
    if (src && el.src !== src) {
      el.src = src
    }
  },
  unmounted(el) {
    el.__lazyObserver?.disconnect()
    delete el.__lazyObserver
    delete el.dataset.lazySrc
  },
}

export default lazyImageDirective
