import { getDatabase } from './init';
import type { ModuleCode } from '@/types/module';
import type {
  EmotionalTrainingSummaryRawData,
  PersistEmotionalSessionInput,
  PersistEmotionalSessionResult,
} from '@/types/emotional';
import { resolveTrainingEntryCode, resolveTrainingEntryCodeFromResource } from '@/utils/training-entry';
import { hashPasswordV1, verifyPasswordRecord } from '@/utils/password-security';
import { TrainingSessionWriter } from './training-session-writer';
import { getCurrentTeacherStudentScope } from './teacher-scope-auth';
import { FINE_MOTOR_QUESTIONS } from './fine-motor-questions';
import { CNBSR2016_QUESTIONS } from './cnbsr2016-questions';
import { GMFM_QUESTIONS } from './gmfm88-questions';
import { TGMD3_SKILLS } from './tgmd3-questions';

// 数据库基础操作类
// 【Plan B】使用主线程 SQLWrapper，防抖保存已内置
export class DatabaseAPI {
  protected db: any;

  constructor() {
    this.db = getDatabase();
  }

  // 执行查询（同步 - 默认行为）
  query(sql: string, params: any[] = []): any[] {
    try {
      return this.db.all(sql, params);
    } catch (error) {
      console.error('查询执行失败:', sql, params, error);
      throw error;
    }
  }

  /**
   * 异步查询方法
   * Plan B: 直接调用同步方法，SQLWrapper 内部处理防抖保存
   */
  async queryAsync(sql: string, params: any[] = []): Promise<any[]> {
    try {
      return this.db.all(sql, params);
    } catch (error) {
      console.error('异步查询执行失败:', sql, params, error);
      throw error;
    }
  }

  // 执行单行查询（同步 - 默认行为）
  queryOne(sql: string, params: any[] = []): any | null {
    try {
      return this.db.get(sql, params);
    } catch (error) {
      console.error('查询执行失败:', sql, params, error);
      throw error;
    }
  }

  /**
   * 异步查询单行方法
   * Plan B: 直接调用同步方法，SQLWrapper 内部处理防抖保存
   */
  async queryOneAsync(sql: string, params: any[] = []): Promise<any | null> {
    try {
      return this.db.get(sql, params);
    } catch (error) {
      console.error('异步查询执行失败:', sql, params, error);
      throw error;
    }
  }

  // 执行更新（INSERT/UPDATE/DELETE）（同步 - 默认行为）
  execute(sql: string, params: any[] = []): number {
    try {
      this.db.run(sql, params);
      return this.db.changes();
    } catch (error) {
      console.error('执行失败:', sql, params, error);
      throw error;
    }
  }

  /**
   * 异步执行方法
   * Plan B: 直接调用同步方法，SQLWrapper 内部处理防抖保存
   */
  async executeAsync(sql: string, params: any[] = []): Promise<number> {
    try {
      this.db.run(sql, params);
      return this.db.changes();
    } catch (error) {
      console.error('异步执行失败:', sql, params, error);
      throw error;
    }
  }

  // 获取最后插入的ID
  protected getLastInsertId(): number {
    return this.db.lastInsertId();
  }

  // 执行原始SQL（用于初始化数据）
  exec(sql: string): void {
    try {
      // SQLWrapper使用run方法而不是exec方法
      if (typeof this.db.run === 'function') {
        this.db.run(sql);
      } else if (typeof this.db.exec === 'function') {
        this.db.exec(sql);
      } else {
        throw new Error('数据库不支持执行SQL语句');
      }
    } catch (error) {
      console.error('SQL执行失败:', sql, error);
      throw error;
    }
  }

  /**
   * 强制立即保存（绕过防抖）
   *
   * 用途：在关键数据操作后立即落盘，防止数据丢失
   * 调用时机：createClass, updateClass, deleteClass 等关键操作后
   */
  protected async forceSave(): Promise<void> {
    if (this.db && typeof this.db.saveNow === 'function') {
      try {
        await this.db.saveNow()
        console.log('[DatabaseAPI] 强制保存完成')
      } catch (error) {
        console.error('[DatabaseAPI] 强制保存失败:', error)
      }
    }
  }
}

function parseResourceMetadata(metaData: unknown): Record<string, any> | undefined {
  if (!metaData) {
    return undefined
  }

  if (typeof metaData !== 'string') {
    return typeof metaData === 'object' ? metaData as Record<string, any> : undefined
  }

  try {
    const parsed = JSON.parse(metaData)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : undefined
  } catch {
    return undefined
  }
}

function parseJsonObject(value: unknown): Record<string, any> | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : null
    } catch {
      return null
    }
  }

  return typeof value === 'object' ? value as Record<string, any> : null
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) {
    return []
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed as T[] : []
    } catch {
      return []
    }
  }

  return Array.isArray(value) ? value as T[] : []
}

function getTransactionalDb(db: any) {
  return typeof db?.getRawDB === 'function' ? db.getRawDB() : db
}

function toIsoStringFromTimestamp(value: number | null | undefined): string {
  const normalized = Number(value)
  if (Number.isFinite(normalized)) {
    return new Date(normalized).toISOString()
  }

  return new Date().toISOString()
}

function normalizeDateTimeToIso(value: string | null | undefined): string {
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString()
    }
  }

  return new Date().toISOString()
}

function deriveEndedAt(startedAt: string, durationMs: number): string | null {
  const startedTimestamp = Date.parse(startedAt)
  if (!Number.isFinite(startedTimestamp)) {
    return null
  }

  return new Date(startedTimestamp + Math.max(0, durationMs)).toISOString()
}

function normalizeDurationMsFromSeconds(value: number | null | undefined): number {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.max(0, Math.round(normalized * 1000))
}

function buildGameTrainingSummaryPayload(rawData: any): Record<string, any> | null {
  if (!rawData || typeof rawData !== 'object') {
    return null
  }

  const payload: Record<string, any> = {}

  if (Number.isFinite(rawData.totalTrials)) {
    payload.totalTrials = Number(rawData.totalTrials)
  }

  if (Number.isFinite(rawData.correctTrials)) {
    payload.correctTrials = Number(rawData.correctTrials)
  }

  if (rawData.errors && typeof rawData.errors === 'object') {
    payload.errors = rawData.errors
  }

  if (rawData.behavior && typeof rawData.behavior === 'object') {
    payload.behavior = rawData.behavior
  }

  if (rawData.rhythmStats && typeof rawData.rhythmStats === 'object') {
    payload.rhythmStats = rawData.rhythmStats
  }

  if (rawData.trackingStats && typeof rawData.trackingStats === 'object') {
    payload.trackingStats = rawData.trackingStats
  }

  if (rawData.handGameStats && typeof rawData.handGameStats === 'object') {
    payload.handGameStats = rawData.handGameStats
  }

  return Object.keys(payload).length > 0 ? payload : null
}

function buildEquipmentTrainingSummaryPayload(data: {
  score: number
  prompt_level: number
  duration_seconds?: number
  notes?: string
  generated_comment?: string
  teacher_name?: string
  environment?: string
  batch_id?: number
}): Record<string, any> {
  return {
    score: data.score,
    promptLevel: data.prompt_level,
    durationSeconds: data.duration_seconds ?? null,
    notes: data.notes || null,
    generatedComment: data.generated_comment || null,
    teacherName: data.teacher_name || null,
    environment: data.environment || null,
    batchId: data.batch_id || null,
  }
}

function buildTrainingEntryResource(
  resourceRow: {
    name?: string
    module_code?: string
    resource_type?: string
    category?: string
    meta_data?: unknown
  } | null | undefined,
  fallback: {
    moduleCode?: string | null
    resourceType?: string | null
    category?: string | null
    metadata?: unknown
  } = {}
) {
  return {
    moduleCode: (resourceRow?.module_code || fallback.moduleCode || 'sensory') as ModuleCode,
    resourceType: resourceRow?.resource_type || fallback.resourceType || 'game',
    category: resourceRow?.category || fallback.category || '',
    metadata: parseResourceMetadata(resourceRow?.meta_data ?? fallback.metadata),
  }
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

function toEmotionalIsoTimestamp(value: number): string {
  return new Date(value).toISOString()
}

export interface TrainingSessionRecord {
  id: number
  student_id: number
  student_name?: string
  module_code: string
  entry_code: string
  session_family: string
  resource_id: number | null
  resource_name?: string | null
  resource_type: string | null
  task_id: number | null
  task_name_snapshot: string | null
  class_id: number | null
  class_name: string | null
  started_at: string
  ended_at: string | null
  duration_ms: number
  completion_status: string
  accuracy_rate: number | null
  avg_response_time_ms: number | null
  summary_payload: Record<string, any> | null
  source_table: string
  source_record_id: number
  created_at: string
  updated_at: string
}

// 用户相关操作
export class UserAPI extends DatabaseAPI {
  // ==================== 异步方法（Plan B: 主线程防抖保存） ====================
  // 用户登录验证
  async login(username: string, password: string): Promise<any | null> {
    const user = await this.queryOneAsync(
      'SELECT * FROM user WHERE username = ? AND is_active = 1',
      [username]
    );

    if (!user) {
      return null;
    }

    const passwordResult = await verifyPasswordRecord(password, user.password_hash, user.salt);
    if (!passwordResult.valid) {
      return null;
    }

    // 更新最后登录时间
    await this.executeAsync(
      'UPDATE user SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // 返回用户信息（不含密码）
    const { password_hash, salt, ...userInfo } = user;
    return userInfo;
  }

  // 修改密码
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.queryOneAsync(
      'SELECT password_hash, salt FROM user WHERE id = ?',
      [userId]
    );

    if (!user) {
      return false;
    }

    const passwordResult = await verifyPasswordRecord(oldPassword, user.password_hash, user.salt);
    if (!passwordResult.valid) {
      return false;
    }

    try {
      const { passwordHash: newPasswordHash, salt: newSalt } = await hashPasswordV1(newPassword);

      await this.executeAsync(
        'UPDATE user SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, newSalt, userId]
      );

      return true;
    } catch (error) {
      console.error('密码加密失败:', error);
      return false;
    }
  }

  // 获取所有用户
  async getAllUsers(): Promise<any[]> {
    return await this.queryAsync(`
      SELECT id, username, role, name, email, avatar_path, last_login, is_active, created_at
      FROM user
      ORDER BY created_at DESC
    `)
  }

  // 根据ID获取用户
  async getUserById(id: number): Promise<any | null> {
    return await this.queryOneAsync(
      'SELECT id, username, role, name, email, avatar_path, last_login, is_active, created_at FROM user WHERE id = ?',
      [id]
    )
  }

  // 检查用户名是否存在
  async isUsernameExists(username: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM user WHERE username = ?'
    const params: any[] = [username]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await this.queryOneAsync(sql, params)
    return result && result.count > 0
  }

  // 新增用户
  async createUser(userData: {
    username: string
    password: string
    role: 'admin' | 'teacher'
    name: string
    email?: string
  }): Promise<number> {
    // 检查用户名是否已存在
    if (await this.isUsernameExists(userData.username)) {
      throw new Error('用户名已存在')
    }

    const { passwordHash, salt } = await hashPasswordV1(userData.password)

    // 插入用户
    await this.executeAsync(`
      INSERT INTO user (username, password_hash, salt, role, name, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userData.username, passwordHash, salt, userData.role, userData.name, userData.email || null])

    // 返回新插入的用户ID
    const result = await this.queryOneAsync('SELECT last_insert_rowid() as id')
    return result ? result.id : 0
  }

  // 更新用户
  async updateUser(id: number, userData: {
    username?: string
    role?: 'admin' | 'teacher'
    name?: string
    email?: string
    avatar_path?: string | null
    is_active?: number
  }): Promise<boolean> {
    const user = await this.getUserById(id)
    if (!user) {
      throw new Error('用户不存在')
    }

    // 检查用户名是否被其他用户占用
    if (userData.username && userData.username !== user.username) {
      if (await this.isUsernameExists(userData.username, id)) {
        throw new Error('用户名已存在')
      }
    }

    const updates: string[] = []
    const params: any[] = []

    if (userData.username !== undefined) {
      updates.push('username = ?')
      params.push(userData.username)
    }
    if (userData.role !== undefined) {
      updates.push('role = ?')
      params.push(userData.role)
    }
    if (userData.name !== undefined) {
      updates.push('name = ?')
      params.push(userData.name)
    }
    if (userData.email !== undefined) {
      updates.push('email = ?')
      params.push(userData.email)
    }
    if (userData.avatar_path !== undefined) {
      updates.push('avatar_path = ?')
      params.push(userData.avatar_path || null)
    }
    if (userData.is_active !== undefined) {
      updates.push('is_active = ?')
      params.push(userData.is_active)
    }

    if (updates.length === 0) {
      return false
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)

    await this.executeAsync(`
      UPDATE user SET ${updates.join(', ')} WHERE id = ?
    `, params)

    return true
  }

  // 重置用户密码
  async resetUserPassword(id: number, newPassword: string): Promise<boolean> {
    const user = await this.queryOneAsync('SELECT * FROM user WHERE id = ?', [id])
    if (!user) {
      throw new Error('用户不存在')
    }

    const { passwordHash, salt } = await hashPasswordV1(newPassword)

    await this.executeAsync(
      'UPDATE user SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, salt, id]
    )

    return true
  }

  // 删除用户
  async deleteUser(id: number): Promise<boolean> {
    const user = await this.getUserById(id)
    if (!user) {
      throw new Error('用户不存在')
    }

    // 不允许删除ID为1的默认管理员
    if (id === 1) {
      throw new Error('不能删除默认管理员账号')
    }

    await this.executeAsync('DELETE FROM user WHERE id = ?', [id])
    return true
  }

  // 启用/禁用用户
  async toggleUserActive(id: number, isActive: boolean): Promise<boolean> {
    const user = await this.getUserById(id)
    if (!user) {
      throw new Error('用户不存在')
    }

    // 不允许禁用ID为1的默认管理员
    if (id === 1 && !isActive) {
      throw new Error('不能禁用默认管理员账号')
    }

    await this.executeAsync(
      'UPDATE user SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive ? 1 : 0, id]
    )

    return true
  }

  // 获取用户统计
  async getUserStats(): Promise<{
    total: number
    admin: number
    teacher: number
    active: number
    inactive: number
  }> {
    const total = await this.queryOneAsync('SELECT COUNT(*) as count FROM user')
    const admin = await this.queryOneAsync("SELECT COUNT(*) as count FROM user WHERE role = 'admin'")
    const teacher = await this.queryOneAsync("SELECT COUNT(*) as count FROM user WHERE role = 'teacher'")
    const active = await this.queryOneAsync('SELECT COUNT(*) as count FROM user WHERE is_active = 1')
    const inactive = await this.queryOneAsync('SELECT COUNT(*) as count FROM user WHERE is_active = 0')

    return {
      total: total?.count || 0,
      admin: admin?.count || 0,
      teacher: teacher?.count || 0,
      active: active?.count || 0,
      inactive: inactive?.count || 0
    }
  }

  // 记录登录日志
  async addLoginLog(params: {
    userId: number
    username: string
    status: 'success' | 'failed'
    failureReason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<number> {
    await this.executeAsync(`
      INSERT INTO login_log (user_id, username, login_time, ip_address, user_agent, status, failure_reason)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
    `, [params.userId, params.username, params.ipAddress || null, params.userAgent || null, params.status, params.failureReason || null])

    const result = await this.queryOneAsync('SELECT last_insert_rowid() as id')
    return result ? result.id : 0
  }

  // 获取用户登录日志
  async getUserLoginLogs(userId: number, limit: number = 20): Promise<any[]> {
    return await this.queryAsync(`
      SELECT id, user_id, username, login_time, ip_address, status, failure_reason, created_at
      FROM login_log
      WHERE user_id = ?
      ORDER BY login_time DESC
      LIMIT ?
    `, [userId, limit])
  }

  // 获取最近的登录日志（成功）
  async getRecentSuccessLogs(userId: number, limit: number = 10): Promise<any[]> {
    return await this.queryAsync(`
      SELECT id, user_id, username, login_time, ip_address
      FROM login_log
      WHERE user_id = ? AND status = 'success'
      ORDER BY login_time DESC
      LIMIT ?
    `, [userId, limit])
  }
}

// 学生相关操作
export class StudentAPI extends DatabaseAPI {
  // ==================== 异步方法（Plan B: 主线程防抖保存） ====================
  // 获取所有学生
  async getAllStudents(): Promise<any[]> {
    const scope = getCurrentTeacherStudentScope('s')
    const result = await this.queryAsync(`
      SELECT
        id,
        name,
        gender,
        birthday,
        student_no,
        disorder,
        avatar_path,
        current_class_id,
        current_class_name,
        created_at,
        updated_at
      FROM student s
      WHERE 1=1${scope.sql}
      ORDER BY created_at DESC
    `, scope.params);
    console.log('从数据库查询到的学生:', result)
    return result;
  }

  // 根据ID获取学生（教师数据隔离：非任教班级学生的档案不可见）
  async getStudentById(id: number): Promise<any | null> {
    const scope = getCurrentTeacherStudentScope('s')
    return await this.queryOneAsync(`
      SELECT * FROM student s
      WHERE s.id = ?${scope.sql}
    `, [id, ...scope.params]);
  }

  // 添加学生
  async addStudent(student: any): Promise<number> {
    console.log('正在添加学生:', student);
    await this.executeAsync(`
      INSERT INTO student (name, gender, birthday, student_no, disorder, avatar_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [student.name, student.gender, student.birthday, student.student_no, student.disorder, student.avatar_path || null]);

    // 通过查询获取刚插入的学生ID
    const result = await this.queryOneAsync('SELECT last_insert_rowid() as id');
    const insertedId = result ? result.id : 0;
    console.log('学生插入成功，ID:', insertedId);

    // 验证插入是否成功
    const verifyStudent = await this.getStudentById(insertedId);
    console.log('验证插入的学生:', verifyStudent);

    return insertedId;
  }

  // 更新学生信息
  async updateStudent(id: number, student: any): Promise<boolean> {
    const rowsAffected = await this.executeAsync(`
      UPDATE student
      SET name = ?, gender = ?, birthday = ?, student_no = ?, disorder = ?, avatar_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [student.name, student.gender, student.birthday, student.student_no, student.disorder, student.avatar_path || null, id]);

    return rowsAffected > 0;
  }

  // 删除学生
  async deleteStudent(id: number): Promise<boolean> {
    const rowsAffected = await this.executeAsync('DELETE FROM student WHERE id = ?', [id]);
    return rowsAffected > 0;
  }

  // 搜索学生
  async searchStudents(keyword: string): Promise<any[]> {
    const scope = getCurrentTeacherStudentScope('s')
    return await this.queryAsync(`
      SELECT
        id,
        name,
        gender,
        birthday,
        student_no,
        disorder,
        avatar_path,
        current_class_id,
        current_class_name,
        created_at,
        updated_at
      FROM student s
      WHERE (name LIKE ? OR disorder LIKE ? OR student_no LIKE ?)${scope.sql}
      ORDER BY name
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, ...scope.params]);
  }
}

// S-M量表相关操作
export class SMAssessmentAPI extends DatabaseAPI {
  // 获取年龄阶段
  getAgeStages(): any[] {
    return this.query('SELECT * FROM sm_age_stage ORDER BY age_min');
  }

  // 根据年龄获取对应阶段
  getAgeStageByAge(ageInMonths: number): any | null {
    return this.queryOne(
      'SELECT * FROM sm_age_stage WHERE ? BETWEEN age_min AND age_max',
      [ageInMonths]
    );
  }

  // 获取评估题目
  getQuestions(ageStage: number): any[] {
    return this.query(`
      SELECT * FROM sm_question
      WHERE age_stage = ?
      ORDER BY id
    `, [ageStage]);
  }

  // 获取年龄阶段的起始题目ID
  getStartQuestionId(ageStage: number): number {
    // 根据S-M量表题目分布，每个年龄阶段的起始题目ID
    const stageStartIds: Record<number, number> = {
      1: 1,   // I.6个月-1岁11个月: 题目1-19
      2: 20,  // II.2岁-3岁5个月: 题目20-41
      3: 42,  // III.3岁6个月-4岁11个月: 题目42-63
      4: 64,  // IV.5岁-6岁5个月: 题目64-80
      5: 81,  // V.6岁6个月-8岁5个月: 题目81-96
      6: 97,  // VI.8岁6个月-10岁5个月: 题目97-113
      7: 114  // VII.10岁6个月以上: 题目114-132
    }
    return stageStartIds[ageStage] || 1
  }

  // 创建评估记录
  createAssessment(assessment: any): number {
    console.log('📝 开始插入S-M评估记录...', assessment);

    try {
      this.execute(`
        INSERT INTO sm_assess (student_id, age_stage, raw_score, sq_score, level, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [assessment.student_id, assessment.age_stage, assessment.raw_score, assessment.sq_score, assessment.level, assessment.start_time, assessment.end_time]);

      console.log('📝 INSERT执行完成，查询最新记录ID...');

      // SQL.js的last_insert_rowid()有时不可靠，直接查询最新记录
      const latestRecord = this.queryOne('SELECT id FROM sm_assess ORDER BY id DESC LIMIT 1');
      console.log('📝 最新记录:', latestRecord);

      const insertedId = latestRecord ? latestRecord.id : 0;
      console.log('✅ S-M评估插入成功，ID:', insertedId);

      return insertedId;
    } catch (error) {
      console.error('❌ S-M评估插入失败:', error);
      throw error;
    }
  }

  // 保存评估详情
  saveAssessmentDetail(detail: any): void {
    console.log('保存S-M评估详情:', detail)
    try {
      this.execute(`
        INSERT INTO sm_assess_detail (assess_id, question_id, score, answer_time)
        VALUES (?, ?, ?, ?)
      `, [detail.assess_id, detail.question_id, detail.score, detail.answer_time]);
      console.log('S-M评估详情保存成功')
    } catch (error) {
      console.error('保存S-M评估详情失败:', error)
      throw error
    }
  }

  // 获取单个评估记录
  getAssessment(assessId: number): any | null {
    return this.queryOne(`
      SELECT
        a.id,
        a.student_id,
        a.age_stage,
        a.raw_score,
        a.sq_score,
        a.level,
        a.start_time,
        a.end_time,
        a.created_at
      FROM sm_assess a
      WHERE a.id = ?
    `, [assessId]);
  }

  // 获取评估详情
  getAssessmentDetails(assessId: number): any[] {
    console.log('查询S-M评估详情，assessId:', assessId)
    const details = this.query(`
      SELECT
        d.question_id,
        d.score,
        q.title,
        q.dimension,
        q.age_stage
      FROM sm_assess_detail d
      JOIN sm_question q ON d.question_id = q.id
      WHERE d.assess_id = ?
      ORDER BY q.id
    `, [assessId]);

    console.log('查询到的S-M评估详情:', details)
    console.log('详情数量:', details.length)

    // 如果JOIN查询没有结果，尝试不JOIN的查询
    if (details.length === 0) {
      console.log('JOIN查询无结果，尝试直接查询详情表')
      const directDetails = this.query(`
        SELECT
          d.question_id,
          d.score
        FROM sm_assess_detail d
        WHERE d.assess_id = ?
        ORDER BY d.question_id
      `, [assessId]);

      console.log('直接查询的详情:', directDetails)
      return directDetails
    }

    return details
  }

  // 获取学生的评估历史
  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT a.*, s.name as student_name, st.name as stage_name
      FROM sm_assess a
      LEFT JOIN student s ON a.student_id = s.id
      LEFT JOIN sm_age_stage st ON a.age_stage = st.id
      WHERE a.student_id = ?
      ORDER BY a.created_at DESC
    `, [studentId]);
  }
}

// WeeFIM评估相关操作
export class WeeFIMAPI extends DatabaseAPI {
  // 获取WeeFIM评估记录
  getAssessment(assessId: number): any | null {
    return this.queryOne(`
      SELECT
        a.id,
        a.student_id,
        a.total_score,
        a.adl_score,
        a.cognitive_score,
        a.level,
        a.start_time,
        a.end_time,
        a.created_at
      FROM weefim_assess a
      WHERE a.id = ?
    `, [assessId]);
  }

  // 获取学生的所有WeeFIM评估记录
  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT
        a.id,
        a.student_id,
        a.total_score,
        a.adl_score,
        a.cognitive_score,
        a.level,
        a.start_time,
        a.end_time,
        a.created_at
      FROM weefim_assess a
      WHERE a.student_id = ?
      ORDER BY a.created_at DESC
    `, [studentId]);
  }

  // 获取WeeFIM评估详情
  getAssessmentDetails(assessId: number): any[] {
    console.log('查询WeeFIM评估详情，assessId:', assessId)

    // 首先尝试JOIN查询
    const details = this.query(`
      SELECT
        d.question_id,
        d.score,
        q.title,
        q.category_id,
        c.name as category_name
      FROM weefim_assess_detail d
      JOIN weefim_question q ON d.question_id = q.id
      JOIN weefim_category c ON q.category_id = c.id
      WHERE d.assess_id = ?
      ORDER BY q.category_id, q.id
    `, [assessId]);

    console.log('JOIN查询结果:', details)

    // 如果JOIN查询没有结果，尝试直接查询评估详情表
    if (!details || details.length === 0) {
      console.log('JOIN查询失败，尝试直接查询评估详情')
      const directDetails = this.query(`
        SELECT
          question_id,
          score
        FROM weefim_assess_detail
        WHERE assess_id = ?
        ORDER BY question_id
      `, [assessId]);

      console.log('直接查询结果:', directDetails)
      return directDetails
    }

    return details
  }

  // 创建WeeFIM评估记录
  createAssessment(assessment: any): number {
    this.execute(`
      INSERT INTO weefim_assess (student_id, total_score, adl_score, cognitive_score, level, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.total_score,
      assessment.adl_score,
      assessment.cognitive_score,
      assessment.level,
      assessment.start_time,
      assessment.end_time
    ]);

    return this.getLastInsertId();
  }

  // 保存WeeFIM评估详情
  saveAssessmentDetails(details: any[]): void {
    details.forEach(detail => {
      this.execute(`
        INSERT INTO weefim_assess_detail (assess_id, question_id, score)
        VALUES (?, ?, ?)
      `, [detail.assess_id, detail.question_id, detail.score]);
    });
  }
}

type FineMotorAutoFillReason = 'basal' | 'ceiling' | null

interface FineMotorAssessmentInput {
  student_id: number
  age_months: number
  total_score: number
  standard_score: number
  level: string
  level_code?: string | null
  total_max_score: number
  total_mastery_rate: number
  domain_results: unknown
  iep_targets: unknown
  start_time: string
  end_time?: string | null
}

interface FineMotorAssessmentDetailInput {
  question_id: number
  dimension: string
  score: number
  answer_time?: number
  is_auto_filled?: boolean
  auto_fill_reason?: FineMotorAutoFillReason
}

const FINE_MOTOR_QUESTION_MAP = new Map(
  FINE_MOTOR_QUESTIONS.map((question) => [question.id, question]),
)

type Cnbsr2016AutoFillReason = 'basal' | 'ceiling' | null

interface Cnbsr2016AssessmentInput {
  student_id: number
  age_months: number
  total_mental_age: number
  dq: number
  dq_status: 'excellent' | 'good' | 'normal' | 'borderline' | 'delayed'
  age_bracket: 'a1' | 'a2' | 'a3' | 'a4'
  level: string
  level_code?: string | null
  domain_results: unknown
  domain_feedback: unknown
  iep_targets: unknown
  iep_interventions: unknown
  overall_rule?: unknown
  expert_clinical?: unknown
  start_time: string
  end_time?: string | null
}

interface Cnbsr2016AssessmentDetailInput {
  question_id: number
  dimension: string
  age_group_months: number
  score_weight: number
  score: number
  answer_time?: number
  is_auto_filled?: boolean
  auto_fill_reason?: Cnbsr2016AutoFillReason
}

const CNBSR2016_QUESTION_MAP = new Map(
  CNBSR2016_QUESTIONS.map((question) => [question.id, question]),
)

interface Gmfm88AssessmentInput {
  student_id: number
  age_months: number
  total_score: number
  raw_total_score: number
  total_max_score: number
  level: string
  level_code?: string | null
  domain_results: unknown
  domain_feedback: unknown
  iep_targets: unknown
  flags: unknown
  overall_rule?: unknown
  start_time: string
  end_time?: string | null
}

interface Gmfm88AssessmentDetailInput {
  question_id: number
  item_code: string
  dimension: string
  score: number
  raw_value: string
  is_nt?: boolean
  answer_time?: number
}

const GMFM88_QUESTION_MAP = new Map(
  GMFM_QUESTIONS.map((question) => [question.id, question]),
)

interface Tgmd3AssessmentInput {
  student_id: number
  age_months: number
  gender: string
  locomotor_score: number
  locomotor_percent: number
  locomotor_level?: number | null
  ball_skills_score: number
  ball_skills_percent: number
  ball_skills_level?: number | null
  total_score: number
  total_percent: number
  total_level?: number | null
  level: string
  level_code?: string | null
  domain_results: unknown
  domain_feedback: unknown
  skill_results: unknown
  norm_summary: unknown
  iep_targets: unknown
  flags: unknown
  overall_rule?: unknown
  start_time: string
  end_time?: string | null
}

interface Tgmd3AssessmentDetailInput {
  question_id: number
  item_code: string
  dimension: string
  score: number
  max_score: number
  raw_value: string
  criteria_snapshot?: unknown
  answer_time?: number
}

const TGMD3_QUESTION_MAP = new Map(
  TGMD3_SKILLS.map((question) => [question.id, question]),
)

export class FineMotorAssessmentAPI extends DatabaseAPI {
  saveAssessment(data: {
    assessment: FineMotorAssessmentInput
    details: FineMotorAssessmentDetailInput[]
  }): number {
    const rawDb = getTransactionalDb(this.db)
    rawDb.run('BEGIN TRANSACTION')

    try {
      const assessId = this.createAssessment(data.assessment)
      this.saveAssessmentDetails(assessId, data.details)
      rawDb.run('COMMIT')
      return assessId
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  createAssessment(assessment: FineMotorAssessmentInput): number {
    this.execute(`
      INSERT INTO fine_motor_assess (
        student_id, age_months, total_score, standard_score,
        level, level_code, total_max_score, total_mastery_rate,
        domain_results, iep_targets, start_time, end_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.age_months,
      assessment.total_score,
      assessment.standard_score,
      assessment.level,
      assessment.level_code || null,
      assessment.total_max_score,
      assessment.total_mastery_rate,
      JSON.stringify(assessment.domain_results ?? []),
      JSON.stringify(assessment.iep_targets ?? []),
      assessment.start_time,
      assessment.end_time || null,
    ])

    return this.getLastInsertId()
  }

  saveAssessmentDetails(assessId: number, details: FineMotorAssessmentDetailInput[]): void {
    details.forEach((detail) => {
      this.execute(`
        INSERT INTO fine_motor_assess_detail (
          assess_id, question_id, dimension, score,
          answer_time, is_auto_filled, auto_fill_reason
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        assessId,
        detail.question_id,
        detail.dimension,
        detail.score,
        detail.answer_time || 0,
        detail.is_auto_filled ? 1 : 0,
        detail.auto_fill_reason || null,
      ])
    })
  }

  getAssessment(assessId: number): any | null {
    const record = this.queryOne(`
      SELECT
        a.id,
        a.student_id,
        a.age_months,
        a.total_score,
        a.standard_score,
        a.level,
        a.level_code,
        a.total_max_score,
        a.total_mastery_rate,
        a.domain_results,
        a.iep_targets,
        a.start_time,
        a.end_time,
        a.created_at,
        s.name as student_name,
        s.gender as student_gender,
        s.birthday as student_birthday
      FROM fine_motor_assess a
      LEFT JOIN student s ON a.student_id = s.id
      WHERE a.id = ?
    `, [assessId])

    if (!record) {
      return null
    }

    return {
      ...record,
      domain_results: parseJsonArray(record.domain_results),
      iep_targets: parseJsonArray(record.iep_targets),
    }
  }

  getAssessmentDetails(assessId: number): any[] {
    const details = this.query(`
      SELECT
        question_id,
        dimension,
        score,
        answer_time,
        is_auto_filled,
        auto_fill_reason,
        created_at
      FROM fine_motor_assess_detail
      WHERE assess_id = ?
      ORDER BY question_id
    `, [assessId])

    return details.map((detail: any) => {
      const question = FINE_MOTOR_QUESTION_MAP.get(Number(detail.question_id))

      return {
        ...detail,
        is_auto_filled: Number(detail.is_auto_filled) === 1,
        title: question?.title || '',
        item_code: question?.itemCode || null,
        dimension_name: question?.dimensionName || detail.dimension,
        reference_age_min_months: question?.referenceAge?.minMonths ?? null,
        reference_age_max_months: question?.referenceAge?.maxMonths ?? null,
        iep_goal: question?.iepGoal || null,
        expert_advice: question?.expertAdvice || null,
      }
    })
  }

  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT
        id,
        student_id,
        age_months,
        total_score,
        standard_score,
        level,
        level_code,
        total_max_score,
        total_mastery_rate,
        start_time,
        end_time,
        created_at
      FROM fine_motor_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

export class Cnbsr2016AssessmentAPI extends DatabaseAPI {
  saveAssessment(data: {
    assessment: Cnbsr2016AssessmentInput
    details: Cnbsr2016AssessmentDetailInput[]
  }): number {
    const rawDb = getTransactionalDb(this.db)
    rawDb.run('BEGIN TRANSACTION')

    try {
      const assessId = this.createAssessment(data.assessment)
      this.saveAssessmentDetails(assessId, data.details)
      rawDb.run('COMMIT')
      return assessId
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  createAssessment(assessment: Cnbsr2016AssessmentInput): number {
    this.execute(`
      INSERT INTO cnbsr2016_assess (
        student_id, age_months, total_mental_age, dq,
        dq_status, age_bracket, level, level_code,
        domain_results, domain_feedback, iep_targets, iep_interventions,
        overall_rule, expert_clinical, start_time, end_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.age_months,
      assessment.total_mental_age,
      assessment.dq,
      assessment.dq_status,
      assessment.age_bracket,
      assessment.level,
      assessment.level_code || null,
      JSON.stringify(assessment.domain_results ?? []),
      JSON.stringify(assessment.domain_feedback ?? []),
      JSON.stringify(assessment.iep_targets ?? []),
      JSON.stringify(assessment.iep_interventions ?? []),
      assessment.overall_rule ? JSON.stringify(assessment.overall_rule) : null,
      assessment.expert_clinical ? JSON.stringify(assessment.expert_clinical) : null,
      assessment.start_time,
      assessment.end_time || null,
    ])

    return this.getLastInsertId()
  }

  saveAssessmentDetails(assessId: number, details: Cnbsr2016AssessmentDetailInput[]): void {
    details.forEach((detail) => {
      this.execute(`
        INSERT INTO cnbsr2016_assess_detail (
          assess_id, question_id, dimension, age_group_months,
          score_weight, score, answer_time, is_auto_filled, auto_fill_reason
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assessId,
        detail.question_id,
        detail.dimension,
        detail.age_group_months,
        detail.score_weight,
        detail.score,
        detail.answer_time || 0,
        detail.is_auto_filled ? 1 : 0,
        detail.auto_fill_reason || null,
      ])
    })
  }

  getAssessment(assessId: number): any | null {
    const record = this.queryOne(`
      SELECT
        a.id,
        a.student_id,
        a.age_months,
        a.total_mental_age,
        a.dq,
        a.dq_status,
        a.age_bracket,
        a.level,
        a.level_code,
        a.domain_results,
        a.domain_feedback,
        a.iep_targets,
        a.iep_interventions,
        a.overall_rule,
        a.expert_clinical,
        a.start_time,
        a.end_time,
        a.created_at,
        s.name as student_name,
        s.gender as student_gender,
        s.birthday as student_birthday
      FROM cnbsr2016_assess a
      LEFT JOIN student s ON a.student_id = s.id
      WHERE a.id = ?
    `, [assessId])

    if (!record) {
      return null
    }

    return {
      ...record,
      domain_results: parseJsonArray(record.domain_results),
      domain_feedback: parseJsonArray(record.domain_feedback),
      iep_targets: parseJsonArray(record.iep_targets),
      iep_interventions: parseJsonArray(record.iep_interventions),
      overall_rule: parseJsonObject(record.overall_rule),
      expert_clinical: parseJsonObject(record.expert_clinical),
    }
  }

  getAssessmentDetails(assessId: number): any[] {
    const details = this.query(`
      SELECT
        question_id,
        dimension,
        age_group_months,
        score_weight,
        score,
        answer_time,
        is_auto_filled,
        auto_fill_reason,
        created_at
      FROM cnbsr2016_assess_detail
      WHERE assess_id = ?
      ORDER BY question_id
    `, [assessId])

    return details.map((detail: any) => {
      const question = CNBSR2016_QUESTION_MAP.get(Number(detail.question_id))

      return {
        ...detail,
        is_auto_filled: Number(detail.is_auto_filled) === 1,
        item_code: question?.itemCode || null,
        title: question?.title || '',
        dimension_name: question?.domainName || detail.dimension,
        age_band: question?.ageBand?.label || null,
        prompt: question?.prompt || null,
        pass_criteria: question?.passCriteria || null,
      }
    })
  }

  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT
        id,
        student_id,
        age_months,
        total_mental_age,
        dq,
        dq_status,
        age_bracket,
        level,
        level_code,
        start_time,
        end_time,
        created_at
      FROM cnbsr2016_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

export class Gmfm88AssessmentAPI extends DatabaseAPI {
  saveAssessment(data: {
    assessment: Gmfm88AssessmentInput
    details: Gmfm88AssessmentDetailInput[]
  }): number {
    const rawDb = getTransactionalDb(this.db)
    rawDb.run('BEGIN TRANSACTION')

    try {
      const assessId = this.createAssessment(data.assessment)
      this.saveAssessmentDetails(assessId, data.details)
      rawDb.run('COMMIT')
      return assessId
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  createAssessment(assessment: Gmfm88AssessmentInput): number {
    this.execute(`
      INSERT INTO gmfm_88_assess (
        student_id, age_months, total_score, raw_total_score,
        total_max_score, level, level_code, domain_results,
        domain_feedback, iep_targets, flags, overall_rule,
        start_time, end_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.age_months,
      assessment.total_score,
      assessment.raw_total_score,
      assessment.total_max_score,
      assessment.level,
      assessment.level_code || null,
      JSON.stringify(assessment.domain_results ?? []),
      JSON.stringify(assessment.domain_feedback ?? []),
      JSON.stringify(assessment.iep_targets ?? []),
      JSON.stringify(assessment.flags ?? []),
      assessment.overall_rule ? JSON.stringify(assessment.overall_rule) : null,
      assessment.start_time,
      assessment.end_time || null,
    ])

    return this.getLastInsertId()
  }

  saveAssessmentDetails(assessId: number, details: Gmfm88AssessmentDetailInput[]): void {
    details.forEach((detail) => {
      this.execute(`
        INSERT INTO gmfm_88_assess_detail (
          assess_id, question_id, item_code, dimension,
          score, raw_value, is_nt, answer_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assessId,
        detail.question_id,
        detail.item_code,
        detail.dimension,
        detail.score,
        detail.raw_value,
        detail.is_nt ? 1 : 0,
        detail.answer_time || 0,
      ])
    })
  }

  getAssessment(assessId: number): any | null {
    const record = this.queryOne(`
      SELECT
        a.id,
        a.student_id,
        a.age_months,
        a.total_score,
        a.raw_total_score,
        a.total_max_score,
        a.level,
        a.level_code,
        a.domain_results,
        a.domain_feedback,
        a.iep_targets,
        a.flags,
        a.overall_rule,
        a.start_time,
        a.end_time,
        a.created_at,
        s.name as student_name,
        s.gender as student_gender,
        s.birthday as student_birthday
      FROM gmfm_88_assess a
      LEFT JOIN student s ON a.student_id = s.id
      WHERE a.id = ?
    `, [assessId])

    if (!record) {
      return null
    }

    return {
      ...record,
      domain_results: parseJsonArray(record.domain_results),
      domain_feedback: parseJsonArray(record.domain_feedback),
      iep_targets: parseJsonArray(record.iep_targets),
      flags: parseJsonArray(record.flags),
      overall_rule: parseJsonObject(record.overall_rule),
    }
  }

  getAssessmentDetails(assessId: number): any[] {
    const details = this.query(`
      SELECT
        question_id,
        item_code,
        dimension,
        score,
        raw_value,
        is_nt,
        answer_time,
        created_at
      FROM gmfm_88_assess_detail
      WHERE assess_id = ?
      ORDER BY question_id
    `, [assessId])

    return details.map((detail: any) => {
      const question = GMFM88_QUESTION_MAP.get(Number(detail.question_id))

      return {
        ...detail,
        is_nt: Number(detail.is_nt) === 1,
        title: question?.title || '',
        dimension_name: question?.dimensionName || detail.dimension,
      }
    })
  }

  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT
        id,
        student_id,
        age_months,
        total_score,
        raw_total_score,
        total_max_score,
        level,
        level_code,
        start_time,
        end_time,
        created_at
      FROM gmfm_88_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

export class Tgmd3AssessmentAPI extends DatabaseAPI {
  saveAssessment(data: {
    assessment: Tgmd3AssessmentInput
    details: Tgmd3AssessmentDetailInput[]
  }): number {
    const rawDb = getTransactionalDb(this.db)
    rawDb.run('BEGIN TRANSACTION')

    try {
      const assessId = this.createAssessment(data.assessment)
      this.saveAssessmentDetails(assessId, data.details)
      rawDb.run('COMMIT')
      return assessId
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  createAssessment(assessment: Tgmd3AssessmentInput): number {
    this.execute(`
      INSERT INTO tgmd_3_assess (
        student_id, age_months, gender, locomotor_score, locomotor_percent,
        locomotor_level, ball_skills_score, ball_skills_percent, ball_skills_level,
        total_score, total_percent, total_level, level, level_code,
        domain_results, domain_feedback, skill_results, norm_summary, iep_targets,
        flags, overall_rule, start_time, end_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.age_months,
      assessment.gender,
      assessment.locomotor_score,
      assessment.locomotor_percent,
      assessment.locomotor_level ?? null,
      assessment.ball_skills_score,
      assessment.ball_skills_percent,
      assessment.ball_skills_level ?? null,
      assessment.total_score,
      assessment.total_percent,
      assessment.total_level ?? null,
      assessment.level,
      assessment.level_code ?? null,
      JSON.stringify(assessment.domain_results ?? []),
      JSON.stringify(assessment.domain_feedback ?? []),
      JSON.stringify(assessment.skill_results ?? []),
      JSON.stringify(assessment.norm_summary ?? {}),
      JSON.stringify(assessment.iep_targets ?? []),
      JSON.stringify(assessment.flags ?? []),
      assessment.overall_rule ? JSON.stringify(assessment.overall_rule) : null,
      assessment.start_time,
      assessment.end_time || null,
    ])

    return this.getLastInsertId()
  }

  saveAssessmentDetails(assessId: number, details: Tgmd3AssessmentDetailInput[]): void {
    details.forEach((detail) => {
      this.execute(`
        INSERT INTO tgmd_3_assess_detail (
          assess_id, question_id, item_code, dimension,
          score, max_score, raw_value, criteria_snapshot, answer_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assessId,
        detail.question_id,
        detail.item_code,
        detail.dimension,
        detail.score,
        detail.max_score,
        detail.raw_value,
        JSON.stringify(detail.criteria_snapshot ?? []),
        detail.answer_time || 0,
      ])
    })
  }

  getAssessment(assessId: number): any | null {
    const record = this.queryOne(`
      SELECT
        a.id,
        a.student_id,
        a.age_months,
        a.gender,
        a.locomotor_score,
        a.locomotor_percent,
        a.locomotor_level,
        a.ball_skills_score,
        a.ball_skills_percent,
        a.ball_skills_level,
        a.total_score,
        a.total_percent,
        a.total_level,
        a.level,
        a.level_code,
        a.domain_results,
        a.domain_feedback,
        a.skill_results,
        a.norm_summary,
        a.iep_targets,
        a.flags,
        a.overall_rule,
        a.start_time,
        a.end_time,
        a.created_at,
        s.name as student_name,
        s.gender as student_gender,
        s.birthday as student_birthday
      FROM tgmd_3_assess a
      LEFT JOIN student s ON a.student_id = s.id
      WHERE a.id = ?
    `, [assessId])

    if (!record) {
      return null
    }

    return {
      ...record,
      domain_results: parseJsonArray(record.domain_results),
      domain_feedback: parseJsonArray(record.domain_feedback),
      skill_results: parseJsonArray(record.skill_results),
      norm_summary: parseJsonObject(record.norm_summary),
      iep_targets: parseJsonArray(record.iep_targets),
      flags: parseJsonArray(record.flags),
      overall_rule: parseJsonObject(record.overall_rule),
    }
  }

  getAssessmentDetails(assessId: number): any[] {
    const details = this.query(`
      SELECT
        question_id,
        item_code,
        dimension,
        score,
        max_score,
        raw_value,
        criteria_snapshot,
        answer_time,
        created_at
      FROM tgmd_3_assess_detail
      WHERE assess_id = ?
      ORDER BY question_id
    `, [assessId])

    return details.map((detail: any) => {
      const question = TGMD3_QUESTION_MAP.get(Number(detail.question_id))

      return {
        ...detail,
        title: question?.name || '',
        equipment: question?.equipment || '',
        guidance: question?.guidance || '',
        criteria_snapshot: parseJsonArray(detail.criteria_snapshot),
        dimension_name: question?.dimensionName || detail.dimension,
      }
    })
  }

  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT
        id,
        student_id,
        age_months,
        gender,
        locomotor_score,
        locomotor_level,
        ball_skills_score,
        ball_skills_level,
        total_score,
        total_percent,
        total_level,
        level,
        level_code,
        start_time,
        end_time,
        created_at
      FROM tgmd_3_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

// CSIRS评估相关操作
export class CSIRSAPI extends DatabaseAPI {
  /**
   * 获取单个CSIRS评估记录
   */
  getAssessment(assessId: number): any | null {
    return this.queryOne(`
      SELECT
        a.id,
        a.student_id,
        a.total_score,
        a.vestibular_score,
        a.tactile_score,
        a.proprioception_score,
        a.learning_score,
        a.executive_score,
        a.level,
        a.start_time,
        a.end_time,
        a.created_at,
        s.name as student_name
      FROM csirs_assess a
      LEFT JOIN student s ON a.student_id = s.id
      WHERE a.id = ?
    `, [assessId]);
  }

  /**
   * 获取学生的所有CSIRS评估记录
   */
  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT
        a.id,
        a.student_id,
        a.age_months,
        a.raw_scores,
        a.t_scores,
        a.total_t_score,
        a.level,
        a.start_time,
        a.end_time,
        a.created_at,
        s.name as student_name
      FROM csirs_assess a
      JOIN student s ON a.student_id = s.id
      WHERE a.student_id = ?
      ORDER BY a.created_at DESC
    `, [studentId]);
  }

  /**
   * 获取CSIRS评估详情
   */
  getAssessmentDetails(assessId: number): any[] {
    console.log('查询CSIRS评估详情，assessId:', assessId)

    // 首先尝试JOIN查询
    const details = this.query(`
      SELECT
        d.question_id,
        d.score,
        q.title,
        q.dimension,
        q.sub_dimension
      FROM csirs_assess_detail d
      JOIN csirs_question q ON d.question_id = q.id
      WHERE d.assess_id = ?
      ORDER BY q.id
    `, [assessId]);

    console.log('CSIRS JOIN查询结果:', details)

    // 如果JOIN查询没有结果，尝试直接查询评估详情表
    if (!details || details.length === 0) {
      console.log('CSIRS JOIN查询失败，尝试直接查询评估详情')
      const directDetails = this.query(`
        SELECT
          question_id,
          score
        FROM csirs_assess_detail
        WHERE assess_id = ?
        ORDER BY question_id
      `, [assessId]);

      console.log('CSIRS直接查询结果:', directDetails)
      return directDetails
    }

    return details
  }

  /**
   * 创建CSIRS评估记录
   */
  createAssessment(assessment: {
    student_id: number
    total_score: number
    vestibular_score: number
    tactile_score: number
    proprioception_score: number
    learning_score: number
    executive_score: number
    level: string
    start_time: string
    end_time: string
  }): number {
    this.execute(`
      INSERT INTO csirs_assess (
        student_id, total_score, vestibular_score, tactile_score,
        proprioception_score, learning_score, executive_score,
        level, start_time, end_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.total_score,
      assessment.vestibular_score,
      assessment.tactile_score,
      assessment.proprioception_score,
      assessment.learning_score,
      assessment.executive_score,
      assessment.level,
      assessment.start_time,
      assessment.end_time
    ]);

    return this.getLastInsertId();
  }

  /**
   * 保存CSIRS评估详情
   */
  saveAssessmentDetails(details: Array<{
    assess_id: number
    question_id: number
    score: number
  }>): void {
    details.forEach(detail => {
      this.execute(`
        INSERT INTO csirs_assess_detail (assess_id, question_id, score)
        VALUES (?, ?, ?)
      `, [detail.assess_id, detail.question_id, detail.score]);
    });
  }

  /**
   * 创建 CSIRS 评估记录（V2 - 使用 JSON 字段，匹配实际 Schema）
   *
   * 实际 csirs_assess 表使用 age_months, raw_scores(JSON), t_scores(JSON), total_t_score
   * 而非旧的 per-column 维度分数
   */
  createAssessmentWithJsonScores(assessment: {
    student_id: number
    age_months: number
    raw_scores: string   // JSON string: { "vestibular": 40, "tactile": 30, ... }
    t_scores: string     // JSON string: { "vestibular": 50, "tactile": 45, ... }
    total_t_score: number
    level: string
    start_time: string
    end_time: string
  }): number {
    this.execute(`
      INSERT INTO csirs_assess (
        student_id, age_months, raw_scores, t_scores, total_t_score, level, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.age_months,
      assessment.raw_scores,
      assessment.t_scores,
      assessment.total_t_score,
      assessment.level,
      assessment.start_time,
      assessment.end_time
    ]);

    return this.getLastInsertId();
  }

  /**
   * 保存 CSIRS 评估详情（含维度信息）
   */
  saveAssessmentDetailsWithDimension(details: Array<{
    assess_id: number
    question_id: number
    dimension: string
    score: number
    answer_time: number
  }>): void {
    for (const detail of details) {
      this.execute(`
        INSERT INTO csirs_assess_detail (assess_id, question_id, dimension, score, answer_time)
        VALUES (?, ?, ?, ?, ?)
      `, [detail.assess_id, detail.question_id, detail.dimension, detail.score, detail.answer_time]);
    }
  }
}

// CBCL 数据库 API
export class CBCLAssessmentAPI extends DatabaseAPI {
  /**
   * 创建CBCL评估记录
   */
  createAssessment(data: {
    student_id: number
    age_months: number
    gender: 'male' | 'female'
    social_competence_data: string  // JSON string
    social_activity_score?: number
    social_social_score?: number
    social_school_score?: number
    raw_answers: string  // JSON string
    behavior_raw_scores: string  // JSON string
    factor_t_scores: string  // JSON string
    total_problems_score: number
    total_problems_t_score?: number
    internalizing_t_score?: number
    externalizing_t_score?: number
    summary_level: 'normal' | 'borderline' | 'clinical'
    start_time: string
    end_time?: string
  }): number {
    this.execute(`
      INSERT INTO cbcl_assess (
        student_id, age_months, gender,
        social_competence_data, social_activity_score, social_social_score, social_school_score,
        raw_answers, behavior_raw_scores, factor_t_scores,
        total_problems_score, total_problems_t_score, internalizing_t_score, externalizing_t_score,
        summary_level, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.age_months,
      data.gender,
      data.social_competence_data,
      data.social_activity_score || null,
      data.social_social_score || null,
      data.social_school_score || null,
      data.raw_answers,
      data.behavior_raw_scores,
      data.factor_t_scores,
      data.total_problems_score,
      data.total_problems_t_score || null,
      data.internalizing_t_score || null,
      data.externalizing_t_score || null,
      data.summary_level,
      data.start_time,
      data.end_time || null
    ])

    return this.getLastInsertId()
  }

  /**
   * 获取评估记录（解析JSON字段）
   */
  getAssessment(id: number): {
    id: number
    student_id: number
    age_months: number
    gender: 'male' | 'female'
    social_competence_data: any
    social_activity_score: number | null
    social_social_score: number | null
    social_school_score: number | null
    raw_answers: Record<string, number>
    behavior_raw_scores: Record<string, number>
    factor_t_scores: Record<string, number>
    total_problems_score: number
    total_problems_t_score: number | null
    internalizing_t_score: number | null
    externalizing_t_score: number | null
    summary_level: 'normal' | 'borderline' | 'clinical'
    start_time: string
    end_time: string | null
    created_at: string
  } | null {
    const row = this.queryOne(`
      SELECT * FROM cbcl_assess WHERE id = ?
    `, [id])

    if (!row) return null

    // Parse JSON fields
    return {
      ...row,
      social_competence_data: JSON.parse(row.social_competence_data || '{}'),
      raw_answers: JSON.parse(row.raw_answers || '{}'),
      behavior_raw_scores: JSON.parse(row.behavior_raw_scores || '{}'),
      factor_t_scores: JSON.parse(row.factor_t_scores || '{}')
    }
  }

  /**
   * 获取学生的所有CBCL评估记录（不解析JSON，用于列表展示）
   */
  getStudentAssessments(studentId: number): any[] {
    return this.query(`
      SELECT
        c.id,
        c.student_id,
        c.age_months,
        c.gender,
        c.total_problems_score,
        c.total_problems_t_score,
        c.internalizing_t_score,
        c.externalizing_t_score,
        c.summary_level,
        c.start_time,
        c.end_time,
        c.created_at,
        s.name as student_name
      FROM cbcl_assess c
      LEFT JOIN student s ON c.student_id = s.id
      WHERE c.student_id = ?
      ORDER BY c.created_at DESC
    `, [studentId])
  }

  /**
   * 获取最新的评估记录
   */
  getLatestAssessment(studentId: number): ReturnType<typeof this.getAssessment> {
    const row = this.queryOne(`
      SELECT * FROM cbcl_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [studentId])

    if (!row) return null

    // Parse JSON fields
    return {
      ...row,
      social_competence_data: JSON.parse(row.social_competence_data || '{}'),
      raw_answers: JSON.parse(row.raw_answers || '{}'),
      behavior_raw_scores: JSON.parse(row.behavior_raw_scores || '{}'),
      factor_t_scores: JSON.parse(row.factor_t_scores || '{}')
    }
  }

  /**
   * 更新评估记录
   */
  updateAssessment(id: number, data: Partial<{
    social_competence_data: string
    social_activity_score: number
    social_social_score: number
    social_school_score: number
    raw_answers: string
    behavior_raw_scores: string
    factor_t_scores: string
    total_problems_score: number
    total_problems_t_score: number
    internalizing_t_score: number
    externalizing_t_score: number
    summary_level: 'normal' | 'borderline' | 'clinical'
    end_time: string
  }>): boolean {
    const updates: string[] = []
    const params: any[] = []

    if (data.social_competence_data !== undefined) {
      updates.push('social_competence_data = ?')
      params.push(data.social_competence_data)
    }
    if (data.social_activity_score !== undefined) {
      updates.push('social_activity_score = ?')
      params.push(data.social_activity_score)
    }
    if (data.social_social_score !== undefined) {
      updates.push('social_social_score = ?')
      params.push(data.social_social_score)
    }
    if (data.social_school_score !== undefined) {
      updates.push('social_school_score = ?')
      params.push(data.social_school_score)
    }
    if (data.raw_answers !== undefined) {
      updates.push('raw_answers = ?')
      params.push(data.raw_answers)
    }
    if (data.behavior_raw_scores !== undefined) {
      updates.push('behavior_raw_scores = ?')
      params.push(data.behavior_raw_scores)
    }
    if (data.factor_t_scores !== undefined) {
      updates.push('factor_t_scores = ?')
      params.push(data.factor_t_scores)
    }
    if (data.total_problems_score !== undefined) {
      updates.push('total_problems_score = ?')
      params.push(data.total_problems_score)
    }
    if (data.total_problems_t_score !== undefined) {
      updates.push('total_problems_t_score = ?')
      params.push(data.total_problems_t_score)
    }
    if (data.internalizing_t_score !== undefined) {
      updates.push('internalizing_t_score = ?')
      params.push(data.internalizing_t_score)
    }
    if (data.externalizing_t_score !== undefined) {
      updates.push('externalizing_t_score = ?')
      params.push(data.externalizing_t_score)
    }
    if (data.summary_level !== undefined) {
      updates.push('summary_level = ?')
      params.push(data.summary_level)
    }
    if (data.end_time !== undefined) {
      updates.push('end_time = ?')
      params.push(data.end_time)
    }

    if (updates.length === 0) {
      return false
    }

    params.push(id)
    const rowsAffected = this.execute(`
      UPDATE cbcl_assess SET ${updates.join(', ')} WHERE id = ?
    `, params)

    return rowsAffected > 0
  }

  /**
   * 删除评估记录
   */
  deleteAssessment(id: number): boolean {
    const rowsAffected = this.execute('DELETE FROM cbcl_assess WHERE id = ?', [id])
    return rowsAffected > 0
  }

  /**
   * 迁移旧版社会能力数据到新版格式
   * 用于向后兼容：将旧版只有计数字段的数据转换为包含文本输入的新格式
   * @param oldData 旧版社会能力数据
   * @returns 新版格式的社会能力数据
   */
  migrateSocialCompetenceData(oldData: any): any {
    // 如果已经是新版格式（包含sports等文本字段），直接返回
    if (oldData.sports && oldData.hobbies && oldData.organizations && oldData.labor) {
      return oldData
    }

    // 旧版数据只有计数字段，需要添加默认的文本结构
    const defaultTextItem = { a: '', b: '', c: '', none: false }

    return {
      // 添加新版字段默认值
      reporter: oldData.reporter || 'mother',
      other_relation: oldData.other_relation || '',
      father_occupation: oldData.father_occupation || '',
      mother_occupation: oldData.mother_occupation || '',

      // 根据旧版计数填充文本字段（无法还原原始文本，留空）
      sports: {
        ...defaultTextItem,
        none: oldData.I_count === 0
      },
      hobbies: {
        ...defaultTextItem,
        none: oldData.II_count === 0
      },
      organizations: {
        ...defaultTextItem,
        none: oldData.III_count === 0
      },
      labor: {
        ...defaultTextItem,
        none: oldData.IV_count === 0
      },

      // 保留所有旧版字段
      ...oldData,

      // 添加新版条件字段默认值
      VII_notInSchool: oldData.VII_notInSchool || false,
      VII_specialType: oldData.VII_specialType || '',
      VII_retainedGrade: oldData.VII_retainedGrade || '',
      VII_retainedReason: oldData.VII_retainedReason || '',
      VII_problemContent: oldData.VII_problemContent || '',
      VII_problemStart: oldData.VII_problemStart || '',
      VII_isSolved: oldData.VII_isSolved || false,
      VII_solvedWhen: oldData.VII_solvedWhen || ''
    }
  }
}

// Conners PSQ 数据库 API
export class ConnersPSQAPI extends DatabaseAPI {
  /**
   * 创建评估记录
   */
  createAssessment(data: {
    student_id: number
    gender: string
    age_months: number
    raw_scores: string
    dimension_scores: string
    t_scores: string
    pi_score: number
    ni_score: number
    is_valid: number
    invalid_reason?: string
    hyperactivity_index: number
    level: string
    start_time: string
    end_time: string
  }): number {
    this.execute(`
      INSERT INTO conners_psq_assess (
        student_id, gender, age_months, raw_scores, dimension_scores, t_scores,
        pi_score, ni_score, is_valid, invalid_reason, hyperactivity_index, level,
        start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.gender,
      data.age_months,
      data.raw_scores,
      data.dimension_scores,
      data.t_scores,
      data.pi_score,
      data.ni_score,
      data.is_valid,
      data.invalid_reason || null,
      data.hyperactivity_index,
      data.level,
      data.start_time,
      data.end_time
    ]);

    return this.getLastInsertId();
  }

  /**
   * 获取评估记录
   */
  getAssessment(id: number) {
    const result = this.query(`
      SELECT * FROM conners_psq_assess WHERE id = ?
    `, [id])
    return result[0] || null
  }

  /**
   * 获取学生的所有评估记录
   */
  getStudentAssessments(studentId: number) {
    return this.query(`
      SELECT * FROM conners_psq_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

// Conners TRS 数据库 API
export class ConnersTRSAPI extends DatabaseAPI {
  /**
   * 创建评估记录
   */
  createAssessment(data: {
    student_id: number
    gender: string
    age_months: number
    raw_scores: string
    dimension_scores: string
    t_scores: string
    pi_score: number
    ni_score: number
    is_valid: number
    invalid_reason?: string
    hyperactivity_index: number
    level: string
    start_time: string
    end_time: string
  }): number {
    this.execute(`
      INSERT INTO conners_trs_assess (
        student_id, gender, age_months, raw_scores, dimension_scores, t_scores,
        pi_score, ni_score, is_valid, invalid_reason, hyperactivity_index, level,
        start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.gender,
      data.age_months,
      data.raw_scores,
      data.dimension_scores,
      data.t_scores,
      data.pi_score,
      data.ni_score,
      data.is_valid,
      data.invalid_reason || null,
      data.hyperactivity_index,
      data.level,
      data.start_time,
      data.end_time
    ]);

    return this.getLastInsertId();
  }

  /**
   * 获取评估记录
   */
  getAssessment(id: number) {
    const result = this.query(`
      SELECT * FROM conners_trs_assess WHERE id = ?
    `, [id])
    return result[0] || null
  }

  /**
   * 获取学生的所有评估记录
   */
  getStudentAssessments(studentId: number) {
    return this.query(`
      SELECT * FROM conners_trs_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

// SDQ 数据库 API
export class SDQAssessmentAPI extends DatabaseAPI {
  /**
   * 创建 SDQ 评估记录
   */
  createAssessment(data: {
    student_id: number
    age_months: number
    raw_scores: string           // JSON string
    dimension_scores: string     // JSON string
    total_difficulties_score: number
    prosocial_score: number
    is_valid: number
    level: string
    start_time: string
    end_time: string
  }): number {
    this.execute(`
      INSERT INTO sdq_assess (
        student_id, age_months, raw_scores, dimension_scores,
        total_difficulties_score, prosocial_score, is_valid, level, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.age_months,
      data.raw_scores,
      data.dimension_scores,
      data.total_difficulties_score,
      data.prosocial_score,
      data.is_valid,
      data.level,
      data.start_time,
      data.end_time
    ])

    return this.getLastInsertId()
  }

  /**
   * 获取学生的所有 SDQ 评估记录
   */
  getStudentAssessments(studentId: number) {
    return this.query(`
      SELECT * FROM sdq_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

// SRS-2 数据库 API
export class SRS2AssessmentAPI extends DatabaseAPI {
  /**
   * 创建 SRS-2 评估记录
   */
  createAssessment(data: {
    student_id: number
    age_months: number
    gender: 'male' | 'female'
    raw_answers: string          // JSON string
    dimension_scores: string     // JSON string
    total_raw_score: number
    total_t_score: number
    total_level: string
    start_time: string
    end_time: string
  }): number {
    this.execute(`
      INSERT INTO srs2_assess (
        student_id, age_months, gender, raw_answers, dimension_scores,
        total_raw_score, total_t_score, total_level, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.age_months,
      data.gender,
      data.raw_answers,
      data.dimension_scores,
      data.total_raw_score,
      data.total_t_score,
      data.total_level,
      data.start_time,
      data.end_time
    ])

    return this.getLastInsertId()
  }

  /**
   * 获取学生的所有 SRS-2 评估记录
   */
  getStudentAssessments(studentId: number) {
    return this.query(`
      SELECT * FROM srs2_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

// 资源相关操作
export class ResourceAPI extends DatabaseAPI {
  // 获取所有资源
  getAllResources(): any[] {
    return this.query(`
      SELECT r.*,
             CASE
               WHEN f.id IS NOT NULL THEN 1
               ELSE 0
             END as is_favorite
      FROM resource_meta r
      LEFT JOIN teacher_fav f ON r.id = f.resource_id
      ORDER BY r.updated_at DESC
    `);
  }

  // 获取资源详情
  getResourceById(id: number): any | null {
    return this.queryOne(`
      SELECT r.*,
             CASE
               WHEN f.id IS NOT NULL THEN 1
               ELSE 0
             END as is_favorite
      FROM resource_meta r
      LEFT JOIN teacher_fav f ON r.id = f.resource_id
      WHERE r.id = ?
    `, [id]);
  }

  // 按分类获取资源
  getResourcesByCategory(categoryId: number): any[] {
    return this.query(`
      SELECT r.*,
             CASE
               WHEN f.id IS NOT NULL THEN 1
               ELSE 0
             END as is_favorite
      FROM resource_meta r
      LEFT JOIN teacher_fav f ON r.id = f.resource_id
      WHERE r.category = ?
      ORDER BY r.updated_at DESC
    `, [categoryId]);
  }

  // 搜索资源
  searchResources(keyword: string): any[] {
    return this.query(`
      SELECT r.*,
             CASE
               WHEN f.id IS NOT NULL THEN 1
               ELSE 0
             END as is_favorite
      FROM resource_meta r
      LEFT JOIN teacher_fav f ON r.id = f.resource_id
      WHERE r.title LIKE ? OR r.tags LIKE ? OR r.description LIKE ?
      ORDER BY r.updated_at DESC
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
  }

  // 添加资源
  addResource(resource: {
    title: string;
    type: string;
    category: number;
    path: string;
    size_kb?: number;
    tags?: string;
    description?: string;
  }): number {
    try {
      this.execute(`
        INSERT INTO resource_meta (title, type, category, path, size_kb, tags, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        resource.title,
        resource.type,
        resource.category,
        resource.path,
        resource.size_kb || null,
        resource.tags || null,
        resource.description || null
      ]);
      // 直接获取最后插入的ID，不依赖changes()
      const lastId = this.getLastInsertId();
      console.log('资源添加成功，ID:', lastId, '标题:', resource.title);
      return lastId > 0 ? lastId : -1;
    } catch (error) {
      console.error('添加资源失败:', resource.title, error);
      return -1;
    }
  }

  // 更新资源
  updateResource(id: number, updates: Partial<{
    title: string;
    type: string;
    category: number;
    path: string;
    size_kb: number;
    tags: string;
    description: string;
  }>): boolean {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.path !== undefined) {
      fields.push('path = ?');
      values.push(updates.path);
    }
    if (updates.size_kb !== undefined) {
      fields.push('size_kb = ?');
      values.push(updates.size_kb);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updates.tags);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return this.execute(
      `UPDATE resource_meta SET ${fields.join(', ')} WHERE id = ?`,
      values
    ) > 0;
  }

  // 删除资源
  deleteResource(id: number): boolean {
    // 先删除收藏记录
    this.execute('DELETE FROM teacher_fav WHERE resource_id = ?', [id]);
    // 再删除资源
    return this.execute('DELETE FROM resource_meta WHERE id = ?', [id]) > 0;
  }

  // 收藏/取消收藏资源
  toggleFavorite(teacherId: number, resourceId: number): boolean {
    // 检查是否已收藏
    const existing = this.queryOne(
      'SELECT id FROM teacher_fav WHERE teacher_id = ? AND resource_id = ?',
      [teacherId, resourceId]
    );

    if (existing) {
      // 取消收藏
      this.execute('DELETE FROM teacher_fav WHERE teacher_id = ? AND resource_id = ?', [teacherId, resourceId]);
      return false;
    } else {
      // 添加收藏
      this.execute('INSERT INTO teacher_fav (teacher_id, resource_id) VALUES (?, ?)', [teacherId, resourceId]);
      return true;
    }
  }

  // 获取收藏的资源
  getFavoriteResources(teacherId: number): any[] {
    return this.query(`
      SELECT r.*, 1 as is_favorite
      FROM resource_meta r
      INNER JOIN teacher_fav f ON r.id = f.resource_id
      WHERE f.teacher_id = ?
      ORDER BY f.created_at DESC
    `, [teacherId]);
  }
}

// BRIEF 执行功能评估相关操作（DRAFT：自编题目 + 本地常模）
export class BRIEFAssessmentAPI extends DatabaseAPI {
  createAssessment(data: {
    student_id: number
    age_months: number
    gender: string
    version: string
    raw_answers: string
    dimension_scores: string
    total_raw_score: number
    total_t_score: number
    level: string
    level_code: string | null
    extra_data: string | null
    start_time: string
    end_time: string
  }): number {
    this.execute(
      `INSERT INTO brief_assess
        (student_id, age_months, gender, version, raw_answers, dimension_scores,
         total_raw_score, total_t_score, level, level_code, extra_data, start_time, end_time)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.student_id,
        data.age_months,
        data.gender,
        data.version,
        data.raw_answers,
        data.dimension_scores,
        data.total_raw_score,
        data.total_t_score,
        data.level,
        data.level_code,
        data.extra_data,
        data.start_time,
        data.end_time
      ]
    )
    return this.getLastInsertId()
  }

  getAssessment(id: number): any | null {
    return this.queryOne('SELECT * FROM brief_assess WHERE id = ?', [id])
  }

  getStudentAssessments(studentId: number): any[] {
    return this.query(
      'SELECT * FROM brief_assess WHERE student_id = ? ORDER BY created_at DESC',
      [studentId]
    )
  }
}

// 瑞文 CRT 图形推理评估相关操作（DRAFT：自编占位矩阵 + 占位常模）
export class CRTAssessmentAPI extends DatabaseAPI {
  createAssessment(data: {
    student_id: number
    age_months: number
    gender: string
    raw_answers: string
    total_raw_score: number
    total_questions: number
    percentile_rank: number
    iq_estimate: number
    level: string
    level_code: string | null
    unit_scores: string
    extra_data: string | null
    start_time: string
    end_time: string
  }): number {
    this.execute(
      `INSERT INTO crt_assess
        (student_id, age_months, gender, raw_answers, total_raw_score, total_questions,
         percentile_rank, iq_estimate, level, level_code, unit_scores, extra_data, start_time, end_time)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.student_id,
        data.age_months,
        data.gender,
        data.raw_answers,
        data.total_raw_score,
        data.total_questions,
        data.percentile_rank,
        data.iq_estimate,
        data.level,
        data.level_code,
        data.unit_scores,
        data.extra_data,
        data.start_time,
        data.end_time
      ]
    )
    return this.getLastInsertId()
  }

  getAssessment(id: number): any | null {
    return this.queryOne('SELECT * FROM crt_assess WHERE id = ?', [id])
  }

  getStudentAssessments(studentId: number): any[] {
    return this.query(
      'SELECT * FROM crt_assess WHERE student_id = ? ORDER BY created_at DESC',
      [studentId]
    )
  }
}

// 综合认知自测（视空间·图形匹配）绩效题评估相关操作（DRAFT：自编匹配题 + 占位常模）
export class CognitiveSelfAssessmentAPI extends DatabaseAPI {
  createAssessment(data: {
    student_id: number
    age_months: number
    gender: string
    raw_answers: string
    total_raw_score: number
    total_questions: number
    /** v4：占位常模废弃，落 null */
    percentile_rank: number | null
    iq_estimate: number | null
    level: string
    level_code: string | null
    unit_scores: string
    accuracy_rate: number
    avg_response_time: number
    extra_data: string | null
    start_time: string
    end_time: string
  }): number {
    this.execute(
      `INSERT INTO cognitive_self_assess
        (student_id, age_months, gender, raw_answers, total_raw_score, total_questions,
         percentile_rank, iq_estimate, level, level_code, unit_scores,
         accuracy_rate, avg_response_time, extra_data, start_time, end_time)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.student_id,
        data.age_months,
        data.gender,
        data.raw_answers,
        data.total_raw_score,
        data.total_questions,
        data.percentile_rank,
        data.iq_estimate,
        data.level,
        data.level_code,
        data.unit_scores,
        data.accuracy_rate,
        data.avg_response_time,
        data.extra_data,
        data.start_time,
        data.end_time
      ]
    )
    return this.getLastInsertId()
  }

  getAssessment(id: number): any | null {
    return this.queryOne('SELECT * FROM cognitive_self_assess WHERE id = ?', [id])
  }

  getStudentAssessments(studentId: number): any[] {
    return this.query(
      'SELECT * FROM cognitive_self_assess WHERE student_id = ? ORDER BY created_at DESC',
      [studentId]
    )
  }
}

// 报告记录相关操作
export class ReportAPI extends DatabaseAPI {
  private resolveModuleCode(reportType: string, moduleCode?: string): string | null {
    if (moduleCode) return moduleCode

    if (reportType === 'emotional') {
      return 'emotional'
    }

    if (reportType === 'fine_motor' || reportType === 'cnbsr2016' || reportType === 'gmfm_88' || reportType === 'tgmd_3') {
      return 'sensory'
    }

    if (reportType === 'brief') {
      return 'cognitive'
    }

    if (reportType === 'crt') {
      return 'cognitive'
    }

    if (reportType === 'cognitive_self') {
      return 'cognitive'
    }

    return null
  }

  /**
   * 保存报告记录
   */
  saveReportRecord(record: {
    student_id: number
    report_type: 'sm' | 'weefim' | 'training' | 'csirs' | 'conners-psq' | 'conners-trs' | 'iep' | 'sdq' | 'srs2' | 'cbcl' | 'emotional' | 'fine_motor' | 'cnbsr2016' | 'gmfm_88' | 'tgmd_3' | 'brief' | 'crt' | 'cognitive_self'
    assess_id?: number
    plan_id?: number
    training_record_id?: number
    module_code?: string
    title: string
  }): number {
    // 获取学生当前班级信息作为快照
    const student = this.queryOne(
      'SELECT current_class_id, current_class_name FROM student WHERE id = ?',
      [record.student_id]
    )
    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null

    const sql = `
      INSERT INTO report_record (
        student_id, report_type, assess_id, plan_id, training_record_id,
        title, class_id, class_name, module_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    this.execute(sql, [
      record.student_id,
      record.report_type,
      record.assess_id || null,
      record.plan_id || null,
      record.training_record_id || null,
      record.title,
      classId,
      className,
      this.resolveModuleCode(record.report_type, record.module_code)
    ])
    return this.getLastInsertId()
  }

  /**
   * 获取报告列表
   */
  getReportList(filters?: {
    student_id?: number
    report_type?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): any[] {
    const scope = getCurrentTeacherStudentScope('s')
    let sql = `
      SELECT
        r.*,
        s.name as student_name,
        s.gender as student_gender,
        s.birthday as student_birthday
      FROM report_record r
      LEFT JOIN student s ON r.student_id = s.id
      WHERE 1=1${scope.sql}
    `
    const params: any[] = [...scope.params]

    if (filters?.student_id) {
      sql += ' AND r.student_id = ?'
      params.push(filters.student_id)
    }

    if (filters?.report_type) {
      sql += ' AND r.report_type = ?'
      params.push(filters.report_type)
    }

    if (filters?.start_date) {
      sql += ' AND r.created_at >= ?'
      params.push(filters.start_date)
    }

    if (filters?.end_date) {
      sql += ' AND r.created_at <= ?'
      params.push(filters.end_date)
    }

    sql += ' ORDER BY r.created_at DESC'

    if (filters?.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }

    if (filters?.offset) {
      sql += ' OFFSET ?'
      params.push(filters.offset)
    }

    return this.query(sql, params)
  }

  /**
   * 获取报告详情
   */
  getReportRecord(id: number): any | null {
    return this.queryOne(`
      SELECT
        r.*,
        s.name as student_name,
        s.gender as student_gender,
        s.birthday as student_birthday
      FROM report_record r
      LEFT JOIN student s ON r.student_id = s.id
      WHERE r.id = ?
    `, [id])
  }

  /**
   * 按 assess_id 查询报告记录（推荐引擎：训练计划 source_assessment_id → 评估报告回链）。
   * 返回最近一条（同次评估可能有多类型记录）。
   */
  getReportRecordByAssessId(assessId: number): any | null {
    return this.queryOne(`
      SELECT * FROM report_record
      WHERE assess_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [assessId])
  }

  /**
   * 删除报告记录
   */
  deleteReportRecord(id: number): void {
    this.execute('DELETE FROM report_record WHERE id = ?', [id])
  }

  /**
   * 获取报告统计
   */
  getReportStatistics(studentId?: number): {
    total: number
    sm_count: number
    weefim_count: number
    csirs_count: number
    conners_psq_count: number
    conners_trs_count: number
    sdq_count: number
    srs2_count: number
    cbcl_count: number
    fine_motor_count: number
    cnbsr2016_count: number
    gmfm_88_count: number
    tgmd_3_count: number
    emotional_count: number
    iep_count: number
    training_count: number
  } {
    let sql = 'SELECT report_type, COUNT(*) as count FROM report_record r'
    const scope = getCurrentTeacherStudentScope('s')
    sql += ` LEFT JOIN student s ON r.student_id = s.id WHERE 1=1${scope.sql}`
    const params: any[] = [...scope.params]

    if (studentId) {
      sql += ' AND r.student_id = ?'
      params.push(studentId)
    }

    sql += ' GROUP BY report_type'

    const rows = this.query(sql, params)

    const stats = {
      total: 0,
      sm_count: 0,
      weefim_count: 0,
      csirs_count: 0,
      conners_psq_count: 0,
      conners_trs_count: 0,
      sdq_count: 0,
      srs2_count: 0,
      cbcl_count: 0,
      fine_motor_count: 0,
      cnbsr2016_count: 0,
      gmfm_88_count: 0,
      tgmd_3_count: 0,
      emotional_count: 0,
      iep_count: 0,
      training_count: 0
    }

    rows.forEach((row: any) => {
      stats.total += row.count
      if (row.report_type === 'sm') stats.sm_count = row.count
      if (row.report_type === 'weefim') stats.weefim_count = row.count
      if (row.report_type === 'csirs') stats.csirs_count = row.count
      if (row.report_type === 'conners-psq') stats.conners_psq_count = row.count
      if (row.report_type === 'conners-trs') stats.conners_trs_count = row.count
      if (row.report_type === 'sdq') stats.sdq_count = row.count
      if (row.report_type === 'srs2') stats.srs2_count = row.count
      if (row.report_type === 'cbcl') stats.cbcl_count = row.count
      if (row.report_type === 'fine_motor') stats.fine_motor_count = row.count
      if (row.report_type === 'cnbsr2016') stats.cnbsr2016_count = row.count
      if (row.report_type === 'gmfm_88') stats.gmfm_88_count = row.count
      if (row.report_type === 'tgmd_3') stats.tgmd_3_count = row.count
      if (row.report_type === 'emotional') stats.emotional_count = row.count
      if (row.report_type === 'iep') stats.iep_count = row.count
      if (row.report_type === 'training') stats.training_count = row.count
    })

    return stats
  }

}

export class EmotionalTrainingRecordAPI extends DatabaseAPI {
  persistSession(input: PersistEmotionalSessionInput): PersistEmotionalSessionResult {
    if (!Number.isFinite(input.studentId) || input.studentId <= 0) {
      throw new Error('表达关心训练缺少有效 student_id，无法写入正式记录。')
    }

    if (!Number.isFinite(input.resourceId) || input.resourceId <= 0) {
      throw new Error('表达关心训练缺少有效 resource_id，无法写入正式记录。')
    }

    const student = this.queryOne(
      'SELECT name, current_class_id, current_class_name FROM student WHERE id = ?',
      [input.studentId],
    )
    if (!student) {
      throw new Error(`未找到学生 ${input.studentId}，无法写入表达关心训练记录。`)
    }

    const resource = this.queryOne(
      'SELECT name FROM sys_training_resource WHERE id = ?',
      [input.resourceId],
    )
    if (!resource) {
      throw new Error(`未找到资源 ${input.resourceId}，无法写入表达关心训练记录。`)
    }

    const classId = student.current_class_id || null
    const className = student.current_class_name || null
    const studentName = student.name || `学生${input.studentId}`
    const taskNameSnapshot = resource.name || input.summary.sessionType || input.subModule
    const durationMs = Math.max(0, Math.round(input.endedAt - input.startedAt))
    const accuracyRate = input.summary.questionCount > 0
      ? clampRate(input.summary.correctCount / input.summary.questionCount)
      : 0
    const avgResponseTime = input.details.length > 0
      ? Math.round(input.details.reduce((sum, item) => sum + (item.response_time_ms || 0), 0) / input.details.length)
      : 0

    const summaryRawData: EmotionalTrainingSummaryRawData = {
      ...input.summary,
      sessionType: input.summary.sessionType || input.subModule,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      subModule: input.subModule,
    }

    const entryCode = resolveTrainingEntryCode(undefined, 'emotional')
    const rawDb = getTransactionalDb(this.db)

    rawDb.run('BEGIN TRANSACTION')

    try {
      this.execute(`
        INSERT INTO training_records (
          student_id, task_id, resource_id, resource_type, session_type,
          entry_code, timestamp, duration, accuracy_rate, avg_response_time, raw_data,
          class_id, class_name, module_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        input.studentId,
        null,
        input.resourceId,
        input.resourceType,
        input.subModule,
        entryCode,
        input.startedAt,
        durationMs,
        accuracyRate,
        avgResponseTime,
        JSON.stringify(summaryRawData),
        classId,
        className,
        'emotional',
      ])

      const trainingRecordId = this.getLastInsertId()

      new TrainingSessionWriter(this.db).upsertSession({
        studentId: input.studentId,
        moduleCode: 'emotional',
        entryCode,
        sessionFamily: input.subModule,
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        taskNameSnapshot,
        classId,
        className,
        startedAt: toEmotionalIsoTimestamp(input.startedAt),
        endedAt: toEmotionalIsoTimestamp(input.endedAt),
        durationMs,
        completionStatus: input.completionStatus,
        accuracyRate,
        avgResponseTimeMs: avgResponseTime,
        summaryPayload: summaryRawData,
        sourceTable: 'training_records',
        sourceRecordId: trainingRecordId,
      })

      this.execute(`
        INSERT INTO emotional_training_session (
          training_record_id, student_id, module_code, sub_module,
          resource_id, resource_type, start_time, end_time, duration_ms,
          question_count, correct_count, accuracy_rate, hint_count, retry_count,
          completion_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        trainingRecordId,
        input.studentId,
        'emotional',
        input.subModule,
        input.resourceId,
        input.resourceType,
        toEmotionalIsoTimestamp(input.startedAt),
        toEmotionalIsoTimestamp(input.endedAt),
        durationMs,
        input.summary.questionCount,
        input.summary.correctCount,
        accuracyRate,
        input.summary.hintCount,
        input.summary.retryCount,
        input.completionStatus,
      ])

      const sessionId = this.getLastInsertId()
      const detailIds: number[] = []

      for (const detail of input.details) {
        this.execute(`
          INSERT INTO emotional_training_detail (
            session_id, student_id, resource_id, step_type, step_index,
            prompt_id, selected_value, selected_label, is_correct, is_acceptable,
            hint_level, retry_count, response_time_ms, feedback_code, perspective
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sessionId,
          detail.student_id,
          detail.resource_id,
          detail.step_type,
          detail.step_index,
          detail.prompt_id || null,
          detail.selected_value || null,
          detail.selected_label || null,
          detail.is_correct,
          detail.is_acceptable,
          detail.hint_level,
          detail.retry_count,
          detail.response_time_ms || null,
          detail.feedback_code || null,
          detail.perspective,
        ])

        detailIds.push(this.getLastInsertId())
      }

      if (input.completionStatus === 'completed') {
        const reportTitle = `${studentName} - 情绪行为调节训练报告`
        const existingReport = this.queryOne(
          `SELECT id
           FROM report_record
           WHERE student_id = ? AND report_type = 'emotional'`,
          [input.studentId],
        )

        if (existingReport?.id) {
          this.execute(`
            UPDATE report_record
            SET training_record_id = ?, title = ?, class_id = ?, class_name = ?,
                module_code = 'emotional', created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [trainingRecordId, reportTitle, classId, className, existingReport.id])
        } else {
          this.execute(`
            INSERT INTO report_record (
              student_id, report_type, training_record_id, title,
              class_id, class_name, module_code, created_at, updated_at
            ) VALUES (?, 'emotional', ?, ?, ?, ?, 'emotional', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [input.studentId, trainingRecordId, reportTitle, classId, className])
        }
      }

      rawDb.run('COMMIT')
      return {
        trainingRecordId,
        sessionId,
        detailIds,
      }
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }

      console.error(`[EmotionalTrainingRecordAPI] 写入表达关心训练记录失败（student=${studentName}）:`, error)
      throw error
    }
  }

  getSessionByTrainingRecordId(trainingRecordId: number): any | null {
    return this.queryOne(`
      SELECT *
      FROM emotional_training_session
      WHERE training_record_id = ?
    `, [trainingRecordId])
  }

  getSessionDetails(sessionId: number): any[] {
    return this.query(`
      SELECT *
      FROM emotional_training_detail
      WHERE session_id = ?
      ORDER BY step_index ASC, id ASC
    `, [sessionId])
  }
}

// 感官训练记录相关操作
export class GameTrainingAPI extends DatabaseAPI {
  /**
   * 保存训练记录
   */
  saveTrainingRecord(data: {
    student_id: number
    task_id?: number | null
    resource_id?: number | null
    resource_type?: string | null
    session_type?: string | null
    entry_code?: string | null
    timestamp: number
    duration: number
    accuracy_rate: number
    avg_response_time: number
    raw_data: any // GameSessionData 对象
    module_code?: string // 模块代码，默认为 sensory
  }): number {
    // 获取学生当前班级信息作为快照
    const student = this.queryOne(
      'SELECT current_class_id, current_class_name FROM student WHERE id = ?',
      [data.student_id]
    )
    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null
    const moduleCode = data.module_code || 'sensory' // 默认为感官统合模块
    let entryCode = data.entry_code || null
    const resourceRow = data.resource_id
      ? this.queryOne(
          'SELECT name, module_code, resource_type, category, meta_data FROM sys_training_resource WHERE id = ?',
          [data.resource_id]
        )
      : null
    const taskRow = data.task_id
      ? this.queryOne('SELECT id, name FROM task WHERE id = ?', [data.task_id])
      : null

    if (!entryCode && resourceRow) {
      entryCode = resolveTrainingEntryCodeFromResource(
        buildTrainingEntryResource(resourceRow, {
          moduleCode,
          resourceType: data.resource_type || data.session_type || 'game',
        })
      )
    }

    if (!entryCode) {
      entryCode = resolveTrainingEntryCode(data.session_type || data.resource_type, moduleCode)
    }

    const resolvedEntryCode = entryCode || resolveTrainingEntryCode(data.session_type || data.resource_type, moduleCode)
    const rawDataJson = JSON.stringify(data.raw_data)
    const durationMs = normalizeDurationMsFromSeconds(data.duration)
    const startedAt = toIsoStringFromTimestamp(data.timestamp)
    const resourceType = data.resource_type ?? data.session_type ?? 'game'
    const persistedTaskId = taskRow?.id ? Number(taskRow.id) : null
    const taskNameSnapshot = taskRow?.name || resourceRow?.name || null
    const rawDb = getTransactionalDb(this.db)

    rawDb.run('BEGIN TRANSACTION')

    try {
      this.execute(`
        INSERT INTO training_records (
        student_id, task_id, resource_id, resource_type, session_type,
        entry_code, timestamp, duration, accuracy_rate, avg_response_time, raw_data,
        class_id, class_name, module_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.student_id,
        data.task_id ?? null,
        data.resource_id ?? null,
        data.resource_type ?? null,
        data.session_type ?? null,
        resolvedEntryCode,
        data.timestamp,
        data.duration,
        data.accuracy_rate,
        data.avg_response_time,
        rawDataJson,
        classId,
        className,
        moduleCode
      ])

      const recordId = this.getLastInsertId()

      new TrainingSessionWriter(this.db).upsertSession({
        studentId: data.student_id,
        moduleCode,
        entryCode: resolvedEntryCode,
        sessionFamily: 'game',
        resourceId: data.resource_id ?? null,
        resourceType,
        taskId: persistedTaskId,
        taskNameSnapshot,
        classId,
        className,
        startedAt,
        endedAt: deriveEndedAt(startedAt, durationMs),
        durationMs,
        completionStatus: 'completed',
        accuracyRate: data.accuracy_rate,
        avgResponseTimeMs: data.avg_response_time,
        summaryPayload: buildGameTrainingSummaryPayload(data.raw_data),
        sourceTable: 'training_records',
        sourceRecordId: recordId,
      })

      rawDb.run('COMMIT')
      return recordId
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  /**
   * 获取学生的所有训练记录
   */
  getStudentTrainingRecords(studentId: number, taskId?: number, moduleCode?: string, entryCode?: string): any[] {
    let sql = `
      SELECT
        tr.id,
        tr.student_id,
        tr.task_id,
        tr.resource_id,
        tr.resource_type,
        tr.session_type,
        tr.entry_code,
        tr.timestamp,
        tr.duration,
        tr.accuracy_rate,
        tr.avg_response_time,
        tr.raw_data,
        tr.class_id,
        tr.class_name,
        tr.module_code,
        tr.created_at,
        r.name as task_name
      FROM training_records tr
      LEFT JOIN sys_training_resource r ON tr.resource_id = r.id
      WHERE tr.student_id = ?
        AND tr.entry_code IS NOT NULL
        AND TRIM(tr.entry_code) != ''
    `
    const params: any[] = [studentId]

    if (taskId !== undefined) {
      sql += ' AND tr.task_id = ?'
      params.push(taskId)
    }

    if (moduleCode) {
      sql += ' AND tr.module_code = ?'
      params.push(moduleCode)
    }

    if (entryCode) {
      sql += ' AND tr.entry_code = ?'
      params.push(entryCode)
    }

    sql += ' ORDER BY tr.timestamp DESC'

    const records = this.query(sql, params)

    // 解析 raw_data JSON，并映射字段名（下划线命名 -> 驼峰命名）
    return records.map((record: any) => {
      const rawData = JSON.parse(record.raw_data)
      return {
        ...record,
        // 映射前端期望的字段名
        taskId: record.task_id,
        resourceId: record.resource_id,
        resourceType: record.resource_type,
        sessionType: record.session_type,
        entryCode: record.entry_code,
        accuracy: record.accuracy_rate,
        avgResponseTime: record.avg_response_time,
        moduleCode: record.module_code,
        raw_data: rawData
      }
    })
  }

  /**
   * 获取训练记录详情
   */
  getTrainingRecord(id: number): any | null {
    const record = this.queryOne(`
      SELECT
        id,
        student_id,
        task_id,
        resource_id,
        resource_type,
        session_type,
        entry_code,
        timestamp,
        duration,
        accuracy_rate,
        avg_response_time,
        raw_data,
        created_at
      FROM training_records
      WHERE id = ?
    `, [id])

    if (!record) return null

    // 解析 raw_data JSON，并映射字段名（下划线命名 -> 驼峰命名）
    const rawData = JSON.parse(record.raw_data)
    return {
      ...record,
      // 映射前端期望的字段名
      taskId: record.task_id,
      resourceId: record.resource_id,
      resourceType: record.resource_type,
      sessionType: record.session_type,
      entryCode: record.entry_code,
      accuracy: record.accuracy_rate,
      avgResponseTime: record.avg_response_time,
      raw_data: rawData
    }
  }


  /**
   * 删除训练记录
   */
  deleteTrainingRecord(id: number): boolean {
    const rowsAffected = this.execute('DELETE FROM training_records WHERE id = ?', [id])
    return rowsAffected > 0
  }

  /**
   * 获取最近的训练记录
   */
  getRecentTrainingRecords(limit: number = 10): any[] {
    const scope = getCurrentTeacherStudentScope('s')
    const records = this.query(`
      SELECT
        tr.id,
        tr.student_id,
        tr.task_id,
        tr.timestamp,
        tr.duration,
        tr.accuracy_rate,
        tr.avg_response_time,
        s.name as student_name,
        tr.created_at
      FROM training_records tr
      LEFT JOIN student s ON tr.student_id = s.id
      WHERE 1=1${scope.sql}
      ORDER BY tr.timestamp DESC
      LIMIT ?
    `, [...scope.params, limit])

    return records
  }

  /**
   * 统计指定模块的游戏训练记录数
   * @param moduleCode 模块代码
   * @param studentId 学生ID（可选，不传则统计所有）
   */
  countRecordsByModule(moduleCode: string, studentId?: number): number {
    let sql = 'SELECT COUNT(*) as count FROM training_records WHERE module_code = ?'
    const params: any[] = [moduleCode]

    if (studentId) {
      sql += ' AND student_id = ?'
      params.push(studentId)
    }

    const result = this.queryOne(sql, params)
    return result?.count || 0
  }

  countRecordsByEntry(entryCode: string, studentId?: number): number {
    let sql = 'SELECT COUNT(*) as count FROM training_records WHERE entry_code = ?'
    const params: any[] = [entryCode]

    if (studentId) {
      sql += ' AND student_id = ?'
      params.push(studentId)
    }

    const result = this.queryOne(sql, params)
    return result?.count || 0
  }
}

export class TrainingSessionAPI extends DatabaseAPI {
  private mapRecord(row: any): TrainingSessionRecord {
    return {
      ...row,
      summary_payload: parseJsonObject(row.summary_payload),
    }
  }

  listSessions(options: {
    studentId?: number
    moduleCode?: string
    entryCode?: string
    sessionFamily?: string
    completionStatus?: string
    sourceTable?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  } = {}): TrainingSessionRecord[] {
    const scope = getCurrentTeacherStudentScope('s')
    let sql = `
      SELECT
        ts.*,
        s.name AS student_name,
        r.name AS resource_name
      FROM training_session ts
      LEFT JOIN student s ON ts.student_id = s.id
      LEFT JOIN sys_training_resource r ON ts.resource_id = r.id
      WHERE 1 = 1${scope.sql}
    `
    const params: any[] = [...scope.params]

    if (options.studentId !== undefined) {
      sql += ' AND ts.student_id = ?'
      params.push(options.studentId)
    }

    if (options.moduleCode) {
      sql += ' AND ts.module_code = ?'
      params.push(options.moduleCode)
    }

    if (options.entryCode) {
      sql += ' AND ts.entry_code = ?'
      params.push(options.entryCode)
    }

    if (options.sessionFamily) {
      sql += ' AND ts.session_family = ?'
      params.push(options.sessionFamily)
    }

    if (options.completionStatus) {
      sql += ' AND ts.completion_status = ?'
      params.push(options.completionStatus)
    }

    if (options.sourceTable) {
      sql += ' AND ts.source_table = ?'
      params.push(options.sourceTable)
    }

    if (options.startDate) {
      sql += ' AND ts.started_at >= ?'
      params.push(options.startDate)
    }

    if (options.endDate) {
      sql += ' AND ts.started_at <= ?'
      params.push(options.endDate)
    }

    sql += ' ORDER BY ts.started_at DESC, ts.id DESC'

    if (options.limit !== undefined) {
      sql += ' LIMIT ?'
      params.push(options.limit)

      if (options.offset !== undefined) {
        sql += ' OFFSET ?'
        params.push(options.offset)
      }
    }

    return this.query(sql, params).map((row: any) => this.mapRecord(row))
  }

  getSessionById(id: number): TrainingSessionRecord | null {
    const row = this.queryOne(`
      SELECT
        ts.*,
        s.name AS student_name,
        r.name AS resource_name
      FROM training_session ts
      LEFT JOIN student s ON ts.student_id = s.id
      LEFT JOIN sys_training_resource r ON ts.resource_id = r.id
      WHERE ts.id = ?
    `, [id])

    return row ? this.mapRecord(row) : null
  }

  countSessions(options: {
    studentId?: number
    moduleCode?: string
    entryCode?: string
    sessionFamily?: string
    completionStatus?: string
    sourceTable?: string
  } = {}): number {
    let sql = 'SELECT COUNT(*) as count FROM training_session ts WHERE 1 = 1'
    const params: any[] = []

    if (options.studentId !== undefined) {
      sql += ' AND ts.student_id = ?'
      params.push(options.studentId)
    }

    if (options.moduleCode) {
      sql += ' AND ts.module_code = ?'
      params.push(options.moduleCode)
    }

    if (options.entryCode) {
      sql += ' AND ts.entry_code = ?'
      params.push(options.entryCode)
    }

    if (options.sessionFamily) {
      sql += ' AND ts.session_family = ?'
      params.push(options.sessionFamily)
    }

    if (options.completionStatus) {
      sql += ' AND ts.completion_status = ?'
      params.push(options.completionStatus)
    }

    if (options.sourceTable) {
      sql += ' AND ts.source_table = ?'
      params.push(options.sourceTable)
    }

    const result = this.queryOne(sql, params)
    return Number(result?.count || 0)
  }
}

/**
 * 器材目录 API
 *
 * ✅ Phase 2.0 重构完成：已完全移除对 equipment_catalog 旧表的依赖
 */
export class EquipmentAPI extends DatabaseAPI {
  /**
   * 统一的器材查询接口（完全基于 sys_training_resource 表）
   *
   * @param options 查询选项
   * @param options.keyword - 搜索关键词（匹配名称、描述、标签）
   * @param options.category - 器材分类（tactile, visual, auditory 等）
   * @returns 器材列表
   */
  getEquipment(options?: { keyword?: string; category?: string }): any[] {
    // 构建 SELECT 子句（直接从 sys_training_resource 获取 category）
    const selectFields = `
      tr.id,
      tr.name,
      tr.category,
      tr.description,
      tr.cover_image as image_url,
      tr.is_active,
      tr.legacy_id,
      tr.created_at,
      GROUP_CONCAT(t.name, ',') as ability_tags
    `

    // 构建 FROM 和 JOIN 子句（无旧表依赖）
    let sql = `
      FROM sys_training_resource tr
      LEFT JOIN sys_resource_tag_map rtm ON tr.id = rtm.resource_id
      LEFT JOIN sys_tags t ON rtm.tag_id = t.id AND t.domain = 'ability'
      WHERE tr.resource_type = 'equipment'
        AND tr.module_code = 'sensory'
        AND tr.is_active = 1
    `

    const params: any[] = []

    // 添加分类筛选
    if (options?.category && options.category !== 'all') {
      sql += ` AND tr.category = ?`
      params.push(options.category)
    }

    // 添加关键词搜索
    if (options?.keyword) {
      sql += ` AND (
        tr.name LIKE ?
        OR tr.description LIKE ?
        OR tr.category LIKE ?
        OR EXISTS (
          SELECT 1 FROM sys_resource_tag_map rtm2
          INNER JOIN sys_tags t2 ON rtm2.tag_id = t2.id
          WHERE rtm2.resource_id = tr.id
            AND t2.domain = 'ability'
            AND t2.name LIKE ?
        )
      )`
      const pattern = `%${options.keyword}%`
      params.push(pattern, pattern, pattern, pattern)
    }

    // 组装完整查询
    const fullSql = `SELECT ${selectFields} ${sql} GROUP BY tr.id ORDER BY tr.category, tr.id`

    console.log('[EquipmentAPI.getEquipment] SQL:', fullSql)
    console.log('[EquipmentAPI.getEquipment] Params:', params)

    const results = this.query(fullSql, params)

    // 解析 GROUP_CONCAT 结果为数组
    return results.map((row: any) => ({
      ...row,
      ability_tags: row.ability_tags ? row.ability_tags.split(',').filter(Boolean) : []
    }))
  }

  /**
   * @deprecated 使用 getEquipment() 替代
   * 获取所有器材（旧方法，保留以兼容）
   */
  getAllEquipment(): any[] {
    return this.getEquipment()
  }

}

/**
 * 器材训练记录 API
 */
export class EquipmentTrainingAPI extends DatabaseAPI {
  /**
   * 创建训练记录
   */
  createRecord(data: {
    student_id: number
    equipment_id: number
    entry_code?: string
    score: number
    prompt_level: number
    duration_seconds?: number
    notes?: string
    generated_comment?: string
    training_date: string
    teacher_name?: string
    environment?: string
    batch_id?: number
    module_code?: string // 模块代码，默认从器材资源获取
  }): number {
    // 获取学生当前班级信息作为快照
    const student = this.queryOne(
      'SELECT current_class_id, current_class_name FROM student WHERE id = ?',
      [data.student_id]
    )
    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null
    const equipment = this.queryOne(
      'SELECT name, module_code, resource_type, category, meta_data FROM sys_training_resource WHERE id = ?',
      [data.equipment_id]
    )

    // 获取器材对应的模块代码
    let moduleCode = data.module_code
    let entryCode = data.entry_code || null
    if (!moduleCode) {
      moduleCode = equipment?.module_code || 'sensory'

      if (!entryCode) {
        entryCode = resolveTrainingEntryCodeFromResource(
          buildTrainingEntryResource(equipment, {
            moduleCode,
            resourceType: 'equipment',
          })
        )
      }
    } else if (!entryCode) {
      entryCode = resolveTrainingEntryCode(undefined, moduleCode)
    }

    const resolvedModuleCode = moduleCode || 'sensory'
    const resolvedEntryCode = entryCode || resolveTrainingEntryCode(undefined, resolvedModuleCode)
    const startedAt = normalizeDateTimeToIso(data.training_date)
    const durationMs = normalizeDurationMsFromSeconds(data.duration_seconds)
    const rawDb = getTransactionalDb(this.db)

    rawDb.run('BEGIN TRANSACTION')

    try {
      this.execute(`
        INSERT INTO equipment_training_records (
          student_id, equipment_id, entry_code, score, prompt_level,
          duration_seconds, notes, generated_comment,
          training_date, teacher_name, environment, batch_id,
          class_id, class_name, module_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.student_id,
        data.equipment_id,
        resolvedEntryCode,
        data.score,
        data.prompt_level,
        data.duration_seconds || null,
        data.notes || null,
        data.generated_comment || null,
        data.training_date,
        data.teacher_name || null,
        data.environment || null,
        data.batch_id || null,
        classId,
        className,
        resolvedModuleCode
      ])

      const recordId = this.getLastInsertId()

      new TrainingSessionWriter(this.db).upsertSession({
        studentId: data.student_id,
        moduleCode: resolvedModuleCode,
        entryCode: resolvedEntryCode,
        sessionFamily: 'equipment',
        resourceId: data.equipment_id,
        resourceType: equipment?.resource_type || 'equipment',
        taskNameSnapshot: equipment?.name || null,
        classId,
        className,
        startedAt,
        endedAt: deriveEndedAt(startedAt, durationMs),
        durationMs,
        completionStatus: 'completed',
        summaryPayload: buildEquipmentTrainingSummaryPayload(data),
        sourceTable: 'equipment_training_records',
        sourceRecordId: recordId,
      })

      rawDb.run('COMMIT')
      return recordId
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  /**
   * 创建训练批次
   */
  createBatch(data: {
    student_id: number
    batch_name: string
    training_date: string
    notes?: string
  }): number {
    this.execute(`
      INSERT INTO equipment_training_batches (
        student_id, batch_name, training_date, notes
      ) VALUES (?, ?, ?, ?)
    `, [data.student_id, data.batch_name, data.training_date, data.notes || null])
    return this.getLastInsertId()
  }

  /**
   * 获取学生的训练记录
   */
  getStudentRecords(studentId: number, options?: {
    start_date?: string
    end_date?: string
    equipment_id?: number
    batch_id?: number
    entry_code?: string
  }): any[] {
    let sql = `
      SELECT
        etr.id,
        etr.student_id,
        tr.id as equipment_id,
        tr.name as equipment_name,
        tr.cover_image as equipment_image,
        tr.category,
        '' as sub_category,
        tr.description,
        '[]' as ability_tags,
        etr.score,
        etr.prompt_level,
        etr.duration_seconds,
        etr.notes,
        etr.generated_comment,
        etr.training_date,
        etr.teacher_name,
        etr.environment,
        etr.batch_id,
        etr.module_code,
        etr.entry_code,
        etb.batch_name,
        s.name as student_name,
        etr.created_at,
        tr.legacy_id,
        tr.meta_data as equipment_meta
      FROM equipment_training_records etr
      LEFT JOIN sys_training_resource tr ON etr.equipment_id = tr.id
      LEFT JOIN equipment_training_batches etb ON etr.batch_id = etb.id
      LEFT JOIN student s ON etr.student_id = s.id
      WHERE etr.student_id = ?
        AND etr.entry_code IS NOT NULL
        AND TRIM(etr.entry_code) != ''
    `
    const params: any[] = [studentId]

    if (options?.start_date) {
      sql += ` AND etr.training_date >= ?`
      params.push(options.start_date)
    }

    if (options?.end_date) {
      sql += ` AND etr.training_date <= ?`
      params.push(options.end_date)
    }

    if (options?.equipment_id) {
      sql += ` AND etr.equipment_id = ?`
      params.push(options.equipment_id)
    }

    if (options?.batch_id) {
      sql += ` AND etr.batch_id = ?`
      params.push(options.batch_id)
    }

    if (options?.entry_code) {
      sql += ` AND etr.entry_code = ?`
      params.push(options.entry_code)
    }

    sql += ` ORDER BY etr.training_date DESC, etr.created_at DESC`

    return this.query(sql, params)
  }

  /**
   * 获取该学生在某器材上的上次记录
   */
  getLastRecord(studentId: number, equipmentId: number): any | null {
    const records = this.query(`
      SELECT
        id,
        student_id,
        equipment_id,
        score,
        prompt_level,
        duration_seconds,
        notes,
        training_date,
        created_at
      FROM equipment_training_records
      WHERE student_id = ? AND equipment_id = ?
      ORDER BY training_date DESC, created_at DESC
      LIMIT 1
    `, [studentId, equipmentId])

    return records.length > 0 ? records[0] : null
  }


  /**
   * 获取学生的批次列表
   */
  getStudentBatches(studentId: number): any[] {
    return this.query(`
      SELECT
        etb.id,
        etb.student_id,
        etb.batch_name,
        etb.training_date,
        etb.notes,
        etb.created_at,
        COUNT(etr.id) as record_count
      FROM equipment_training_batches etb
      LEFT JOIN equipment_training_records etr ON etb.id = etr.batch_id
      WHERE etb.student_id = ?
      GROUP BY etb.id
      ORDER BY etb.training_date DESC, etb.created_at DESC
    `, [studentId])
  }

  /**
   * 更新记录
   */
  updateRecord(id: number, data: {
    score?: number
    prompt_level?: number
    duration_seconds?: number
    notes?: string
    generated_comment?: string
    teacher_name?: string
    environment?: string
  }): boolean {
    const updates: string[] = []
    const params: any[] = []

    if (data.score !== undefined) {
      updates.push('score = ?')
      params.push(data.score)
    }
    if (data.prompt_level !== undefined) {
      updates.push('prompt_level = ?')
      params.push(data.prompt_level)
    }
    if (data.duration_seconds !== undefined) {
      updates.push('duration_seconds = ?')
      params.push(data.duration_seconds)
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      params.push(data.notes)
    }
    if (data.generated_comment !== undefined) {
      updates.push('generated_comment = ?')
      params.push(data.generated_comment)
    }
    if (data.teacher_name !== undefined) {
      updates.push('teacher_name = ?')
      params.push(data.teacher_name)
    }
    if (data.environment !== undefined) {
      updates.push('environment = ?')
      params.push(data.environment)
    }

    if (updates.length === 0) {
      return false
    }

    params.push(id)
    const rowsAffected = this.execute(`
      UPDATE equipment_training_records
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params)

    return rowsAffected > 0
  }

  /**
   * 删除记录
   */
  deleteRecord(id: number): boolean {
    const rowsAffected = this.execute('DELETE FROM equipment_training_records WHERE id = ?', [id])
    return rowsAffected > 0
  }

  /**
   * 删除批次及其所有记录
   */
  deleteBatch(batchId: number): boolean {
    // 先删除批次的所有记录
    this.execute('DELETE FROM equipment_training_records WHERE batch_id = ?', [batchId])
    // 再删除批次
    const rowsAffected = this.execute('DELETE FROM equipment_training_batches WHERE id = ?', [batchId])
    return rowsAffected > 0
  }

  /**
   * 获取训练统计
   */
  getTrainingStats(studentId: number, options?: {
    start_date?: string
    end_date?: string
  }): any {
    let sql = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(DISTINCT equipment_id) as equipment_count,
        AVG(score) as avg_score,
        SUM(duration_seconds) as total_duration
      FROM equipment_training_records
      WHERE student_id = ?
    `
    const params: any[] = [studentId]

    if (options?.start_date) {
      sql += ` AND training_date >= ?`
      params.push(options.start_date)
    }

    if (options?.end_date) {
      sql += ` AND training_date <= ?`
      params.push(options.end_date)
    }

    const result = this.query(sql, params)
    return result[0] || { total_sessions: 0, equipment_count: 0, avg_score: 0, total_duration: 0 }
  }

  /**
   * 按分类获取训练统计
   *
   * ✅ Phase 2.0 重构：使用 sys_training_resource 替代 equipment_catalog
   */
  getCategoryStats(studentId: number): any[] {
    return this.query(`
      SELECT
        tr.category,
        COUNT(*) as session_count,
        AVG(etr.score) as avg_score,
        SUM(etr.duration_seconds) as total_duration
      FROM equipment_training_records etr
      JOIN sys_training_resource tr ON etr.equipment_id = tr.id
      WHERE etr.student_id = ?
        AND tr.resource_type = 'equipment'
      GROUP BY tr.category
      ORDER BY session_count DESC
    `, [studentId])
  }

  /**
   * 按模块统计器材训练记录数量
   * @param moduleCode 模块代码
   * @param studentId 学生ID（可选，不传则统计所有）
   */
  countRecordsByModule(moduleCode: string, studentId?: number): number {
    let sql = 'SELECT COUNT(*) as count FROM equipment_training_records WHERE module_code = ?'
    const params: any[] = [moduleCode]

    if (studentId) {
      sql += ' AND student_id = ?'
      params.push(studentId)
    }

    const result = this.queryOne(sql, params)
    return result?.count || 0
  }

  countRecordsByEntry(entryCode: string, studentId?: number): number {
    let sql = 'SELECT COUNT(*) as count FROM equipment_training_records WHERE entry_code = ?'
    const params: any[] = [entryCode]

    if (studentId) {
      sql += ' AND student_id = ?'
      params.push(studentId)
    }

    const result = this.queryOne(sql, params)
    return result?.count || 0
  }
}

export default {
  UserAPI,
  StudentAPI,
  SMAssessmentAPI,
  WeeFIMAPI,
  CSIRSAPI,
  CBCLAssessmentAPI,
  GameTrainingAPI,
  TrainingSessionAPI,
  ResourceAPI,
  ReportAPI,
  EquipmentAPI,
  EquipmentTrainingAPI
}
