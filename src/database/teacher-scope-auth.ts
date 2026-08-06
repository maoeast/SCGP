/**
 * 教师数据隔离范围——登录态接入层
 *
 * 从 authStore 取当前用户角色与 id，构建「教师可见学生」过滤片段。
 * auth store 不可用（如初始化阶段）时返回空过滤，与 ClassAPI.getClasses 的降级语义一致。
 */

import { useAuthStore } from '../stores/auth'
import { buildTeacherStudentScope, type TeacherStudentScope } from './teacher-scope'

export function getCurrentTeacherStudentScope(alias = 's'): TeacherStudentScope {
  try {
    const authStore = useAuthStore()
    return buildTeacherStudentScope(alias, {
      role: authStore.user?.role,
      userId: authStore.user?.id,
    })
  } catch {
    return { sql: '', params: [] }
  }
}
