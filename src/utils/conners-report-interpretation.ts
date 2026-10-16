export type ConnersLevel = 'normal' | 'borderline' | 'clinical'

export interface ConnersDimensionInterpretation {
  name: string
  tScore: number
  level: ConnersLevel
}

const levelLabels: Record<ConnersLevel, string> = {
  normal: '正常范围',
  borderline: '临界偏高',
  clinical: '临床显著',
}

export function getConnersLevel(tScore: number): ConnersLevel {
  return tScore < 60 ? 'normal' : tScore < 70 ? 'borderline' : 'clinical'
}

export function getConnersDimensionText(dimension: ConnersDimensionInterpretation): string {
  return `${dimension.name} T 分 ${dimension.tScore.toFixed(1)}，按当前软件阈值属于${levelLabels[dimension.level]}。`
}

export function getConnersOverview(indexTScore: number, dimensions: ConnersDimensionInterpretation[]) {
  const indexLevel = getConnersLevel(indexTScore)
  const elevated = dimensions.filter(dimension =>
    dimension.name !== '多动指数' && dimension.level !== 'normal',
  )
  const dimensionText = elevated.length > 0
    ? `另有${elevated.map(dimension => `${dimension.name}（T 分 ${dimension.tScore.toFixed(1)}，${levelLabels[dimension.level]}）`).join('、')}，请分别核对。`
    : '其余列出的维度按当前软件阈值均在正常范围。'

  return {
    title: `多动指数：${levelLabels[indexLevel]}`,
    severity: indexLevel === 'normal' ? 'success' : indexLevel === 'borderline' ? 'warning' : 'danger',
    content: `多动指数 T 分 ${indexTScore.toFixed(1)}，按当前软件阈值属于${levelLabels[indexLevel]}。${dimensionText}本结果仅反映本次问卷评分，不能单独用于诊断。`,
    advice: elevated.length > 0
      ? ['结合评估者访谈与日常观察，逐项核对偏高维度的具体表现。']
      : ['结合评估者访谈与日常观察核对本次问卷结果。'],
  }
}
