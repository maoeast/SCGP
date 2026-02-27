import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 导出所有store
export { useAuthStore } from './auth'
export { useStudentStore } from './student'
export { useAssessmentStore } from './assessment'

// 导出类型
export type { User } from './auth'
export type { Student } from './student'
export type { AssessmentRecord, Question, Answer } from './assessment'