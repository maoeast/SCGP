import { getDatabase } from './init';

// 数据库基础操作类
// 【Plan B】使用主线程 SQLWrapper，防抖保存已内置
export class DatabaseAPI {
  protected db: any;

  constructor() {
    this.db = getDatabase();
  }

  // 执行查询（同步 - 默认行为）
  protected query(sql: string, params: any[] = []): any[] {
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
  protected async queryAsync(sql: string, params: any[] = []): Promise<any[]> {
    try {
      return this.db.all(sql, params);
    } catch (error) {
      console.error('异步查询执行失败:', sql, params, error);
      throw error;
    }
  }

  // 执行单行查询（同步 - 默认行为）
  protected queryOne(sql: string, params: any[] = []): any | null {
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
  protected async queryOneAsync(sql: string, params: any[] = []): Promise<any | null> {
    try {
      return this.db.get(sql, params);
    } catch (error) {
      console.error('异步查询执行失败:', sql, params, error);
      throw error;
    }
  }

  // 执行更新（INSERT/UPDATE/DELETE）（同步 - 默认行为）
  protected execute(sql: string, params: any[] = []): number {
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
  protected async executeAsync(sql: string, params: any[] = []): Promise<number> {
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

    // 验证密码
    const isPasswordValid = this.verifyPassword(password, user.password_hash, user.salt);
    if (!isPasswordValid) {
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

    const isOldPasswordValid = this.verifyPassword(oldPassword, user.password_hash, user.salt);
    if (!isOldPasswordValid) {
      return false;
    }

    try {
      // 临时方案：使用简化的加密方式
      const newSalt = this.generateSalt();
      const newPasswordHash = this.hashPassword(newPassword, newSalt);

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

  // 生成盐值
  private generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // 密码哈希
  private hashPassword(password: string, salt: string): string {
    // 简化的密码哈希（生产环境应使用更安全的方法）
    return btoa(password + salt);
  }

  // 验证密码
  private verifyPassword(password: string, hash: string, salt: string): boolean {
    // 计算输入密码的哈希值并与存储的哈希值比较
    const computedHash = this.hashPassword(password, salt)
    return computedHash === hash
  }

  // 获取所有用户
  async getAllUsers(): Promise<any[]> {
    return await this.queryAsync(`
      SELECT id, username, role, name, email, last_login, is_active, created_at
      FROM user
      ORDER BY created_at DESC
    `)
  }

  // 根据ID获取用户
  async getUserById(id: number): Promise<any | null> {
    return await this.queryOneAsync(
      'SELECT id, username, role, name, email, last_login, is_active, created_at FROM user WHERE id = ?',
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

    // 生成盐值和密码哈希
    const salt = this.generateSalt()
    const passwordHash = this.hashPassword(userData.password, salt)

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

    // 生成新的盐值和密码哈希
    const salt = this.generateSalt()
    const passwordHash = this.hashPassword(newPassword, salt)

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
    const result = await this.queryAsync(`
      SELECT id, name, gender, birthday, student_no, disorder, avatar_path, created_at
      FROM student
      ORDER BY created_at DESC
    `);
    console.log('从数据库查询到的学生:', result)
    return result;
  }

  // 根据ID获取学生
  async getStudentById(id: number): Promise<any | null> {
    return await this.queryOneAsync('SELECT * FROM student WHERE id = ?', [id]);
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
    return await this.queryAsync(`
      SELECT id, name, gender, birthday, student_no, disorder, avatar_path, created_at
      FROM student
      WHERE name LIKE ? OR disorder LIKE ? OR student_no LIKE ?
      ORDER BY name
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
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

// 报告记录相关操作
export class ReportAPI extends DatabaseAPI {
  /**
   * 保存报告记录
   */
  saveReportRecord(record: {
    student_id: number
    report_type: 'sm' | 'weefim' | 'training' | 'csirs' | 'conners-psq' | 'conners-trs' | 'iep' | 'sdq'
    assess_id?: number
    plan_id?: number
    title: string
  }): number {
    // 获取学生当前班级信息作为快照
    const student = this.execute('SELECT current_class_id, current_class_name FROM student WHERE id = ?', [record.student_id])
    const classId = student?.[0]?.current_class_id || null
    const className = student?.[0]?.current_class_name || null

    const sql = `
      INSERT INTO report_record (student_id, report_type, assess_id, plan_id, title, class_id, class_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    this.execute(sql, [
      record.student_id,
      record.report_type,
      record.assess_id || null,
      record.plan_id || null,
      record.title,
      classId,
      className
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
    let sql = `
      SELECT
        r.*,
        s.name as student_name,
        s.gender as student_gender,
        s.birthday as student_birthday
      FROM report_record r
      LEFT JOIN student s ON r.student_id = s.id
      WHERE 1=1
    `
    const params: any[] = []

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
    iep_count: number
    training_count: number
  } {
    let sql = 'SELECT report_type, COUNT(*) as count FROM report_record'
    const params: any[] = []

    if (studentId) {
      sql += ' WHERE student_id = ?'
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
      if (row.report_type === 'iep') stats.iep_count = row.count
      if (row.report_type === 'training') stats.training_count = row.count
    })

    return stats
  }

  /**
   * 数据迁移：为所有已有的评估记录创建报告记录
   * 这是一次性操作，用于将历史评估数据迁移到报告记录表
   */
  migrateAssessmentRecordsToReportRecords(): {
    sm_migrated: number
    weefim_migrated: number
    csirs_migrated: number
    conners_psq_migrated: number
    conners_trs_migrated: number
    total: number
  } {
    let smMigrated = 0
    let weefimMigrated = 0
    let csirsMigrated = 0
    let connersPSQMigrated = 0
    let connersTRSMigrated = 0

    try {
      // 迁移 S-M 评估记录
      const smAssessments = this.query(`
        SELECT
          sa.id,
          sa.student_id,
          sa.created_at,
          s.name as student_name
        FROM sm_assess sa
        LEFT JOIN student s ON sa.student_id = s.id
        WHERE NOT EXISTS (
          SELECT 1 FROM report_record rr
          WHERE rr.report_type = 'sm' AND rr.assess_id = sa.id
        )
      `)

      smAssessments.forEach((assessment: any) => {
        const title = `S-M量表评估报告_${assessment.student_name}_${new Date(assessment.created_at).toLocaleDateString()}`
        this.execute(
          'INSERT INTO report_record (student_id, report_type, assess_id, title, created_at) VALUES (?, ?, ?, ?, ?)',
          [assessment.student_id, 'sm', assessment.id, title, assessment.created_at]
        )
        smMigrated++
      })

      // 迁移 WeeFIM 评估记录
      const weefimAssessments = this.query(`
        SELECT
          wa.id,
          wa.student_id,
          wa.created_at,
          s.name as student_name
        FROM weefim_assess wa
        LEFT JOIN student s ON wa.student_id = s.id
        WHERE NOT EXISTS (
          SELECT 1 FROM report_record rr
          WHERE rr.report_type = 'weefim' AND rr.assess_id = wa.id
        )
      `)

      weefimAssessments.forEach((assessment: any) => {
        const title = `WeeFIM量表评估报告_${assessment.student_name}_${new Date(assessment.created_at).toLocaleDateString()}`
        this.execute(
          'INSERT INTO report_record (student_id, report_type, assess_id, title, created_at) VALUES (?, ?, ?, ?, ?)',
          [assessment.student_id, 'weefim', assessment.id, title, assessment.created_at]
        )
        weefimMigrated++
      })

      // 迁移 CSIRS 评估记录
      const csirsAssessments = this.query(`
        SELECT
          ca.id,
          ca.student_id,
          ca.created_at,
          s.name as student_name
        FROM csirs_assess ca
        LEFT JOIN student s ON ca.student_id = s.id
        WHERE NOT EXISTS (
          SELECT 1 FROM report_record rr
          WHERE rr.report_type = 'csirs' AND rr.assess_id = ca.id
        )
      `)

      csirsAssessments.forEach((assessment: any) => {
        const title = `CSIRS感觉统合评估报告_${assessment.student_name}_${new Date(assessment.created_at).toLocaleDateString()}`
        this.execute(
          'INSERT INTO report_record (student_id, report_type, assess_id, title, created_at) VALUES (?, ?, ?, ?, ?)',
          [assessment.student_id, 'csirs', assessment.id, title, assessment.created_at]
        )
        csirsMigrated++
      })

      // 迁移 Conners PSQ 评估记录
      const connersPSQAssessments = this.query(`
        SELECT
          cpa.id,
          cpa.student_id,
          cpa.created_at,
          s.name as student_name
        FROM conners_psq_assess cpa
        LEFT JOIN student s ON cpa.student_id = s.id
        WHERE NOT EXISTS (
          SELECT 1 FROM report_record rr
          WHERE rr.report_type = 'conners-psq' AND rr.assess_id = cpa.id
        )
      `)

      connersPSQAssessments.forEach((assessment: any) => {
        const title = `Conners父母问卷报告(PSQ)_${assessment.student_name}_${new Date(assessment.created_at).toLocaleDateString()}`
        this.execute(
          'INSERT INTO report_record (student_id, report_type, assess_id, title, created_at) VALUES (?, ?, ?, ?, ?)',
          [assessment.student_id, 'conners-psq', assessment.id, title, assessment.created_at]
        )
        connersPSQMigrated++
      })

      // 迁移 Conners TRS 评估记录
      const connersTRSAssessments = this.query(`
        SELECT
          cta.id,
          cta.student_id,
          cta.created_at,
          s.name as student_name
        FROM conners_trs_assess cta
        LEFT JOIN student s ON cta.student_id = s.id
        WHERE NOT EXISTS (
          SELECT 1 FROM report_record rr
          WHERE rr.report_type = 'conners-trs' AND rr.assess_id = cta.id
        )
      `)

      connersTRSAssessments.forEach((assessment: any) => {
        const title = `Conners教师问卷报告(TRS)_${assessment.student_name}_${new Date(assessment.created_at).toLocaleDateString()}`
        this.execute(
          'INSERT INTO report_record (student_id, report_type, assess_id, title, created_at) VALUES (?, ?, ?, ?, ?)',
          [assessment.student_id, 'conners-trs', assessment.id, title, assessment.created_at]
        )
        connersTRSMigrated++
      })

      console.log(`✅ 数据迁移完成: S-M ${smMigrated} 条, WeeFIM ${weefimMigrated} 条, CSIRS ${csirsMigrated} 条, Conners PSQ ${connersPSQMigrated} 条, Conners TRS ${connersTRSMigrated} 条`)
    } catch (error) {
      console.error('❌ 数据迁移失败:', error)
    }

    return {
      sm_migrated: smMigrated,
      weefim_migrated: weefimMigrated,
      csirs_migrated: csirsMigrated,
      conners_psq_migrated: connersPSQMigrated,
      conners_trs_migrated: connersTRSMigrated,
      total: smMigrated + weefimMigrated + csirsMigrated + connersPSQMigrated + connersTRSMigrated
    }
  }
}

// 感官训练记录相关操作
export class GameTrainingAPI extends DatabaseAPI {
  /**
   * 保存训练记录
   */
  saveTrainingRecord(data: {
    student_id: number
    task_id: number
    timestamp: number
    duration: number
    accuracy_rate: number
    avg_response_time: number
    raw_data: any // GameSessionData 对象
    module_code?: string // 模块代码，默认为 sensory
  }): number {
    // 获取学生当前班级信息作为快照
    const student = this.execute('SELECT current_class_id, current_class_name FROM student WHERE id = ?', [data.student_id])
    const classId = student?.[0]?.current_class_id || null
    const className = student?.[0]?.current_class_name || null
    const moduleCode = data.module_code || 'sensory' // 默认为感官统合模块

    const rawDataJson = JSON.stringify(data.raw_data)
    this.execute(`
      INSERT INTO training_records (student_id, task_id, timestamp, duration, accuracy_rate, avg_response_time, raw_data, class_id, class_name, module_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.task_id,
      data.timestamp,
      data.duration,
      data.accuracy_rate,
      data.avg_response_time,
      rawDataJson,
      classId,
      className,
      moduleCode
    ])
    return this.getLastInsertId()
  }

  /**
   * 获取学生的所有训练记录
   */
  getStudentTrainingRecords(studentId: number, taskId?: number, moduleCode?: string): any[] {
    let sql = `
      SELECT
        tr.id,
        tr.student_id,
        tr.task_id,
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
      LEFT JOIN sys_training_resource r ON tr.task_id = r.legacy_id AND r.resource_type = 'game'
      WHERE tr.student_id = ?
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

    sql += ' ORDER BY tr.timestamp DESC'

    const records = this.query(sql, params)

    // 解析 raw_data JSON，并映射字段名（下划线命名 -> 驼峰命名）
    return records.map((record: any) => {
      const rawData = JSON.parse(record.raw_data)
      return {
        ...record,
        // 映射前端期望的字段名
        taskId: record.task_id,
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
      ORDER BY tr.timestamp DESC
      LIMIT ?
    `, [limit])

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
    const student = this.execute('SELECT current_class_id, current_class_name FROM student WHERE id = ?', [data.student_id])
    const classId = student?.[0]?.current_class_id || null
    const className = student?.[0]?.current_class_name || null

    // 获取器材对应的模块代码
    let moduleCode = data.module_code
    if (!moduleCode) {
      const equipment = this.execute('SELECT module_code FROM sys_training_resource WHERE id = ?', [data.equipment_id])
      moduleCode = equipment?.[0]?.module_code || 'sensory'
    }

    this.execute(`
      INSERT INTO equipment_training_records (
        student_id, equipment_id, score, prompt_level,
        duration_seconds, notes, generated_comment,
        training_date, teacher_name, environment, batch_id,
        class_id, class_name, module_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.equipment_id,
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
      moduleCode
    ])
    return this.getLastInsertId()
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
        etb.batch_name,
        s.name as student_name,
        etr.created_at,
        tr.legacy_id
      FROM equipment_training_records etr
      LEFT JOIN sys_training_resource tr ON etr.equipment_id = tr.id
      LEFT JOIN equipment_training_batches etb ON etr.batch_id = etb.id
      LEFT JOIN student s ON etr.student_id = s.id
      WHERE etr.student_id = ?
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
}

export default {
  UserAPI,
  StudentAPI,
  SMAssessmentAPI,
  WeeFIMAPI,
  CSIRSAPI,
  CBCLAssessmentAPI,
  GameTrainingAPI,
  ResourceAPI,
  ReportAPI,
  EquipmentAPI,
  EquipmentTrainingAPI
}