import type { EmotionalFeedbackMessage } from '@/features/emotional/engine/types'
import type {
  EmotionalFeedbackCode,
  EmotionalSubModule,
} from '@/types/emotional'

const EMOTION_RETRY_DESCRIPTIONS = [
  '我们再看看场景里的线索，慢慢来。',
  '我先帮你把明显不太合适的选项变淡一点。',
  '这次我再缩小一点范围，你已经越来越接近了。',
  '试试从保留下来的这个方向开始，我们一起完成。',
] as const

const CARE_RETRY_DESCRIPTIONS = [
  '我们先看看对方现在的感受，再试一次。',
  '我先帮你把不太合适的话术变淡一点。',
  '现在已经缩小范围了，我们继续试试。',
  '试试从保留下来的表达开始，对方会更容易接受。',
] as const

export function buildFeedbackMessage(
  subModule: EmotionalSubModule,
  canAdvance: boolean,
  feedbackCode: EmotionalFeedbackCode,
  hintLevel: 0 | 1 | 2 | 3,
): EmotionalFeedbackMessage {
  if (canAdvance) {
    if (subModule === 'care_scene') {
      return {
        title: '你已经表达出了关心',
        description: feedbackCode === 'acceptable'
          ? '这是一个可以帮助对方的表达，我们继续换一个角度看看。'
          : '现在看看对方听起来最舒服的是哪一种说法。',
        type: 'success',
      }
    }

    return {
      title: '做得很好',
      description: feedbackCode === 'acceptable'
        ? '这是一个可以接受的答案，我们继续下一步。'
        : '你已经完成当前步骤，我们继续往下看。',
      type: 'success',
    }
  }

  const descriptions = subModule === 'care_scene'
    ? CARE_RETRY_DESCRIPTIONS
    : EMOTION_RETRY_DESCRIPTIONS

  return {
    title: subModule === 'care_scene' ? '我们再温柔地试一次' : '我们再试一次',
    description: descriptions[hintLevel] ?? descriptions[0],
    type: 'info',
  }
}
