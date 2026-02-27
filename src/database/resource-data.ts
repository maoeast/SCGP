// 资源库数据 - 从系统导出
// 总数: 211 条
// 导出时间: 2025/12/31 13:39:12

// 资源分类
export const resourceCategories = [
  { id: 1, name: '文档资料', icon: 'fa-file-alt', description: 'PDF、Word等文档资料' },
  { id: 2, name: '视频教程', icon: 'fa-video', description: '教学视频和示范视频' },
  { id: 3, name: '音频资料', icon: 'fa-music', description: '音频和语音资料' },
  { id: 4, name: '压缩包', icon: 'fa-file-archive', description: 'ZIP等压缩文件' },
  { id: 5, name: '图片素材', icon: 'fa-image', description: 'JPG、PNG等图片素材' },
  { id: 6, name: '其他资源', icon: 'fa-file', description: '其他类型资源' }
]

// 示例资源数据（可选，用于初始化）
export const sampleResources = [
  {
    title: 'S-M量表评估指南',
    type: 'pdf',
    category: 1,
    path: 'docs/S-M量表评估指南.pdf',
    size_kb: 1250,
    tags: 'S-M,评估',
    description: 'S-M量表详细评估指南'
  },
  {
    title: 'WeeFIM评估手册',
    type: 'pdf',
    category: 1,
    path: 'docs/WeeFIM评估手册.pdf',
    size_kb: 890,
    tags: 'WeeFIM,功能独立性',
    description: 'WeeFIM量表的详细评估方法'
  },
  {
    title: '洗手七步法示范',
    type: 'mp4',
    category: 2,
    path: 'videos/洗手七步法示范.mp4',
    size_kb: 15240,
    tags: '洗手,卫生示范',
    description: '标准洗手七步法完整示范视频'
  },
  {
    title: '洗手步骤图集',
    type: 'zip',
    category: 4,
    path: 'images/洗手步骤图集.zip',
    size_kb: 3420,
    tags: '洗手,步骤图',
    description: '洗手各个步骤的详细图解'
  },
  {
    title: '语音提示音库',
    type: 'mp3',
    category: 3,
    path: 'audio/语音提示音库.mp3',
    size_kb: 580,
    tags: '语音提示,音频',
    description: '训练过程中使用的语音提示音合集'
  }
]

// 导入的资源数据（211条）
export const importedResources = [

  {
    id: 1,
    title: '【倒水】3 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【倒水】3 张排序图.pdf',
    size_kb: 188,
    tags: '倒水',
    description: '倒水技能步骤分解排序图示。'
  },

  {
    id: 2,
    title: '【刷牙】4 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【刷牙】4 张排序图.pdf',
    size_kb: 218,
    tags: '刷牙',
    description: '刷牙全过程步骤分解排序图。'
  },

  {
    id: 3,
    title: '【取款机】5 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【取款机】5 张排序图.pdf',
    size_kb: 243,
    tags: '取款',
    description: '使用取款机操作步骤分解图。'
  },

  {
    id: 4,
    title: '【受伤】2 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【受伤】2 张排序图.pdf',
    size_kb: 181,
    tags: '急救',
    description: '受伤处理流程视觉提示图。'
  },

  {
    id: 5,
    title: '【坐公交车】4 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【坐公交车】4 张排序图.pdf',
    size_kb: 231,
    tags: '出行',
    description: '乘坐公交车流程步骤分解图。'
  },

  {
    id: 6,
    title: '【如厕】6 步顺序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【如厕】6 步顺序图.pdf',
    size_kb: 263,
    tags: '如厕',
    description: '如厕训练六步法分解图示。'
  },

  {
    id: 7,
    title: '【字母】3 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【字母】3 张排序图.pdf',
    size_kb: 178,
    tags: '字母',
    description: '字母学习排序视觉辅助卡。'
  },

  {
    id: 8,
    title: '【就医】4 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【就医】4 张排序图.pdf',
    size_kb: 239,
    tags: '就医',
    description: '医院看病流程步骤分解图。'
  },

  {
    id: 9,
    title: '【扔垃圾】2 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【扔垃圾】2 张排序图.pdf',
    size_kb: 180,
    tags: '卫生',
    description: '扔垃圾行为步骤分解图示。'
  },

  {
    id: 10,
    title: '【数字】6 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【数字】6 张排序图.pdf',
    size_kb: 203,
    tags: '数字',
    description: '数字排序认知视觉辅助卡。'
  },

  {
    id: 11,
    title: '【洗手】6 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【洗手】6 张排序图.pdf',
    size_kb: 240,
    tags: '洗手',
    description: '标准洗手六步法分解图示。'
  },

  {
    id: 12,
    title: '【洗碗】4 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【洗碗】4 张排序图.pdf',
    size_kb: 213,
    tags: '洗碗',
    description: '洗碗家务步骤分解排序图。'
  },

  {
    id: 13,
    title: '【生病】4 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【生病】4 张排序图.pdf',
    size_kb: 223,
    tags: '生病',
    description: '生病应对流程视觉提示图。'
  },

  {
    id: 14,
    title: '【穿衣服】5步顺序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【穿衣服】5步顺序图.pdf',
    size_kb: 341,
    tags: '穿衣',
    description: '穿衣服动作五步分解图示。'
  },

  {
    id: 15,
    title: '【行李箱】3张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【行李箱】3张排序图.pdf',
    size_kb: 192,
    tags: '整理',
    description: '整理行李箱步骤分解图示。'
  },

  {
    id: 16,
    title: '【起床】4 张排序图',
    type: 'pdf',
    category: 1,
    path: 'docs/【起床】4 张排序图.pdf',
    size_kb: 218,
    tags: '起床',
    description: '起床常规流程步骤分解图。'
  },

  {
    id: 17,
    title: '喂食刷牙小游戏',
    type: 'pdf',
    category: 1,
    path: 'docs/喂食刷牙小游戏.pdf',
    size_kb: 447,
    tags: '刷牙',
    description: '通过趣味游戏进行刷牙脱敏。'
  },

  {
    id: 18,
    title: '生活自理-8个自闭症儿童的自理能力训练项目',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-8个自闭症儿童的自理能力训练项目.docx',
    size_kb: 23,
    tags: '自闭症',
    description: '八个核心自理项目训练方案。'
  },

  {
    id: 19,
    title: '生活自理-刷牙-家庭康复训练实操课',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-刷牙-家庭康复训练实操课.docx',
    size_kb: 15,
    tags: '刷牙',
    description: '家庭环境下的刷牙训练实操。'
  },

  {
    id: 20,
    title: '生活自理-十项家庭康复训练的课题（没有详细拆解内容）',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-十项家庭康复训练的课题（没有详细拆解内容）.docx',
    size_kb: 157,
    tags: '大纲',
    description: '十项家庭康复训练课题列表。'
  },

  {
    id: 21,
    title: '生活自理-吃饭（家庭康复训练实操）',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-吃饭（家庭康复训练实操）.docx',
    size_kb: 14,
    tags: '进食',
    description: '家庭进食技能训练实操指南。'
  },

  {
    id: 22,
    title: '生活自理-喝水、刷牙、其他步骤拆分',
    type: 'doc',
    category: 1,
    path: 'docs/生活自理-喝水、刷牙、其他步骤拆分.doc',
    size_kb: 46,
    tags: '任务分析',
    description: '喝水与刷牙任务步骤拆解表。'
  },

  {
    id: 23,
    title: '生活自理-喝水（家庭康复训练实操）',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-喝水（家庭康复训练实操）.docx',
    size_kb: 14,
    tags: '喝水',
    description: '家庭喝水技能训练实操指南。'
  },

  {
    id: 24,
    title: '生活自理-家庭康复训练实操教程（包含步骤拆解）',
    type: 'doc',
    category: 1,
    path: 'docs/生活自理-家庭康复训练实操教程（包含步骤拆解）.doc',
    size_kb: 145,
    tags: '教程',
    description: '含步骤拆解的家庭训练教程。'
  },

  {
    id: 25,
    title: '生活自理-技巧-需配合生活自理-六个生活自理的基础家庭训练项目使用',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-技巧-需配合生活自理-六个生活自理的基础家庭训练项目使用.docx',
    size_kb: 16,
    tags: '技巧',
    description: '基础生活自理项目配套技巧。'
  },

  {
    id: 26,
    title: '生活自理-提高孩子生活自理的十种方法（纯理论）',
    type: 'doc',
    category: 1,
    path: 'docs/生活自理-提高孩子生活自理的十种方法（纯理论）.doc',
    size_kb: 63,
    tags: '自理',
    description: '提升自理能力的十种理论方法。'
  },

  {
    id: 27,
    title: '生活自理-生活自理训练方法附教案',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-生活自理训练方法附教案.docx',
    size_kb: 25,
    tags: '教案',
    description: '生活自理训练方法与配套教案。'
  },

  {
    id: 28,
    title: '生活自理-穿（脱）衣服（家庭康复训练实操）',
    type: 'doc',
    category: 1,
    path: 'docs/生活自理-穿（脱）衣服（家庭康复训练实操）.doc',
    size_kb: 21,
    tags: '穿衣',
    description: '穿脱衣物家庭训练实操指南。'
  },

  {
    id: 29,
    title: '生活自理-纠正偏食（家庭康复训练实操）',
    type: 'doc',
    category: 1,
    path: 'docs/生活自理-纠正偏食（家庭康复训练实操）.doc',
    size_kb: 18,
    tags: '偏食',
    description: '纠正偏食行为的家庭实操。'
  },

  {
    id: 30,
    title: '生活自理-自闭症儿童家庭训练计划',
    type: 'pdf',
    category: 1,
    path: 'docs/生活自理-自闭症儿童家庭训练计划.pdf',
    size_kb: 3162,
    tags: '计划书',
    description: '自闭症儿童家庭干预详细计划。'
  },

  {
    id: 31,
    title: '生活自理-自闭症家庭生活自理评价标准',
    type: 'docx',
    category: 1,
    path: 'docs/生活自理-自闭症家庭生活自理评价标准.docx',
    size_kb: 14,
    tags: '量表',
    description: '家庭生活自理能力评价标准。'
  },

  {
    id: 32,
    title: '生活自理常用的三种训练方法.ppt',
    type: 'ppt',
    category: 1,
    path: 'docs/生活自理常用的三种训练方法.ppt',
    size_kb: 299,
    tags: '课件',
    description: '讲解三种核心自理训练方法。'
  },

  {
    id: 33,
    title: '生活自理训练-技巧',
    type: 'doc',
    category: 1,
    path: 'docs/生活自理训练-技巧.doc',
    size_kb: 18,
    tags: '技巧',
    description: '生活自理训练实用技巧汇总。'
  },

  {
    id: 34,
    title: '男孩刷牙翻翻书',
    type: 'pdf',
    category: 1,
    path: 'docs/男孩刷牙翻翻书.pdf',
    size_kb: 3728,
    tags: '刷牙',
    description: '适合男孩的刷牙教学翻翻书。'
  },

  {
    id: 35,
    title: '自闭儿生活自理能力训练法01',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法01.pdf',
    size_kb: 358,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材1。'
  },

  {
    id: 36,
    title: '自闭儿生活自理能力训练法02',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法02.pdf',
    size_kb: 326,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材2。'
  },

  {
    id: 37,
    title: '自闭儿生活自理能力训练法03',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法03.pdf',
    size_kb: 354,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材3。'
  },

  {
    id: 38,
    title: '自闭儿生活自理能力训练法04',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法04.pdf',
    size_kb: 377,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材4。'
  },

  {
    id: 39,
    title: '自闭儿生活自理能力训练法05',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法05.pdf',
    size_kb: 370,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材5。'
  },

  {
    id: 40,
    title: '自闭儿生活自理能力训练法06',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法06.pdf',
    size_kb: 423,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材6。'
  },

  {
    id: 41,
    title: '自闭儿生活自理能力训练法07',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法07.pdf',
    size_kb: 367,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材7。'
  },

  {
    id: 42,
    title: '自闭儿生活自理能力训练法08',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法08.pdf',
    size_kb: 178,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材8。'
  },

  {
    id: 43,
    title: '自闭儿生活自理能力训练法09',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法09.pdf',
    size_kb: 370,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材9。'
  },

  {
    id: 44,
    title: '自闭儿生活自理能力训练法10',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法10.pdf',
    size_kb: 371,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材10。'
  },

  {
    id: 45,
    title: '自闭儿生活自理能力训练法11',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法11.pdf',
    size_kb: 384,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材11。'
  },

  {
    id: 46,
    title: '自闭儿生活自理能力训练法12',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法12.pdf',
    size_kb: 384,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材12。'
  },

  {
    id: 47,
    title: '自闭儿生活自理能力训练法13',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法13.pdf',
    size_kb: 373,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材13。'
  },

  {
    id: 48,
    title: '自闭儿生活自理能力训练法14',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法14.pdf',
    size_kb: 363,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材14。'
  },

  {
    id: 49,
    title: '自闭儿生活自理能力训练法15',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法15.pdf',
    size_kb: 370,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材15。'
  },

  {
    id: 50,
    title: '自闭儿生活自理能力训练法16',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法16.pdf',
    size_kb: 365,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材16。'
  },

  {
    id: 51,
    title: '自闭儿生活自理能力训练法17',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法17.pdf',
    size_kb: 389,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材17。'
  },

  {
    id: 52,
    title: '自闭儿生活自理能力训练法18',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法18.pdf',
    size_kb: 354,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材18。'
  },

  {
    id: 53,
    title: '自闭儿生活自理能力训练法19',
    type: 'pdf',
    category: 1,
    path: 'docs/自闭儿生活自理能力训练法19.pdf',
    size_kb: 362,
    tags: '自闭症',
    description: '自闭症自理训练法系列教材19。'
  },

  {
    id: 54,
    title: '倒水1',
    type: 'jpg',
    category: 5,
    path: 'images/倒水/倒水1.jpg',
    size_kb: 384,
    tags: '视觉辅助',
    description: '倒水动作分解视觉提示素材。'
  },

  {
    id: 55,
    title: '倒水2',
    type: 'jpg',
    category: 5,
    path: 'images/倒水/倒水2.jpg',
    size_kb: 596,
    tags: '视觉辅助',
    description: '倒水动作分解视觉提示素材。'
  },

  {
    id: 56,
    title: '倒水3',
    type: 'jpg',
    category: 5,
    path: 'images/倒水/倒水3.jpg',
    size_kb: 582,
    tags: '视觉辅助',
    description: '倒水动作分解视觉提示素材。'
  },

  {
    id: 57,
    title: '刷牙1',
    type: 'jpg',
    category: 5,
    path: 'images/刷牙/刷牙1.jpg',
    size_kb: 774,
    tags: '视觉辅助',
    description: '刷牙动作分解视觉提示素材。'
  },

  {
    id: 58,
    title: '刷牙2',
    type: 'jpg',
    category: 5,
    path: 'images/刷牙/刷牙2.jpg',
    size_kb: 820,
    tags: '视觉辅助',
    description: '刷牙动作分解视觉提示素材。'
  },

  {
    id: 59,
    title: '刷牙3',
    type: 'jpg',
    category: 5,
    path: 'images/刷牙/刷牙3.jpg',
    size_kb: 752,
    tags: '视觉辅助',
    description: '刷牙动作分解视觉提示素材。'
  },

  {
    id: 60,
    title: '刷牙4',
    type: 'jpg',
    category: 5,
    path: 'images/刷牙/刷牙4.jpg',
    size_kb: 824,
    tags: '视觉辅助',
    description: '刷牙动作分解视觉提示素材。'
  },

  {
    id: 61,
    title: '取款机1',
    type: 'jpg',
    category: 5,
    path: 'images/取款机/取款机1.jpg',
    size_kb: 852,
    tags: '社区适应',
    description: '取款机操作视觉提示素材。'
  },

  {
    id: 62,
    title: '取款机2',
    type: 'jpg',
    category: 5,
    path: 'images/取款机/取款机2.jpg',
    size_kb: 855,
    tags: '社区适应',
    description: '取款机操作视觉提示素材。'
  },

  {
    id: 63,
    title: '取款机3',
    type: 'jpg',
    category: 5,
    path: 'images/取款机/取款机3.jpg',
    size_kb: 863,
    tags: '社区适应',
    description: '取款机操作视觉提示素材。'
  },

  {
    id: 64,
    title: '取款机4',
    type: 'jpg',
    category: 5,
    path: 'images/取款机/取款机4.jpg',
    size_kb: 855,
    tags: '社区适应',
    description: '取款机操作视觉提示素材。'
  },

  {
    id: 65,
    title: '取款机5',
    type: 'jpg',
    category: 5,
    path: 'images/取款机/取款机5.jpg',
    size_kb: 861,
    tags: '社区适应',
    description: '取款机操作视觉提示素材。'
  },

  {
    id: 66,
    title: '为什么卡-27腿破了',
    type: 'jpg',
    category: 5,
    path: 'images/受伤/为什么卡-27腿破了.jpg',
    size_kb: 1021,
    tags: '社交故事',
    description: '解释腿破受伤原因的视觉卡。'
  },

  {
    id: 67,
    title: '为什么卡-28腿破了',
    type: 'jpg',
    category: 5,
    path: 'images/受伤/为什么卡-28腿破了.jpg',
    size_kb: 942,
    tags: '社交故事',
    description: '解释腿破受伤原因的视觉卡。'
  },

  {
    id: 68,
    title: '坐车1',
    type: 'jpg',
    category: 5,
    path: 'images/坐公交车/坐车1.jpg',
    size_kb: 886,
    tags: '社区适应',
    description: '乘坐公交车视觉提示素材。'
  },

  {
    id: 69,
    title: '坐车2',
    type: 'jpg',
    category: 5,
    path: 'images/坐公交车/坐车2.jpg',
    size_kb: 1059,
    tags: '社区适应',
    description: '乘坐公交车视觉提示素材。'
  },

  {
    id: 70,
    title: '坐车3',
    type: 'jpg',
    category: 5,
    path: 'images/坐公交车/坐车3.jpg',
    size_kb: 1224,
    tags: '社区适应',
    description: '乘坐公交车视觉提示素材。'
  },

  {
    id: 71,
    title: '坐车4',
    type: 'jpg',
    category: 5,
    path: 'images/坐公交车/坐车4.jpg',
    size_kb: 853,
    tags: '社区适应',
    description: '乘坐公交车视觉提示素材。'
  },

  {
    id: 72,
    title: '字母图片1',
    type: 'png',
    category: 5,
    path: 'images/字母/图片1.png',
    size_kb: 1036,
    tags: '认知训练',
    description: '字母学习视觉辅助图片。'
  },

  {
    id: 73,
    title: '字母图片2',
    type: 'png',
    category: 5,
    path: 'images/字母/图片2.png',
    size_kb: 1620,
    tags: '认知训练',
    description: '字母学习视觉辅助图片。'
  },

  {
    id: 74,
    title: '字母图片3',
    type: 'png',
    category: 5,
    path: 'images/字母/图片3.png',
    size_kb: 33,
    tags: '认知训练',
    description: '字母学习视觉辅助图片。'
  },

  {
    id: 75,
    title: '上厕所4',
    type: 'jpg',
    category: 5,
    path: 'images/孩子如厕/上厕所4.jpg',
    size_kb: 49,
    tags: '如厕',
    description: '如厕流程分解视觉提示图。'
  },

  {
    id: 76,
    title: '上厕所3',
    type: 'jpg',
    category: 5,
    path: 'images/孩子如厕/上厕所3.jpg',
    size_kb: 54,
    tags: '如厕',
    description: '如厕流程分解视觉提示图。'
  },

  {
    id: 77,
    title: '上厕所5',
    type: 'jpg',
    category: 5,
    path: 'images/孩子如厕/上厕所5.jpg',
    size_kb: 46,
    tags: '如厕',
    description: '如厕流程分解视觉提示图。'
  },

  {
    id: 78,
    title: '上厕所1',
    type: 'jpg',
    category: 5,
    path: 'images/孩子如厕/上厕所1.jpg',
    size_kb: 42,
    tags: '如厕',
    description: '如厕流程分解视觉提示图。'
  },

  {
    id: 79,
    title: '上厕所6',
    type: 'jpg',
    category: 5,
    path: 'images/孩子如厕/上厕所6.jpg',
    size_kb: 50,
    tags: '如厕',
    description: '如厕流程分解视觉提示图。'
  },

  {
    id: 80,
    title: '上厕所2',
    type: 'jpg',
    category: 5,
    path: 'images/孩子如厕/上厕所2.jpg',
    size_kb: 42,
    tags: '如厕',
    description: '如厕流程分解视觉提示图。'
  },

  {
    id: 81,
    title: '医院看病1',
    type: 'jpg',
    category: 5,
    path: 'images/就医/医院看病1.jpg',
    size_kb: 1456,
    tags: '就医',
    description: '医院看病流程视觉提示图。'
  },

  {
    id: 82,
    title: '医院看病2',
    type: 'jpg',
    category: 5,
    path: 'images/就医/医院看病2.jpg',
    size_kb: 578,
    tags: '就医',
    description: '医院看病流程视觉提示图。'
  },

  {
    id: 83,
    title: '医院看病3',
    type: 'jpg',
    category: 5,
    path: 'images/就医/医院看病3.jpg',
    size_kb: 661,
    tags: '就医',
    description: '医院看病流程视觉提示图。'
  },

  {
    id: 84,
    title: '医院看病4',
    type: 'jpg',
    category: 5,
    path: 'images/就医/医院看病4.jpg',
    size_kb: 1421,
    tags: '就医',
    description: '医院看病流程视觉提示图。'
  },

  {
    id: 85,
    title: '为什么卡-29扔垃圾',
    type: 'jpg',
    category: 5,
    path: 'images/扔垃圾/为什么卡-29扔垃圾.jpg',
    size_kb: 758,
    tags: '规则',
    description: '解释为什么要扔垃圾的视觉卡。'
  },

  {
    id: 86,
    title: '为什么卡-30扔垃圾',
    type: 'jpg',
    category: 5,
    path: 'images/扔垃圾/为什么卡-30扔垃圾.jpg',
    size_kb: 951,
    tags: '规则',
    description: '解释为什么要扔垃圾的视觉卡。'
  },

  {
    id: 87,
    title: '阿拉伯数字图片1',
    type: 'png',
    category: 5,
    path: 'images/数字/图片1.png',
    size_kb: 284,
    tags: '认知训练',
    description: '数字认知视觉辅助图片。'
  },

  {
    id: 88,
    title: '阿拉伯数字图片2',
    type: 'png',
    category: 5,
    path: 'images/数字/图片2.png',
    size_kb: 14,
    tags: '认知训练',
    description: '数字认知视觉辅助图片。'
  },

  {
    id: 89,
    title: '阿拉伯数字图片3',
    type: 'png',
    category: 5,
    path: 'images/数字/图片3.png',
    size_kb: 322,
    tags: '认知训练',
    description: '数字认知视觉辅助图片。'
  },

  {
    id: 90,
    title: '阿拉伯数字图片4',
    type: 'png',
    category: 5,
    path: 'images/数字/图片4.png',
    size_kb: 336,
    tags: '认知训练',
    description: '数字认知视觉辅助图片。'
  },

  {
    id: 91,
    title: '阿拉伯数字图片5',
    type: 'png',
    category: 5,
    path: 'images/数字/图片5.png',
    size_kb: 306,
    tags: '认知训练',
    description: '数字认知视觉辅助图片。'
  },

  {
    id: 92,
    title: '阿拉伯数字图片6',
    type: 'png',
    category: 5,
    path: 'images/数字/图片6.png',
    size_kb: 332,
    tags: '认知训练',
    description: '数字认知视觉辅助图片。'
  },

  {
    id: 93,
    title: '洗手图片1',
    type: 'png',
    category: 5,
    path: 'images/洗手/图片1.png',
    size_kb: 137,
    tags: '洗手',
    description: '洗手步骤分解视觉提示图。'
  },

  {
    id: 94,
    title: '洗手图片2',
    type: 'png',
    category: 5,
    path: 'images/洗手/图片2.png',
    size_kb: 132,
    tags: '洗手',
    description: '洗手步骤分解视觉提示图。'
  },

  {
    id: 95,
    title: '洗手图片3',
    type: 'png',
    category: 5,
    path: 'images/洗手/图片3.png',
    size_kb: 133,
    tags: '洗手',
    description: '洗手步骤分解视觉提示图。'
  },

  {
    id: 96,
    title: '洗手图片4',
    type: 'png',
    category: 5,
    path: 'images/洗手/图片4.png',
    size_kb: 117,
    tags: '洗手',
    description: '洗手步骤分解视觉提示图。'
  },

  {
    id: 97,
    title: '洗手图片5',
    type: 'png',
    category: 5,
    path: 'images/洗手/图片5.png',
    size_kb: 118,
    tags: '洗手',
    description: '洗手步骤分解视觉提示图。'
  },

  {
    id: 98,
    title: '洗手图片6',
    type: 'png',
    category: 5,
    path: 'images/洗手/图片6.png',
    size_kb: 133,
    tags: '洗手',
    description: '洗手步骤分解视觉提示图。'
  },

  {
    id: 99,
    title: '四连顺序-洗碗1',
    type: 'jpg',
    category: 5,
    path: 'images/洗碗/四连顺序-33洗碗1.jpg',
    size_kb: 825,
    tags: '洗碗',
    description: '洗碗步骤排序视觉训练卡。'
  },

  {
    id: 100,
    title: '四连顺序-洗碗2',
    type: 'jpg',
    category: 5,
    path: 'images/洗碗/四连顺序-34洗碗2.jpg',
    size_kb: 824,
    tags: '洗碗',
    description: '洗碗步骤排序视觉训练卡。'
  },

  {
    id: 101,
    title: '四连顺序-洗碗3',
    type: 'jpg',
    category: 5,
    path: 'images/洗碗/四连顺序-35洗碗3.jpg',
    size_kb: 795,
    tags: '洗碗',
    description: '洗碗步骤排序视觉训练卡。'
  },

  {
    id: 102,
    title: '四连顺序-洗碗4',
    type: 'jpg',
    category: 5,
    path: 'images/洗碗/四连顺序-36洗碗4.jpg',
    size_kb: 836,
    tags: '洗碗',
    description: '洗碗步骤排序视觉训练卡。'
  },

  {
    id: 103,
    title: '四连顺序-生病1',
    type: 'jpg',
    category: 5,
    path: 'images/生病/四连顺序-1生病1.jpg',
    size_kb: 989,
    tags: '健康管理',
    description: '生病应对顺序视觉训练卡。'
  },

  {
    id: 104,
    title: '四连顺序-生病2',
    type: 'jpg',
    category: 5,
    path: 'images/生病/四连顺序-2生病2.jpg',
    size_kb: 1041,
    tags: '健康管理',
    description: '生病应对顺序视觉训练卡。'
  },

  {
    id: 105,
    title: '四连顺序-生病3',
    type: 'jpg',
    category: 5,
    path: 'images/生病/四连顺序-3生病3.jpg',
    size_kb: 893,
    tags: '健康管理',
    description: '生病应对顺序视觉训练卡。'
  },

  {
    id: 106,
    title: '四连顺序-生病4',
    type: 'jpg',
    category: 5,
    path: 'images/生病/四连顺序-4生病4.jpg',
    size_kb: 1020,
    tags: '健康管理',
    description: '生病应对顺序视觉训练卡。'
  },

  {
    id: 107,
    title: '穿衣服图片1',
    type: 'png',
    category: 5,
    path: 'images/穿衣服/图片1.png',
    size_kb: 37,
    tags: '穿衣',
    description: '穿衣服步骤分解视觉提示图。'
  },

  {
    id: 108,
    title: '穿衣服图片2',
    type: 'png',
    category: 5,
    path: 'images/穿衣服/图片2.png',
    size_kb: 35,
    tags: '穿衣',
    description: '穿衣服步骤分解视觉提示图。'
  },

  {
    id: 109,
    title: '穿衣服图片3',
    type: 'png',
    category: 5,
    path: 'images/穿衣服/图片3.png',
    size_kb: 38,
    tags: '穿衣',
    description: '穿衣服步骤分解视觉提示图。'
  },

  {
    id: 110,
    title: '穿衣服图片4',
    type: 'png',
    category: 5,
    path: 'images/穿衣服/图片4.png',
    size_kb: 38,
    tags: '穿衣',
    description: '穿衣服步骤分解视觉提示图。'
  },

  {
    id: 111,
    title: '穿衣服图片5',
    type: 'png',
    category: 5,
    path: 'images/穿衣服/图片5.png',
    size_kb: 40,
    tags: '穿衣',
    description: '穿衣服步骤分解视觉提示图。'
  },

  {
    id: 112,
    title: '自闭症孩子生活自理步骤分解训练图卡1',
    type: 'jpg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10001.jpg',
    size_kb: 267,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 113,
    title: '自闭症孩子生活自理步骤分解训练图卡2',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10002.jpeg',
    size_kb: 100,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 114,
    title: '自闭症孩子生活自理步骤分解训练图卡3',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10003.jpeg',
    size_kb: 103,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 115,
    title: '自闭症孩子生活自理步骤分解训练图卡4',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10004.jpeg',
    size_kb: 96,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 116,
    title: '自闭症孩子生活自理步骤分解训练图卡5',
    type: 'jpg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10005.jpg',
    size_kb: 259,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 117,
    title: '自闭症孩子生活自理步骤分解训练图卡6',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10006.jpeg',
    size_kb: 95,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 118,
    title: '自闭症孩子生活自理步骤分解训练图卡7',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10007.jpeg',
    size_kb: 97,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 119,
    title: '自闭症孩子生活自理步骤分解训练图卡8',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10008.jpeg',
    size_kb: 99,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 120,
    title: '自闭症孩子生活自理步骤分解训练图卡9',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10009.jpeg',
    size_kb: 96,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 121,
    title: '自闭症孩子生活自理步骤分解训练图卡10',
    type: 'jpeg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10010.jpeg',
    size_kb: 102,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 122,
    title: '自闭症孩子生活自理步骤分解训练图卡11',
    type: 'jpg',
    category: 5,
    path: 'images/自闭症孩子生活自理步骤分解训练图卡/10011.jpg',
    size_kb: 261,
    tags: '自闭症',
    description: '自闭症自理分解训练图卡。'
  },

  {
    id: 123,
    title: '整理旅行箱1',
    type: 'jpg',
    category: 5,
    path: 'images/行李箱/整理旅行箱1.jpg',
    size_kb: 450,
    tags: '整理',
    description: '整理行李箱视觉提示素材。'
  },

  {
    id: 124,
    title: '整理旅行箱2',
    type: 'jpg',
    category: 5,
    path: 'images/行李箱/整理旅行箱2.jpg',
    size_kb: 627,
    tags: '整理',
    description: '整理行李箱视觉提示素材。'
  },

  {
    id: 125,
    title: '整理旅行箱3',
    type: 'jpg',
    category: 5,
    path: 'images/行李箱/整理旅行箱3.jpg',
    size_kb: 680,
    tags: '整理',
    description: '整理行李箱视觉提示素材。'
  },

  {
    id: 126,
    title: '洗脸、洗手和洗脚（中）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/10洗脸、洗手和洗脚（中）.mp4',
    size_kb: 305123,
    tags: '洗漱',
    description: '洗脸洗手洗脚真人示范视频。'
  },

  {
    id: 127,
    title: '洗脸、洗手和洗脚（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/11洗脸、洗手和洗脚（下）.mp4',
    size_kb: 577279,
    tags: '洗漱',
    description: '洗脸洗手洗脚真人示范视频。'
  },

  {
    id: 128,
    title: '配合洗头、洗澡（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/12配合洗头、洗澡（上）.mp4',
    size_kb: 396420,
    tags: '洗澡',
    description: '引导孩子配合洗澡的教学。'
  },

  {
    id: 129,
    title: '配合洗头、洗澡（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/13配合洗头、洗澡（下）.mp4',
    size_kb: 376993,
    tags: '洗澡',
    description: '引导孩子配合洗澡的教学。'
  },

  {
    id: 130,
    title: '香皂的涂抹及冲洗',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/14香皂的涂抹及冲洗.mp4',
    size_kb: 499373,
    tags: '洗澡',
    description: '香皂涂抹与冲洗示范视频。'
  },

  {
    id: 131,
    title: '帮助孩子刷牙（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/15帮助孩子刷牙（上）.mp4',
    size_kb: 484848,
    tags: '刷牙',
    description: '辅助孩子刷牙的技巧演示。'
  },

  {
    id: 132,
    title: '帮助孩子刷牙（中）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/16帮助孩子刷牙（中）.mp4',
    size_kb: 427181,
    tags: '刷牙',
    description: '辅助孩子刷牙的技巧演示。'
  },

  {
    id: 133,
    title: '帮助孩子刷牙（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/17帮助孩子刷牙（下）.mp4',
    size_kb: 353931,
    tags: '刷牙',
    description: '辅助孩子刷牙的技巧演示。'
  },

  {
    id: 134,
    title: '卫生纸的使用（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/18卫生纸的使用（上）.mp4',
    size_kb: 541775,
    tags: '如厕',
    description: '卫生纸正确使用方法示范。'
  },

  {
    id: 135,
    title: '卫生纸的使用（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/19卫生纸的使用（下）.mp4',
    size_kb: 572878,
    tags: '如厕',
    description: '卫生纸正确使用方法示范。'
  },

  {
    id: 136,
    title: '生活自理能力的发展里程碑',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/1生活自理能力的发展里程碑.mp4',
    size_kb: 551644,
    tags: '理论',
    description: '儿童自理能力发展阶段讲解。'
  },

  {
    id: 137,
    title: '擦鼻涕（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/20擦鼻涕（上）.mp4',
    size_kb: 377827,
    tags: '卫生',
    description: '正确擦鼻涕动作示范视频。'
  },

  {
    id: 138,
    title: '擦鼻涕（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/21擦鼻涕（下）.mp4',
    size_kb: 426139,
    tags: '卫生',
    description: '正确擦鼻涕动作示范视频。'
  },

  {
    id: 139,
    title: '如何擦屁股',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/22如何擦屁股.mp4',
    size_kb: 796997,
    tags: '如厕',
    description: '如厕后擦拭动作教学视频。'
  },

  {
    id: 140,
    title: '如何洗屁股',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/23如何洗屁股.mp4',
    size_kb: 647286,
    tags: '如厕',
    description: '如厕后清洗动作教学视频。'
  },

  {
    id: 141,
    title: '偏食的处理（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/24偏食的处理（上）.mp4',
    size_kb: 475319,
    tags: '偏食',
    description: '改善儿童偏食行为的策略。'
  },

  {
    id: 142,
    title: '偏食的处理（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/25偏食的处理（下）.mp4',
    size_kb: 695707,
    tags: '偏食',
    description: '改善儿童偏食行为的策略。'
  },

  {
    id: 143,
    title: '以手进食（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/26以手进食（上）.mp4',
    size_kb: 651214,
    tags: '进食',
    description: '手抓进食技能训练演示。'
  },

  {
    id: 144,
    title: '以手进食（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/27以手进食（下）.mp4',
    size_kb: 505316,
    tags: '进食',
    description: '手抓进食技能训练演示。'
  },

  {
    id: 145,
    title: '如何使用勺子（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/28如何使用勺子（上）.mp4',
    size_kb: 479397,
    tags: '进食',
    description: '勺子使用技巧教学视频。'
  },

  {
    id: 146,
    title: '如何使用勺子（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/29如何使用勺子（下）.mp4',
    size_kb: 516878,
    tags: '进食',
    description: '勺子使用技巧教学视频。'
  },

  {
    id: 147,
    title: '培养自理能力的注意要点',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/2培养自理能力的注意要点.mp4',
    size_kb: 482893,
    tags: '理论',
    description: '培养自理能力的关键要点。'
  },

  {
    id: 148,
    title: '如何使用筷子（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/30如何使用筷子（上）.mp4',
    size_kb: 435528,
    tags: '进食',
    description: '筷子使用技巧教学视频。'
  },

  {
    id: 149,
    title: '如何使用筷子（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/31如何使用筷子（下）.mp4',
    size_kb: 408356,
    tags: '进食',
    description: '筷子使用技巧教学视频。'
  },

  {
    id: 150,
    title: '独立饮水（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/32独立饮水（上）.mp4',
    size_kb: 492831,
    tags: '喝水',
    description: '培养独立饮水习惯的教学。'
  },

  {
    id: 151,
    title: '独立饮水（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/33独立饮水（下）.mp4',
    size_kb: 358025,
    tags: '喝水',
    description: '培养独立饮水习惯的教学。'
  },

  {
    id: 152,
    title: '就餐礼仪（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/34就餐礼仪（上）.mp4',
    size_kb: 831607,
    tags: '社交礼仪',
    description: '基础就餐礼仪教学视频。'
  },

  {
    id: 153,
    title: '就餐礼仪（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/35就餐礼仪（下）.mp4',
    size_kb: 352261,
    tags: '社交礼仪',
    description: '基础就餐礼仪教学视频。'
  },

  {
    id: 154,
    title: '生活自理能力与触觉',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/3生活自理能力与触觉.mp4',
    size_kb: 477999,
    tags: '感统',
    description: '触觉对自理能力的影响讲解。'
  },

  {
    id: 155,
    title: '常用方法之塑造法',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/4常用方法之塑造法.mp4',
    size_kb: 423166,
    tags: '行为分析',
    description: '行为塑造法在教学中的应用。'
  },

  {
    id: 156,
    title: '常用方法之连环法',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/5常用方法之连环法.mp4',
    size_kb: 482106,
    tags: '行为分析',
    description: '行为连环法在教学中的应用。'
  },

  {
    id: 157,
    title: '毛巾的使用（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/6毛巾的使用（上）.mp4',
    size_kb: 397029,
    tags: '洗漱',
    description: '正确拧干和使用毛巾教学。'
  },

  {
    id: 158,
    title: '毛巾的使用（中）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/7毛巾的使用（中）.mp4',
    size_kb: 517894,
    tags: '洗漱',
    description: '正确拧干和使用毛巾教学。'
  },

  {
    id: 159,
    title: '毛巾的使用（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/8毛巾的使用（下）.mp4',
    size_kb: 447435,
    tags: '洗漱',
    description: '正确拧干和使用毛巾教学。'
  },

  {
    id: 160,
    title: '洗脸、洗手和洗脚（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（一）/9洗脸、洗手和洗脚（上）.mp4',
    size_kb: 361463,
    tags: '洗漱',
    description: '洗脸洗手洗脚真人示范视频。'
  },

  {
    id: 161,
    title: '拉拉链',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/10拉拉链.mp4',
    size_kb: 668091,
    tags: '穿衣',
    description: '拉链操作精细动作教学。'
  },

  {
    id: 162,
    title: '如何解、系扣子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/11如何解、系扣子.mp4',
    size_kb: 809199,
    tags: '穿衣',
    description: '系扣子精细动作教学视频。'
  },

  {
    id: 163,
    title: '整理床铺',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/12整理床铺.mp4',
    size_kb: 503026,
    tags: '家务',
    description: '整理床铺步骤示范视频。'
  },

  {
    id: 164,
    title: '擦桌子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/13擦桌子.mp4',
    size_kb: 321069,
    tags: '家务',
    description: '擦桌子动作示范视频。'
  },

  {
    id: 165,
    title: '清理地面',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/14清理地面.mp4',
    size_kb: 496387,
    tags: '家务',
    description: '扫地拖地动作示范视频。'
  },

  {
    id: 166,
    title: '物品归位',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/15物品归位.mp4',
    size_kb: 564222,
    tags: '整理',
    description: '物品分类与归位教学视频。'
  },

  {
    id: 167,
    title: '1如何脱袜子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/1如何脱袜子.mp4',
    size_kb: 499534,
    tags: '穿衣',
    description: '脱袜子动作示范视频。'
  },

  {
    id: 168,
    title: '2如何穿袜子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/2如何穿袜子.mp4',
    size_kb: 462638,
    tags: '穿衣',
    description: '穿袜子动作示范视频。'
  },

  {
    id: 169,
    title: '3如何脱鞋子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/3如何脱鞋子.mp4',
    size_kb: 373514,
    tags: '穿衣',
    description: '脱鞋子动作示范视频。'
  },

  {
    id: 170,
    title: '4如何穿鞋子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/4如何穿鞋子.mp4',
    size_kb: 378515,
    tags: '穿衣',
    description: '穿鞋子动作示范视频。'
  },

  {
    id: 171,
    title: '5如何系鞋带',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/5如何系鞋带.mp4',
    size_kb: 503543,
    tags: '穿衣',
    description: '系鞋带精细动作教学视频。'
  },

  {
    id: 172,
    title: '6如何脱衣服',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/6如何脱衣服.mp4',
    size_kb: 537445,
    tags: '穿衣',
    description: '脱衣服动作示范视频。'
  },

  {
    id: 173,
    title: '7如何穿衣服',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/7如何穿衣服.mp4',
    size_kb: 776634,
    tags: '穿衣',
    description: '穿衣服动作示范视频。'
  },

  {
    id: 174,
    title: '8如何脱裤子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/8如何脱裤子.mp4',
    size_kb: 413361,
    tags: '穿衣',
    description: '脱裤子动作示范视频。'
  },

  {
    id: 175,
    title: '9如何穿裤子',
    type: 'mp4',
    category: 2,
    path: 'videos/学龄前儿童生活自理能力训练（二）/9如何穿裤子.mp4',
    size_kb: 751327,
    tags: '穿衣',
    description: '穿裤子动作示范视频。'
  },

  {
    id: 176,
    title: '（第一课）在普通学校上学的孩子怎么定制IEP？',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/001.（第一课）在普通学校上学的孩子怎么定制IEP？.mp4',
    size_kb: 60688,
    tags: 'IEP',
    description: '普校特殊儿童IEP制定讲解。'
  },

  {
    id: 177,
    title: '（第二课）如何看待问题行为',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/002.（第二课）如何看待问题行为.mp4',
    size_kb: 109338,
    tags: '师资培训',
    description: '问题行为的功能分析与应对。'
  },

  {
    id: 178,
    title: '（第三课）如何提供辅助、如何下指令？',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/003.（第三课）如何提供辅助、如何下指令？.mp4',
    size_kb: 51160,
    tags: '教学技巧',
    description: '有效下达指令与辅助技巧。'
  },

  {
    id: 179,
    title: '（第四课）听不懂课怎么办？活动有变怎么办？',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/004.（第四课）听不懂课怎么办？活动有变怎么办？.mp4',
    size_kb: 45819,
    tags: '融合教育',
    description: '融合环境下的突发状况应对。'
  },

  {
    id: 180,
    title: '（第五课）教孩子要做什么',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/005.（第五课）教孩子要做什么.mp4',
    size_kb: 67730,
    tags: '教学技巧',
    description: '正向引导孩子行为的方法。'
  },

  {
    id: 181,
    title: '（第六课）总是逃避学习？',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/006.（第六课）总是逃避学习？.mp4',
    size_kb: 39726,
    tags: '逃避行为',
    description: '应对逃避学习行为的策略。'
  },

  {
    id: 182,
    title: '（第八课）融合环境中的强化物要怎么给？（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/008.（第八课）融合环境中的强化物要怎么给？（上）.mp4',
    size_kb: 69352,
    tags: '强化',
    description: '融合环境中强化物使用技巧。'
  },

  {
    id: 183,
    title: '（第九课）融合环境中的强化物要怎么给？（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/009.（第九课）融合环境中的强化物要怎么给？（下）.mp4',
    size_kb: 63520,
    tags: '强化',
    description: '融合环境中强化物使用技巧。'
  },

  {
    id: 184,
    title: '（第十课）出现问题行为后如何处理（上）',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/010.（第十课）出现问题行为后如何处理（上）.mp4',
    size_kb: 87637,
    tags: '问题行为',
    description: '问题行为发生后的处理策略。'
  },

  {
    id: 185,
    title: '（第十一课）出现问题行为后如何处理（下）',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/011.（第十一课）出现问题行为后如何处理（下）.mp4',
    size_kb: 79342,
    tags: '问题行为',
    description: '问题行为发生后的处理策略。'
  },

  {
    id: 186,
    title: '（第十二课）影子老师的撤出记录',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/012.（第十二课）影子老师的撤出记录.mp4',
    size_kb: 57448,
    tags: '融合教育',
    description: '影子老师辅助撤退记录方法。'
  },

  {
    id: 187,
    title: '（第十三课）自我管理',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/013.（第十三课）自我管理.mp4',
    size_kb: 63909,
    tags: '自我管理',
    description: '培养学生自我管理能力教学。'
  },

  {
    id: 188,
    title: '（第十五课） 如何引导和培养融合路上的小天使？',
    type: 'mp4',
    category: 2,
    path: 'videos/影子老师/015.（第十五课） 如何引导和培养融合路上的小天使？.mp4',
    size_kb: 28732,
    tags: '同伴支持',
    description: '培养融合环境中的同伴支持。'
  },

  {
    id: 189,
    title: '1.生活自理怎么教',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/1.生活自理怎么教.mp4',
    size_kb: 134007,
    tags: '生活自理',
    description: '生活自理教学基本原则讲解。'
  },

  {
    id: 190,
    title: '2.提高孩子生活中的服从能力',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/2.提高孩子生活中的服从能力.mp4',
    size_kb: 148104,
    tags: '服从性',
    description: '提升孩子日常配合度的技巧。'
  },

  {
    id: 191,
    title: '3.家庭中玩教具的管理',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/3.家庭中玩教具的管理.mp4',
    size_kb: 82422,
    tags: '环境设置',
    description: '家庭玩教具收纳与管理建议。'
  },

  {
    id: 192,
    title: '4.偏食问题的分析与解决策略',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/4.偏食问题的分析与解决策略.mp4',
    size_kb: 152782,
    tags: '偏食',
    description: '偏食成因分析与解决策略。'
  },

  {
    id: 193,
    title: '5.日常洗澡那件小事',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/5.日常洗澡那件小事.mp4',
    size_kb: 65379,
    tags: '洗澡',
    description: '家庭洗澡训练的实用建议。'
  },

  {
    id: 194,
    title: '6.培养自我整理的好习惯',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/6.培养自我整理的好习惯.mp4',
    size_kb: 97745,
    tags: '整理',
    description: '培养孩子自我整理习惯方法。'
  },

  {
    id: 195,
    title: '7.说说孩子漱口刷牙这件事',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/7.说说孩子漱口刷牙这件事.mp4',
    size_kb: 136415,
    tags: '刷牙',
    description: '家庭刷牙训练常见问题解答。'
  },

  {
    id: 196,
    title: '8.浅谈社交沟通',
    type: 'mp4',
    category: 2,
    path: 'videos/星星雨教育/8.浅谈社交沟通.mp4',
    size_kb: 91313,
    tags: '社交',
    description: '儿童社交沟通能力培养浅谈。'
  },

  {
    id: 197,
    title: '如何培养孩子自己吃饭 (1)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何培养孩子自己吃饭 (1).mp4',
    size_kb: 712135,
    tags: '进食',
    description: '培养独立进食能力的讲座。'
  },

  {
    id: 198,
    title: '如何培养孩子自己吃饭 (2)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何培养孩子自己吃饭 (2).mp4',
    size_kb: 523430,
    tags: '进食',
    description: '培养独立进食能力的讲座。'
  },

  {
    id: 199,
    title: '如何培养孩子自己吃饭 (3)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何培养孩子自己吃饭 (3).mp4',
    size_kb: 210656,
    tags: '进食',
    description: '培养独立进食能力的讲座。'
  },

  {
    id: 200,
    title: '如何训练孩子自己大小便 (1)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何训练孩子自己大小便 (1).mp4',
    size_kb: 332330,
    tags: '如厕',
    description: '如厕训练步骤与技巧讲座。'
  },

  {
    id: 201,
    title: '如何训练孩子自己大小便 (2)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何训练孩子自己大小便 (2).mp4',
    size_kb: 261759,
    tags: '如厕',
    description: '如厕训练步骤与技巧讲座。'
  },

  {
    id: 202,
    title: '如何训练孩子自己大小便 (3)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何训练孩子自己大小便 (3).mp4',
    size_kb: 194503,
    tags: '如厕',
    description: '如厕训练步骤与技巧讲座。'
  },

  {
    id: 203,
    title: '如何训练孩子自己大小便 (4)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何训练孩子自己大小便 (4).mp4',
    size_kb: 142604,
    tags: '如厕',
    description: '如厕训练步骤与技巧讲座。'
  },

  {
    id: 204,
    title: '如何训练孩子自己大小便 (5)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/如何训练孩子自己大小便 (5).mp4',
    size_kb: 90260,
    tags: '如厕',
    description: '如厕训练步骤与技巧讲座。'
  },

  {
    id: 205,
    title: '孩子挑食好苦恼，三步走轻松搞定1',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/孩子挑食好苦恼，三步走轻松搞定1.mp4',
    size_kb: 109429,
    tags: '偏食',
    description: '解决挑食问题的三步法。'
  },

  {
    id: 206,
    title: '孩子挑食好苦恼，三步走轻松搞定2',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/孩子挑食好苦恼，三步走轻松搞定2.mp4',
    size_kb: 100742,
    tags: '偏食',
    description: '解决挑食问题的三步法。'
  },

  {
    id: 207,
    title: '孩子挑食好苦恼，三步走轻松搞定3',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/孩子挑食好苦恼，三步走轻松搞定3.mp4',
    size_kb: 96486,
    tags: '偏食',
    description: '解决挑食问题的三步法。'
  },

  {
    id: 208,
    title: '教孩子穿衣服的详细讲解 (1)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/教孩子穿衣服的详细讲解 (1).mp4',
    size_kb: 487418,
    tags: '穿衣',
    description: '穿衣技能教学详细讲解。'
  },

  {
    id: 209,
    title: '教孩子穿衣服的详细讲解 (2)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/教孩子穿衣服的详细讲解 (2).mp4',
    size_kb: 362122,
    tags: '穿衣',
    description: '穿衣技能教学详细讲解。'
  },

  {
    id: 210,
    title: '教孩子穿衣服的详细讲解 (3)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/教孩子穿衣服的详细讲解 (3).mp4',
    size_kb: 263051,
    tags: '穿衣',
    description: '穿衣技能教学详细讲解。'
  },

  {
    id: 211,
    title: '教孩子穿衣服的详细讲解 (4)',
    type: 'mp4',
    category: 2,
    path: 'videos/董泉老师/教孩子穿衣服的详细讲解 (4).mp4',
    size_kb: 190164,
    tags: '穿衣',
    description: '穿衣技能教学详细讲解。'
  }

];

// 初始化导入的资源数据
export function initImportedResources(db: any): void {
  // 先检查表是否已有数据
  let existingCount = 0
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM resource_meta')
    const result = stmt.getAsObject({})
    existingCount = result.count as number
  } catch (e) {
    // 表可能不存在，继续执行
  }

  if (existingCount > 0) {
    console.log(`✅ 资源表已有 ${existingCount} 条数据，跳过初始化`)
    return
  }

  console.log(`开始插入 ${importedResources.length} 条资源数据...`)

  // 直接使用 run 方法，不使用 prepare
  const insertSQL = `
    INSERT INTO resource_meta
    (id, title, type, category, path, size_kb, tags, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
  `

  importedResources.forEach((resource, index) => {
    try {
      const title = resource.title || ''
      const type = resource.type || ''
      const category = resource.category || 1
      const path = resource.path || ''
      const size_kb = resource.size_kb || 0
      const tags = resource.tags || ''
      const description = resource.description || ''

      // 调试日志
      if (index === 0) {
        console.log('第一个资源数据:', {
          id: resource.id,
          title: title,
          titleType: typeof title,
          titleLength: title.length,
          type: type,
          category: category,
          path: path
        })
      }

      db.run(insertSQL, [
        resource.id,
        title,
        type,
        category,
        path,
        size_kb,
        tags,
        description
      ]);
    } catch (error) {
      console.error(`❌ 插入资源失败 [${index}]:`, {
        id: resource.id,
        title: resource.title,
        titleType: typeof resource.title,
        type: resource.type,
        category: resource.category,
        path: resource.path
      });
      throw error;
    }
  });

  console.log(`✅ 成功插入 ${importedResources.length} 条资源数据`)
}

// 初始化资源数据（主入口函数）
export function initResourceData(db: any): void {
  console.log('开始初始化资源数据...')

  // 先初始化导入的资源数据（211条）
  initImportedResources(db)
  console.log('已初始化导入的资源数据（211条）')

  // 可选：初始化示例资源（仅当数据库为空时）
  // const checkResult = db.exec('SELECT COUNT(*) as count FROM resource_meta')
  // if (checkResult.length > 0 && checkResult[0].values[0][0] === 0) {
  //   initSampleResources(db)
  //   console.log('已初始化示例资源数据')
  // }

  console.log('资源数据初始化完成')
}

// 初始化示例资源数据
export function initSampleResources(db: any): void {
  const insertResource = db.prepare(`
    INSERT OR REPLACE INTO resource_meta
    (title, type, category, path, size_kb, tags, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
  `)

  sampleResources.forEach(resource => {
    insertResource.run(
      resource.title,
      resource.type,
      resource.category,
      resource.path,
      resource.size_kb,
      resource.tags,
      resource.description
    )
  })
}

// 格式化文件大小
export function formatFileSize(sizeKb: number): string {
  if (!sizeKb || sizeKb === 0) return '0 KB'

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = sizeKb
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// 根据文件类型获取图标
export function getFileIcon(fileType: string): string {
  const iconMap: Record<string, string> = {
    pdf: 'fa-file-pdf',
    doc: 'fa-file-word',
    docx: 'fa-file-word',
    xls: 'fa-file-excel',
    xlsx: 'fa-file-excel',
    ppt: 'fa-file-powerpoint',
    pptx: 'fa-file-powerpoint',
    txt: 'fa-file-alt',
    jpg: 'fa-file-image',
    jpeg: 'fa-file-image',
    png: 'fa-file-image',
    gif: 'fa-file-image',
    bmp: 'fa-file-image',
    svg: 'fa-file-image',
    mp4: 'fa-file-video',
    avi: 'fa-file-video',
    mov: 'fa-file-video',
    wmv: 'fa-file-video',
    flv: 'fa-file-video',
    mkv: 'fa-file-video',
    mp3: 'fa-file-audio',
    wav: 'fa-file-audio',
    flac: 'fa-file-audio',
    aac: 'fa-file-audio',
    zip: 'fa-file-archive',
    rar: 'fa-file-archive',
    '7z': 'fa-file-archive',
    tar: 'fa-file-archive',
    gz: 'fa-file-archive'
  }

  return iconMap[fileType.toLowerCase()] || 'fa-file'
}

// 根据文件类型获取图标颜色
export function getFileIconColor(fileType: string): string {
  const colorMap: Record<string, string> = {
    pdf: '#e74c3c',
    doc: '#3498db',
    docx: '#3498db',
    xls: '#2ecc71',
    xlsx: '#2ecc71',
    ppt: '#e67e22',
    pptx: '#e67e22',
    txt: '#95a5a6',
    jpg: '#9b59b6',
    jpeg: '#9b59b6',
    png: '#9b59b6',
    gif: '#9b59b6',
    bmp: '#9b59b6',
    svg: '#9b59b6',
    mp4: '#e74c3c',
    avi: '#e74c3c',
    mov: '#e74c3c',
    wmv: '#e74c3c',
    flv: '#e74c3c',
    mkv: '#e74c3c',
    mp3: '#f39c12',
    wav: '#f39c12',
    flac: '#f39c12',
    aac: '#f39c12',
    zip: '#9b59b6',
    rar: '#9b59b6',
    '7z': '#9b59b6',
    tar: '#9b59b6',
    gz: '#9b59b6'
  }

  return colorMap[fileType.toLowerCase()] || '#95a5a6'
}