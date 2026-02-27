/**
 * Font Awesome 6.x 图标配置
 * 统一管理项目中使用的所有图标
 *
 * 使用说明：
 * 1. 所有图标名称已更新为 Font Awesome 6.x 规范
 * 2. 导航图标：用于侧边栏菜单
 * 3. 操作图标：用于按钮、表单等交互元素
 * 4. 状态图标：用于提示、通知等状态显示
 * 5. 文件图标：用于文件类型展示
 *
 * @see https://fontawesome.com/icons
 */

export const ICONS = {
  // ========== 导航图标 ==========
  home: 'house',                    // 首页（FA 6.x）
  students: 'user-graduate',        // 学生管理
  assessment: 'clipboard-check',    // 能力评估
  training: 'list-check',           // 训练任务（FA 6.x）
  plans: 'calendar-days',           // 训练计划（FA 6.x）
  records: 'clock-rotate-left',     // 训练记录（FA 6.x）
  resources: 'book-open',           // 资料库
  reports: 'chart-column',          // 报告生成（FA 6.x）
  system: 'gear',                   // 系统管理（FA 6.x）
  activation: 'key',                // 激活管理

  // ========== 操作图标 ==========
  logout: 'right-from-bracket',     // 退出登录（FA 6.x）
  menu: 'bars',                     // 菜单
  close: 'xmark',                   // 关闭（FA 6.x）
  edit: 'pen-to-square',            // 编辑（FA 6.x）
  delete: 'trash-can',              // 删除（FA 6.x）
  add: 'plus',                      // 添加
  save: 'floppy-disk',              // 保存（FA 6.x）
  cancel: 'xmark',                  // 取消
  redo: 'redo',                     // 重做（FA 5.x兼容）

  // ========== 状态图标 ==========
  success: 'circle-check',          // 成功（FA 6.x）
  warning: 'triangle-exclamation',  // 警告（FA 6.x）
  error: 'circle-xmark',            // 错误（FA 6.x）
  info: 'circle-info',              // 信息（FA 6.x）
  loading: 'spinner',               // 加载中

  // ========== 功能图标 ==========
  search: 'magnifying-glass',       // 搜索（FA 6.x）
  filter: 'filter',                 // 筛选
  upload: 'arrow-up-from-bracket',  // 上传（FA 6.x）
  download: 'arrow-down-to-bracket',// 下载（FA 6.x）
  print: 'print',                   // 打印
  share: 'share-nodes',             // 分享（FA 6.x）
  camera: 'camera',                 // 相机
  video: 'video',                   // 视频
  audio: 'volume-high',             // 音频（FA 6.x）

  // ========== 文件图标 ==========
  file: 'file',                     // 文件
  folder: 'folder',                 // 文件夹
  image: 'image',                   // 图片
  pdf: 'file-pdf',                  // PDF文件
  word: 'file-word',                // Word文档
  excel: 'file-excel',              // Excel表格
  powerpoint: 'file-powerpoint',    // PowerPoint演示
  archive: 'file-zipper',           // 压缩文件（FA 6.x）
  code: 'file-code',                // 代码文件
  music: 'music',                   // 音乐

  // ========== 其他常用图标 ==========
  external: 'arrow-up-right-from-square',  // 外部链接（FA 6.x）
  refresh: 'arrows-rotate',         // 刷新（FA 6.x）
  back: 'arrow-left',               // 返回
  forward: 'arrow-right',           // 前进
  up: 'arrow-up',                   // 向上
  down: 'arrow-down',               // 向下
  check: 'check',                   // 勾选
  user: 'user',                     // 用户
  lock: 'lock',                     // 锁定
  unlock: 'lock-open',              // 解锁（FA 6.x）
  eye: 'eye',                       // 查看
  eyeSlash: 'eye-slash',            // 隐藏
  bell: 'bell',                     // 通知
  star: 'star',                     // 收藏
  heart: 'heart',                   // 喜欢
  comment: 'comment',               // 评论
  question: 'circle-question',      // 问题（FA 6.x）
  exclamation: 'circle-exclamation',// 感叹（FA 6.x）
  chartLine: 'chart-line',          // 折线图
  chartPie: 'chart-pie',            // 饼图
  table: 'table',                   // 表格
  list: 'list',                     // 列表
  grid: 'grip',                     // 网格（FA 6.x）
  settings: 'gear',                 // 设置（FA 6.x）
  power: 'power-off',               // 电源
  wifi: 'wifi',                     // WiFi
  signal: 'signal',                 // 信号
  battery: 'battery-full',          // 电池
  clock: 'clock',                   // 时钟
  calendar: 'calendar',             // 日历
  map: 'map',                       // 地图
  location: 'location-dot',         // 位置（FA 6.x）
  phone: 'phone',                   // 电话
  envelope: 'envelope',             // 邮件
  link: 'link',                     // 链接
  clipboard: 'clipboard',           // 剪贴板
  copy: 'copy',                     // 复制
  paste: 'paste',                   // 粘贴
  cut: 'scissors',                  // 剪切
  bold: 'bold',                     // 加粗
  italic: 'italic',                 // 斜体
  underline: 'underline',           // 下划线
  alignLeft: 'align-left',          // 左对齐
  alignCenter: 'align-center',      // 居中对齐
  alignRight: 'align-right',        // 右对齐
  alignJustify: 'align-justify',    // 两端对齐
} as const;

/**
 * 图标类型定义
 */
export type IconKey = keyof typeof ICONS;

/**
 * 获取完整的图标类名
 * @param iconKey 图标键名
 * @returns 完整的 Font Awesome 类名，如 "fas fa-house"
 *
 * @example
 * getIconClass('home') // 返回: "fas fa-house"
 * getIconClass('logout') // 返回: "fas fa-right-from-bracket"
 */
export function getIconClass(iconKey: IconKey): string {
  return `fas fa-${ICONS[iconKey]}`;
}

/**
 * 获取图标名称（不含前缀）
 * @param iconKey 图标键名
 * @returns 图标名称，如 "house"
 *
 * @example
 * getIconName('home') // 返回: "house"
 * getIconName('logout') // 返回: "right-from-bracket"
 */
export function getIconName(iconKey: IconKey): string {
  return ICONS[iconKey];
}

/**
 * 检查图标是否存在
 * @param iconKey 图标键名
 * @returns 是否存在
 *
 * @example
 * hasIcon('home') // 返回: true
 * hasIcon('nonexistent' as IconKey) // 返回: false
 */
export function hasIcon(iconKey: string): iconKey is IconKey {
  return iconKey in ICONS;
}

/**
 * 获取所有图标键名
 * @returns 所有图标的键名数组
 */
export function getAllIconKeys(): IconKey[] {
  return Object.keys(ICONS) as IconKey[];
}

/**
 * Font Awesome 5.x 到 6.x 的迁移映射表
 * 用于帮助开发者快速查找旧图标名对应的新名称
 */
export const ICON_MIGRATION_MAP: Record<string, IconKey> = {
  'home': 'home',                           // home → house
  'tasks': 'training',                      // tasks → list-check
  'cog': 'system',                          // cog → gear
  'calendar-alt': 'plans',                  // calendar-alt → calendar-days
  'history': 'records',                     // history → clock-rotate-left
  'chart-bar': 'reports',                   // chart-bar → chart-column
  'sign-out-alt': 'logout',                 // sign-out-alt → right-from-bracket
  'check-circle': 'success',                // check-circle → circle-check
  'exclamation-triangle': 'warning',        // exclamation-triangle → triangle-exclamation
  'times-circle': 'error',                  // times-circle → circle-xmark
  'info-circle': 'info',                    // info-circle → circle-info
  'external-link-alt': 'external',          // external-link-alt → arrow-up-right-from-square
  'sync': 'refresh',                        // sync → arrows-rotate
  'edit': 'edit',                           // edit → pen-to-square
  'trash': 'delete',                        // trash → trash-can
  'save': 'save',                           // save → floppy-disk
  'upload': 'upload',                       // upload → arrow-up-from-bracket
  'download': 'download',                   // download → arrow-down-to-bracket
  'volume-up': 'audio',                     // volume-up → volume-high
  'unlock': 'unlock',                       // unlock → lock-open
  'question-circle': 'question',            // question-circle → circle-question
  'exclamation-circle': 'exclamation',      // exclamation-circle → circle-exclamation
  'th': 'grid',                             // th → grip
  'battery-full': 'battery',                // battery-full 保持不变
  'map-marker-alt': 'location',             // map-marker-alt → location-dot
  'times': 'close',                         // times → xmark
  'search': 'search',                       // search → magnifying-glass
  'share-alt': 'share',                     // share-alt → share-nodes
  'file-archive': 'archive',                // file-archive → file-zipper
};

/**
 * 根据旧图标名查找新图标
 * @param oldIconName 旧的图标名称（Font Awesome 5.x）
 * @returns 新的图标键名，如果不存在则返回 undefined
 *
 * @example
 * migrateIcon('tasks') // 返回: 'training'
 * migrateIcon('cog') // 返回: 'system'
 */
export function migrateIcon(oldIconName: string): IconKey | undefined {
  return ICON_MIGRATION_MAP[oldIconName];
}

export default ICONS;
