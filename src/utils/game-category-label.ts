/**
 * 游戏训练类型标签：资源 category code → 中文展示名。
 * 供游戏大厅预览区与 GamePreviewCard 共用，避免各组件维护重复映射。
 */
const GAME_CATEGORY_LABELS: Record<string, string> = {
  motor: '体感训练',
  visual: '视觉训练',
  audio: '听觉训练',
  tactile: '触觉训练',
  construction: '结构搭建',
  coordination: '手眼协调',
  inhibition: '抑制控制',
  sorting: '分类整理',
  tracing: '轨迹描摹',
}

export function getGameCategoryLabel(category?: string | null): string {
  return GAME_CATEGORY_LABELS[category || ''] || category || '综合训练'
}
