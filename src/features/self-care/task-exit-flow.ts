export type TaskExitIntent = 'switch_student' | 'exit_training'

export interface TaskExitConfirmConfig {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  confirmRoute: string
  confirmNavigation: 'push' | 'replace'
}

function buildSwitchStudentRoute(taskId: number | null): string {
  return taskId && taskId > 0
    ? `/self-care/tasks/${taskId}/select-student`
    : '/self-care/tasks'
}

export function resolveTaskExitConfirmConfig(
  intent: TaskExitIntent,
  taskId: number | null,
): TaskExitConfirmConfig {
  if (intent === 'exit_training') {
    return {
      title: '训练还在进行中，确定要退出吗？',
      description: '当前进度尚未完成，现在退出会回到自理训练首页。你也可以继续留在这里，完成本轮观察与答题。',
      confirmLabel: '确认退出',
      cancelLabel: '继续训练',
      confirmRoute: '/self-care/tasks',
      confirmNavigation: 'replace',
    }
  }

  return {
    title: '确定要切换其他学生训练吗？',
    description: '当前进度尚未完成，现在切换会回到学生选择页面。你也可以继续留在这里，完成本轮观察与答题。',
    confirmLabel: '确认退出',
    cancelLabel: '继续训练',
    confirmRoute: buildSwitchStudentRoute(taskId),
    confirmNavigation: 'push',
  }
}
