export function shuffleArray<T>(items: readonly T[]): T[] {
  const nextItems = [...items]

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex]!, nextItems[index]!]
  }

  return nextItems
}

export function averageNumberList(values: Array<number | null | undefined>): number | null {
  const normalized = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)

  if (normalized.length === 0) {
    return null
  }

  return Math.round(normalized.reduce((sum, value) => sum + value, 0) / normalized.length)
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
