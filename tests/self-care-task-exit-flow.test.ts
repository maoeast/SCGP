import assert from 'node:assert/strict'

import {
  resolveTaskExitConfirmConfig,
  type TaskExitIntent,
} from '../src/features/self-care/task-exit-flow.ts'

function expectRoute(
  intent: TaskExitIntent,
  taskId: number,
  expectedTitle: string,
  expectedRoute: string,
  expectedNavigation: 'push' | 'replace',
) {
  const result = resolveTaskExitConfirmConfig(intent, taskId)
  assert.equal(result.title, expectedTitle)
  assert.equal(result.confirmLabel, '确认退出')
  assert.equal(result.cancelLabel, '继续训练')
  assert.equal(result.confirmRoute, expectedRoute)
  assert.equal(result.confirmNavigation, expectedNavigation)
  assert.match(result.description, /当前进度尚未完成/)
}

expectRoute('switch_student', 23, '确定要切换其他学生训练吗？', '/self-care/tasks/23/select-student', 'push')
expectRoute('exit_training', 23, '训练还在进行中，确定要退出吗？', '/self-care/tasks', 'replace')

console.log('self-care task exit flow test passed')
