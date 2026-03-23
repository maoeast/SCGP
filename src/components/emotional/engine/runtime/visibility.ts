import type { EmotionalSessionOption } from '@/types/emotional'

type OptionLike = Pick<EmotionalSessionOption, 'isCorrect' | 'isAcceptable'>

export function getVisibleOptionsByHint<T extends OptionLike>(
  options: T[],
  hintLevel: 0 | 1 | 2 | 3,
) {
  if (hintLevel === 0 || hintLevel === 1) {
    return options
  }

  if (hintLevel === 2) {
    const correct = options.filter((option) => option.isCorrect || option.isAcceptable)
    const wrong = options.filter((option) => !option.isCorrect && !option.isAcceptable)
    return [...correct, ...wrong.slice(0, Math.ceil(wrong.length / 2))]
  }

  return options.filter((option) => option.isCorrect || option.isAcceptable)
}

export function getOptionVisualState(
  option: OptionLike,
  hintLevel: 0 | 1 | 2 | 3,
) {
  const positive = !!option.isCorrect || !!option.isAcceptable

  return {
    muted: hintLevel === 1 && !positive,
    highlighted: hintLevel >= 2 && positive,
  }
}
