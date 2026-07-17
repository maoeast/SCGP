export function formatTokenCount(value: number | null | undefined): string {
  const safe = Number(value || 0)
  if (!Number.isFinite(safe)) return '0'
  return Math.floor(safe).toLocaleString('zh-CN')
}
