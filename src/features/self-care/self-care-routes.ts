import type { RouteRecordRaw } from 'vue-router'

import { TASK_TRAINING_MODULE_CODE } from '@/features/self-care/task-training-contract'

export const SELF_CARE_MODULE_CODE = TASK_TRAINING_MODULE_CODE
export const SELF_CARE_BASE_PATH = '/self-care'
export const SELF_CARE_TASKS_PATH = '/self-care/tasks'
export const SELF_CARE_TASK_NEW_PATH = '/self-care/tasks/new'
export const SELF_CARE_TASK_EDIT_PATH = '/self-care/tasks/:taskId/edit'
export const SELF_CARE_TASK_SELECT_STUDENT_PATH = '/self-care/tasks/:taskId/select-student'
export const SELF_CARE_TASK_EXECUTE_PATH = '/self-care/execute/:taskId/:studentId'

const SelfCareTaskList = () => import('@/views/self-care/TaskList.vue')
const SelfCareTaskEditor = () => import('@/views/self-care/TaskEditor.vue')
const SelfCareSelectStudent = () => import('@/views/self-care/SelectStudent.vue')
const SelfCareTaskExecution = () => import('@/views/self-care/TaskExecution.vue')

export const selfCareRoutes: RouteRecordRaw[] = [
  {
    path: 'self-care',
    name: 'SelfCareTraining',
    redirect: SELF_CARE_TASKS_PATH,
    meta: {
      title: '自理训练',
      icon: 'list-check',
      roles: ['admin', 'teacher'],
      moduleCode: SELF_CARE_MODULE_CODE,
    },
  },
  {
    path: 'self-care/tasks',
    name: 'SelfCareTaskList',
    component: SelfCareTaskList,
    meta: {
      title: '自理任务',
      hideInMenu: true,
      roles: ['admin', 'teacher'],
      moduleCode: SELF_CARE_MODULE_CODE,
    },
  },
  {
    path: 'self-care/tasks/new',
    name: 'SelfCareTaskCreate',
    component: SelfCareTaskEditor,
    meta: {
      title: '新建自理任务',
      hideInMenu: true,
      roles: ['admin', 'teacher'],
      moduleCode: SELF_CARE_MODULE_CODE,
    },
  },
  {
    path: 'self-care/tasks/:taskId/edit',
    name: 'SelfCareTaskEdit',
    component: SelfCareTaskEditor,
    meta: {
      title: '编辑自理任务',
      hideInMenu: true,
      roles: ['admin', 'teacher'],
      moduleCode: SELF_CARE_MODULE_CODE,
    },
  },
  {
    path: 'self-care/tasks/:taskId/select-student',
    name: 'SelfCareTaskSelectStudent',
    component: SelfCareSelectStudent,
    meta: {
      title: '选择学生 - 自理训练',
      hideInMenu: true,
      roles: ['admin', 'teacher'],
      moduleCode: SELF_CARE_MODULE_CODE,
    },
  },
  {
    path: 'self-care/execute/:taskId/:studentId',
    name: 'SelfCareTaskExecution',
    component: SelfCareTaskExecution,
    meta: {
      title: '自理任务训练',
      hideInMenu: true,
      roles: ['admin', 'teacher'],
      moduleCode: SELF_CARE_MODULE_CODE,
      immersiveShell: true,
    },
  },
]
