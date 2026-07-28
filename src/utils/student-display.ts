import { resolvePresetResourceUrl } from '@/utils/preset-resource'

export const DIAGNOSIS_OPTIONS = [
  '视力障碍',
  '听力障碍',
  '言语障碍',
  '智力障碍',
  '肢体障碍',
  '精神障碍',
  '多重障碍',
  '学习障碍',
  '发育迟缓',
] as const

export type DiagnosisType = typeof DIAGNOSIS_OPTIONS[number]
export type StudentAvatarTone = 'male' | 'female' | 'neutral'

export const DIAGNOSIS_STYLE_MAP: Record<DiagnosisType, { background: string; color: string; border: string }> = {
  视力障碍: { background: '#E6F1FB', color: '#0C447C', border: '#B5D4F4' },
  听力障碍: { background: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  言语障碍: { background: '#E1F5EE', color: '#085041', border: '#9FE1CB' },
  智力障碍: { background: '#FAEEDA', color: '#633806', border: '#FAC775' },
  肢体障碍: { background: '#EAF3DE', color: '#27500A', border: '#C0DD97' },
  精神障碍: { background: '#FBEAF0', color: '#72243E', border: '#F4C0D1' },
  多重障碍: { background: '#FCEBEB', color: '#791F1F', border: '#F7C1C1' },
  学习障碍: { background: '#E6F1FB', color: '#185FA5', border: '#85B7EB' },
  发育迟缓: { background: '#FAEEDA', color: '#854F0B', border: '#EF9F27' },
}

export function normalizeDiagnosisText(value?: string | null): string {
  return value?.replace(/\s+/g, '').trim() || ''
}

export function resolveDiagnosisType(disorder?: string | null): DiagnosisType | '' {
  const normalized = normalizeDiagnosisText(disorder)
  if (!normalized) return ''

  if (normalized.includes('视力障碍')) return '视力障碍'
  if (normalized.includes('听力障碍')) return '听力障碍'
  if (normalized.includes('言语障碍') || normalized.includes('语言障碍')) return '言语障碍'
  if (normalized.includes('智力障碍')) return '智力障碍'
  if (normalized.includes('肢体障碍')) return '肢体障碍'
  if (normalized.includes('精神障碍') || normalized.includes('ASD') || normalized.includes('ADHD') || normalized.includes('EBD')) return '精神障碍'
  if (normalized.includes('多重障碍')) return '多重障碍'
  if (normalized.includes('学习障碍')) return '学习障碍'
  if (normalized.includes('发育迟缓')) return '发育迟缓'

  return ''
}

export function getDiagnosisDisplay(type?: string | null): string {
  return resolveDiagnosisType(type) || type?.trim() || '未诊断'
}

export function getDiagnosisStyle(type?: string | null) {
  const diagnosisType = resolveDiagnosisType(type)
  return diagnosisType ? DIAGNOSIS_STYLE_MAP[diagnosisType] : null
}

// 旧逻辑会把首字头像生成成极短的 PNG data URL 存库，这里按“未上传头像”处理。
export function isGeneratedStudentFallbackAvatar(avatarUrl?: string | null): boolean {
  return Boolean(avatarUrl && avatarUrl.startsWith('data:image/png;base64,') && avatarUrl.length < 12000)
}

export function resolveStudentAvatarUrl(avatarUrl?: string | null): string {
  const normalized = avatarUrl?.trim() || ''
  if (!normalized || isGeneratedStudentFallbackAvatar(normalized)) {
    return ''
  }
  return resolvePresetResourceUrl(normalized)
}

export function getStudentInitial(name?: string | null): string {
  return name?.trim().charAt(0).toUpperCase() || '?'
}

export function normalizeStudentGender(gender?: string | null): StudentAvatarTone {
  if (gender === '女' || gender === 'female') return 'female'
  if (gender === '男' || gender === 'male') return 'male'
  return 'neutral'
}

export function formatStudentId(id?: string | null, full = false): string {
  const normalized = id?.trim()
  if (!normalized) return '未设置学号'
  if (full) return normalized
  return `STU…${normalized.slice(-6)}`
}

export function formatStudentDate(date?: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

export function getStudentAge(birthday?: string | null): number {
  if (!birthday) return 0

  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}
