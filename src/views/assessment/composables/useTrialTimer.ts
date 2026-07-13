/**
 * 绩效题试次计时器（trial-level reaction time）
 *
 * 仿 BalloonTapGame.vue 的 enteredZoneAt + performance.now 范式（仓库中最干净的
 * 「刺激呈现→反应」RT 测量）：
 * - startTrial() 在刺激呈现（题目/选项渲染完成）时调用，记录 onsetAt 时间戳；
 *   用 performance.now() 高精度单调时钟，不受系统墙钟调整影响。
 * - recordResponse() 在儿童作答时调用，返回 onsetAt→现在的 RT（ms）。
 * - RT 零点锚定「刺激呈现」，而非试次开始，杜绝把题面切换开销计入 RT。
 * - 未 startTrial 就 recordResponse 返回 null（防伪 RT）。
 *
 * @module views/assessment/composables/useTrialTimer
 */
import { ref } from 'vue'

export function useTrialTimer() {
  /** 刺激呈现时间戳（performance.now）；null 表示当前试次未开始计时 */
  const onsetAt = ref<number | null>(null)

  /** 刺激已呈现，开始计时（在题目/选项渲染完成后调用） */
  function startTrial() {
    onsetAt.value = performance.now()
  }

  /** 记录反应，返回 RT（ms）；未 startTrial 返回 null（不计伪 RT） */
  function recordResponse(): number | null {
    if (onsetAt.value === null) return null
    const rt = Math.max(0, Math.round(performance.now() - onsetAt.value))
    onsetAt.value = null
    return rt
  }

  /** 重置（取消当前试次计时，不产生 RT） */
  function reset() {
    onsetAt.value = null
  }

  return { startTrial, recordResponse, reset, onsetAt }
}
