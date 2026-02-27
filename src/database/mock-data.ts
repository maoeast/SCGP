// 模拟数据存储
const mockData = {
  user: [
    {
      id: 1,
      username: 'admin',
      password_hash:
        'eyJlbmNyeXB0ZWQiOiJVM0ZwYkdWaU9tOXlieTlqY21sa1pTSTZJblI1YXkxdmNHVnlZWFJ2Y2lJc0ltTjFjM1J2YldWeVgybGtJam9pUTFWVFZFOU5SVkpmTVRJek5EVTJJaXdpYVhOemRXVmtYMlJoZEdVaU9pSXlNREkwTFRFd0xURXdWREV3T2pBd09qQXdXaUlzSW1WNGNHbHllVjlrWVhSbElqb2lNakF5TlMweE1DMHhNRlF4TURvd01Eb3dNRm9pTENKd2NtOWtkV04wSWpvaWRIbHJMVzl3WlhKaGRHOXlJaXdpYldGamFHbHVaVjltYVc1blpYSndjbWx1ZENJNklqRXlNelExTmpjNE9UQXhNak0wSW4wPQ==',
      salt: 'default-salt',
      role: 'admin',
      name: '系统管理员',
      email: null,
      last_login: null,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  student: [
    {
      id: 1,
      name: '张小明',
      gender: '男',
      birthday: '2016-05-10',
      student_no: 'ST001',
      disorder: '自闭症',
      avatar_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: '李小红',
      gender: '女',
      birthday: '2017-08-22',
      student_no: 'ST002',
      disorder: '发育迟缓',
      avatar_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: '王小强',
      gender: '男',
      birthday: '2015-03-15',
      student_no: 'ST003',
      disorder: '唐氏综合症',
      avatar_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  sm_age_stage: [
    { id: 1, name: '6个月-1岁11个月', age_min: 6, age_max: 23, description: '婴儿期' },
    { id: 2, name: '2岁-3岁5个月', age_min: 24, age_max: 41, description: '幼儿期早期' },
    { id: 3, name: '3岁6个月-4岁11个月', age_min: 42, age_max: 59, description: '幼儿期晚期' },
    { id: 4, name: '5岁-6岁5个月', age_min: 60, age_max: 77, description: '学龄前期早期' },
    { id: 5, name: '6岁6个月-8岁5个月', age_min: 78, age_max: 101, description: '学龄前期晚期' },
    { id: 6, name: '8岁6个月-10岁5个月', age_min: 102, age_max: 125, description: '学龄期早期' },
    { id: 7, name: '10岁6个月以上', age_min: 126, age_max: 200, description: '学龄期晚期' },
  ],
  sm_question: [], // 将通过导入模块填充
  sm_norm: [], // 将通过导入模块填充
  sm_raw_to_sq: [], // 将通过导入模块填充
  weefim_category: [], // 将通过导入模块填充
  weefim_question: [], // 将通过导入模块填充
  task_category: [
    {
      id: 1,
      name: '饮食技能',
      parent_id: 0,
      description: '培养学生独立进食的能力，包括使用餐具、餐桌礼仪等',
      icon: 'utensils',
    },
    {
      id: 2,
      name: '穿着技能',
      parent_id: 0,
      description: '培养学生独立穿脱衣物的能力，包括认识衣物、穿脱顺序等',
      icon: 'tshirt',
    },
    {
      id: 3,
      name: '如厕技能',
      parent_id: 0,
      description: '培养学生独立如厕的能力，包括便后清洁、冲水等',
      icon: 'toilet',
    },
    {
      id: 4,
      name: '个人卫生',
      parent_id: 0,
      description: '培养学生个人卫生习惯，包括洗手、洗脸、刷牙等',
      icon: 'soap',
    },
    {
      id: 5,
      name: '居家生活',
      parent_id: 0,
      description: '培养学生居家生活能力，包括整理物品、开关门窗等',
      icon: 'home',
    },
    {
      id: 6,
      name: '社区生活',
      parent_id: 0,
      description: '培养学生社区生活能力，包括安全过马路、购物等',
      icon: 'users',
    },
  ],
  task: [],
  task_level: [],
  task_step: [],
  train_plan: [],
  train_plan_detail: [],
  train_log: [],
  resource_meta: [],
  teacher_fav: [],
  sm_assess: [],
  sm_assess_detail: [],
  weefim_assess: [],
  weefim_assess_detail: [],
  system_config: [
    { id: 1, key: 'system_name', value: '感官综合训练与评估', description: '系统名称' },
    { id: 2, key: 'system_version', value: '1.0.0', description: '系统版本' },
    { id: 3, key: 'auto_backup', value: 'true', description: '是否自动备份' },
    { id: 4, key: 'backup_interval', value: '7', description: '备份间隔（天）' },
    { id: 5, key: 'trial_days', value: '7', description: '试用天数' },
  ],
}

// 获取模拟数据
export function getMockData(tableName: string) {
  return mockData[tableName as keyof typeof mockData] || []
}

// 查找模拟数据
export function findMockData(tableName: string, field: string, value: any) {
  const tableData = getMockData(tableName)
  return tableData.find((item) => item[field] === value)
}

// 生成新的ID
export function generateNewId(tableName: string): number {
  const tableData = getMockData(tableName)
  return tableData.length > 0 ? Math.max(...tableData.map((item) => item.id || 0)) + 1 : 1
}
