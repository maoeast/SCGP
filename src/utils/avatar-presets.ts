import { resolvePresetResourceUrl } from '@/utils/preset-resource'

export interface AvatarPreset {
  id: string
  label: string
  path: string
}

export const STUDENT_AVATAR_PRESETS: readonly AvatarPreset[] = [
  {
    id: 'kindergarten-female-student',
    label: '幼儿园女生',
    path: 'images/user-avatars/Kindergarten_Female_Student.png',
  },
  {
    id: 'kindergarten-male-student',
    label: '幼儿园男生',
    path: 'images/user-avatars/Kindergarten_Male_Student.png',
  },
  {
    id: 'elementary-female-student',
    label: '小学生女生',
    path: 'images/user-avatars/Elementary_Female_Student.png',
  },
  {
    id: 'elementary-male-student',
    label: '小学生男生',
    path: 'images/user-avatars/Elementary_Male_Student.png',
  },
  {
    id: 'middle-school-female-student',
    label: '中学生女生',
    path: 'images/user-avatars/MiddleSchool_Female_Student.png',
  },
  {
    id: 'middle-school-male-student',
    label: '中学生男生',
    path: 'images/user-avatars/MiddleSchool_Male_Student.png',
  },
]

export const TEACHER_AVATAR_PRESETS: readonly AvatarPreset[] = [
  {
    id: 'young-female-teacher',
    label: '青年女教师',
    path: 'images/user-avatars/Young_Female_Teacher.png',
  },
  {
    id: 'young-male-teacher',
    label: '青年男教师',
    path: 'images/user-avatars/Young_Male_Teacher.png',
  },
  {
    id: 'middle-aged-female-teacher',
    label: '中年女教师',
    path: 'images/user-avatars/MiddleAged_Female_Teacher.png',
  },
  {
    id: 'middle-aged-male-teacher',
    label: '中年男教师',
    path: 'images/user-avatars/MiddleAged_Male_Teacher.png',
  },
  {
    id: 'senior-female-teacher',
    label: '资深女教师',
    path: 'images/user-avatars/Senior_Female_Teacher.png',
  },
  {
    id: 'senior-male-teacher',
    label: '资深男教师',
    path: 'images/user-avatars/Senior_Male_Teacher.png',
  },
]

export function resolveAvatarUrl(value?: string | null): string {
  return resolvePresetResourceUrl(value)
}
