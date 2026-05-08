import type { RouteRecordRaw } from 'vue-router'

export const SELF_CARE_MODULE_CODE = 'life_skills' as const
export const SELF_CARE_BASE_PATH = '/self-care'
export const SELF_CARE_TASKS_PATH = '/self-care/tasks'

const SelfCareTaskList = () => import('@/views/self-care/TaskList.vue')

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
]
