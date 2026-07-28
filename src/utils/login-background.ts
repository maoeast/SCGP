import type { LoginThemeVariant } from '@/utils/login-theme'
import {
  deleteManagedFile,
  normalizeRelativePath,
  resolveAbsolutePath,
} from '@/utils/resource-file-service'

export type LoginBackgroundKind = 'image' | 'video'

export interface LoginBackgroundMedia {
  image: string
  video: string
}

export type LoginBackgrounds = Record<LoginThemeVariant, LoginBackgroundMedia>

export const LOGIN_BACKGROUND_VARIANTS: LoginThemeVariant[] = [
  'warm-glow',
  'calm-blue',
  'lush-green',
  'custom',
]

const LOGIN_BACKGROUND_KINDS: LoginBackgroundKind[] = ['image', 'video']
const LOGIN_BACKGROUND_ROOT = 'login-backgrounds'
export const LOGIN_BACKGROUND_PRESET_VERSION = '1'

const createBundledBackground = (variant: Exclude<LoginThemeVariant, 'custom'>) => ({
  image: `resource://${LOGIN_BACKGROUND_ROOT}/${variant}/background.jpg`,
  video: `resource://${LOGIN_BACKGROUND_ROOT}/${variant}/background.mp4`,
})

function hasElectronApi(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI)
}

export function createDefaultLoginBackgrounds(): LoginBackgrounds {
  return {
    'warm-glow': { image: '', video: '' },
    'calm-blue': { image: '', video: '' },
    'lush-green': { image: '', video: '' },
    custom: { image: '', video: '' },
  }
}

export function createBundledLoginBackgrounds(): LoginBackgrounds {
  return {
    'warm-glow': createBundledBackground('warm-glow'),
    'calm-blue': createBundledBackground('calm-blue'),
    'lush-green': createBundledBackground('lush-green'),
    custom: { image: '', video: '' },
  }
}

export function hasLoginBackgroundMedia(value: LoginBackgrounds): boolean {
  return LOGIN_BACKGROUND_VARIANTS.some(variant => Boolean(
    value[variant]?.image || value[variant]?.video,
  ))
}

export function cloneLoginBackgrounds(value: LoginBackgrounds): LoginBackgrounds {
  return LOGIN_BACKGROUND_VARIANTS.reduce((result, variant) => {
    result[variant] = {
      image: value[variant]?.image || '',
      video: value[variant]?.video || '',
    }
    return result
  }, createDefaultLoginBackgrounds())
}

export function normalizeLoginBackgroundRef(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (
    trimmed.startsWith('data:')
    || trimmed.startsWith('blob:')
    || trimmed.startsWith('resource://')
    || trimmed.startsWith('/')
    || trimmed.startsWith('./')
    || /^https?:\/\//i.test(trimmed)
  ) {
    if (trimmed.startsWith('resource://')) {
      const relativePath = normalizeRelativePath(trimmed.slice('resource://'.length))
      return hasPathTraversal(relativePath) ? '' : `resource://${relativePath}`
    }
    return trimmed
  }

  const relativePath = normalizeRelativePath(trimmed)
  return hasPathTraversal(relativePath) ? '' : `resource://${relativePath}`
}

export function parseLoginBackgrounds(serialized: string | null | undefined): LoginBackgrounds {
  const result = createDefaultLoginBackgrounds()

  if (!serialized?.trim()) {
    return result
  }

  try {
    const parsed = JSON.parse(serialized) as Record<string, unknown>
    for (const variant of LOGIN_BACKGROUND_VARIANTS) {
      const media = parsed?.[variant]
      if (!media || typeof media !== 'object') {
        continue
      }

      for (const kind of LOGIN_BACKGROUND_KINDS) {
        result[variant][kind] = normalizeLoginBackgroundRef(
          (media as Record<string, unknown>)[kind],
        )
      }
    }
  } catch {
    // 配置损坏时返回空配置，让登录页继续使用程序化背景。
  }

  return result
}

export function serializeLoginBackgrounds(value: LoginBackgrounds): string {
  return JSON.stringify(cloneLoginBackgrounds(value))
}

export function getLoginBackgroundUrl(value: string): string {
  const normalized = normalizeLoginBackgroundRef(value)
  if (!normalized) {
    return ''
  }

  if (normalized.startsWith('resource://') && !hasElectronApi()) {
    return `/assets/resources/${normalized.slice('resource://'.length)}`
  }

  return normalized
}

export async function saveLoginBackgroundFile(
  file: File,
  variant: LoginThemeVariant,
  kind: LoginBackgroundKind,
): Promise<string> {
  if (!hasElectronApi()) {
    return readFileAsDataUrl(file)
  }

  const extension = getSafeExtension(file.name, kind === 'video' ? 'mp4' : 'jpg')
  const fileName = `${variant}-${kind}-${Date.now()}.${extension}`
  const relativePath = `${LOGIN_BACKGROUND_ROOT}/${variant}/${fileName}`
  const absolutePath = await resolveAbsolutePath(relativePath)
  const directoryPath = absolutePath.replace(/[\\/][^\\/]+$/, '')
  const directoryReady = await window.electronAPI.ensureDir(directoryPath)

  if (!directoryReady) {
    throw new Error('无法创建登录背景资源目录')
  }

  const saved = await window.electronAPI.saveFile(
    absolutePath,
    new Uint8Array(await file.arrayBuffer()),
  )
  if (!saved) {
    throw new Error(`登录背景${kind === 'video' ? '视频' : '图片'}保存失败`)
  }

  return `resource://${relativePath}`
}

export async function deleteLoginBackgroundFile(value: string): Promise<boolean> {
  const relativePath = getManagedLoginBackgroundPath(value)
  if (!relativePath || !hasElectronApi()) {
    return true
  }

  return deleteManagedFile(relativePath)
}

function getManagedLoginBackgroundPath(value: string): string {
  const normalized = normalizeLoginBackgroundRef(value)
  if (!normalized.startsWith('resource://')) {
    return ''
  }

  const relativePath = normalizeRelativePath(normalized.slice('resource://'.length))
  return relativePath.startsWith(`${LOGIN_BACKGROUND_ROOT}/`) && !hasPathTraversal(relativePath)
    ? relativePath
    : ''
}

function hasPathTraversal(relativePath: string): boolean {
  return relativePath.split('/').some(segment => segment === '..')
}

function getSafeExtension(fileName: string, fallback: string): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(fileName)
  return (match?.[1] || fallback).toLowerCase()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取登录背景文件失败'))
    reader.readAsDataURL(file)
  })
}
