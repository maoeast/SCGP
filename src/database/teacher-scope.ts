/**
 * 教师数据隔离范围（teacher-scope）——纯函数核心（零依赖，可单测）
 *
 * 语义（与 ai-api.canAccessStudentMemory 的 v4.1 §9 M3 权限模型一致）：
 * - admin：不过滤，全量可见；
 * - teacher：仅可见「当前班级」（student.current_class_id）在本人任教班级
 *   （sys_class_teachers.teacher_id = 当前用户 id）内的学生；
 *   current_class_id 为 NULL（未分班）的学生对 teacher 不可见。
 * 每次查询实时计算，不保存权限快照；转班/撤权立即失效。
 *
 * 用法（查询必须给 student 表加别名，默认 's'）：
 *   const scope = buildTeacherStudentScope('s', { role, userId })
 *   sql += scope.sql          // 追加到 WHERE 之后
 *   params.push(...scope.params)
 *
 * 登录态接入见 ./teacher-scope-auth.ts（依赖 authStore，非纯模块）。
 */

export interface TeacherStudentScope {
  /** 追加到 WHERE 之后的 SQL 片段（无需过滤时为空字符串） */
  sql: string
  /** 追加到查询参数数组末尾的参数 */
  params: unknown[]
}

export interface TeacherScopeContext {
  role?: string | null
  userId?: number | null
}

const TEACHER_ROLE = 'teacher'

/** 校验表别名是合法标识符（防字符串拼装注入；别名由内部调用方写死，仅作防御） */
function assertSafeAlias(alias: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
    throw new Error(`teacher-scope: 非法的表别名 "${alias}"`)
  }
}

/**
 * 纯函数：按调用者角色构建「教师可见学生」过滤片段。
 * - admin 或缺少用户身份：返回空过滤（全量）；
 * - teacher：返回 EXISTS(sys_class_teachers) 过滤。
 */
export function buildTeacherStudentScope(alias: string, ctx: TeacherScopeContext): TeacherStudentScope {
  assertSafeAlias(alias)
  if (ctx.role !== TEACHER_ROLE || ctx.userId == null) {
    return { sql: '', params: [] }
  }
  return {
    sql: ` AND EXISTS (
      SELECT 1 FROM sys_class_teachers ct
      WHERE ct.class_id = ${alias}.current_class_id AND ct.teacher_id = ?
    )`,
    params: [ctx.userId],
  }
}
