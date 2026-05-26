import type { CSSProperties } from 'vue'

export type WoodenShapeBlockId =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'hexagon'
  | 'star'
  | 'trapezoid'
  | 'diamond'
  | 'rightTriangle'
  | 'heart'

export interface WoodenShapeBlockPalette extends CSSProperties {
  '--block-face': string
  '--block-light': string
  '--block-shadow': string
  '--block-edge': string
  '--block-rgb': string
}

const SVG_VIEWBOX = '0 0 100 100'
const MASK_STROKE_ATTRS = 'stroke="white" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"'

const WOODEN_SHAPE_BLOCK_SVG_MARKUP: Record<WoodenShapeBlockId, string> = {
  circle: '<circle cx="50" cy="50" r="42" fill="FILL" STROKE_ATTRS />',
  square: '<rect x="8" y="8" width="84" height="84" rx="18" fill="FILL" STROKE_ATTRS />',
  triangle: '<polygon points="50,6 94,94 6,94" fill="FILL" STROKE_ATTRS />',
  hexagon: '<polygon points="24,8 76,8 94,50 76,92 24,92 6,50" fill="FILL" STROKE_ATTRS />',
  star: '<polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="FILL" STROKE_ATTRS />',
  trapezoid: '<polygon points="22,12 78,12 92,92 8,92" fill="FILL" STROKE_ATTRS />',
  diamond: '<polygon points="50,5 95,50 50,95 5,50" fill="FILL" STROKE_ATTRS />',
  rightTriangle: '<polygon points="8,8 92,8 8,92" fill="FILL" STROKE_ATTRS />',
  heart: '<path d="M50,84 C18,62 10,42 10,27 C10,16 18,10 29,10 C39,10 45,16 50,24 C55,16 61,10 71,10 C82,10 90,16 90,27 C90,42 82,62 50,84 Z" fill="FILL" STROKE_ATTRS />',
}

export function normalizeWoodenShapeHex(hex: string) {
  const compact = hex.replace('#', '').trim()
  if (compact.length === 3) {
    return compact.split('').map((char) => `${char}${char}`).join('')
  }
  if (compact.length === 6) {
    return compact
  }
  return '4b82ff'
}

export function hexToWoodenShapeRgb(hex: string) {
  const normalized = normalizeWoodenShapeHex(hex)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  return `#${[r, g, b].map((channel) => clamp(channel).toString(16).padStart(2, '0')).join('')}`
}

export function mixWoodenShapeColor(sourceHex: string, targetHex: string, amount: number) {
  const ratio = Math.min(1, Math.max(0, amount))
  const source = hexToWoodenShapeRgb(sourceHex)
  const target = hexToWoodenShapeRgb(targetHex)

  return rgbToHex({
    r: source.r + (target.r - source.r) * ratio,
    g: source.g + (target.g - source.g) * ratio,
    b: source.b + (target.b - source.b) * ratio,
  })
}

export function buildWoodenShapeBlockPalette(color: string): WoodenShapeBlockPalette {
  const rgb = hexToWoodenShapeRgb(color)

  return {
    '--block-face': mixWoodenShapeColor(color, '#f4c88d', 0.12),
    '--block-light': mixWoodenShapeColor(color, '#fff5e6', 0.42),
    '--block-shadow': mixWoodenShapeColor(color, '#7a4a21', 0.38),
    '--block-edge': mixWoodenShapeColor(color, '#4f3119', 0.44),
    '--block-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
  }
}

export function getWoodenShapeBlockSvgMarkup(shapeId: WoodenShapeBlockId): string {
  return WOODEN_SHAPE_BLOCK_SVG_MARKUP[shapeId]
}

export function buildWoodenShapeBlockMaskStyle(shapeId: WoodenShapeBlockId): CSSProperties {
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEWBOX}">${getWoodenShapeBlockSvgMarkup(shapeId)
    .replace('FILL', 'white')
    .replace('STROKE_ATTRS', MASK_STROKE_ATTRS)}</svg>`
  const maskImage = `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}")`

  return {
    WebkitMaskImage: maskImage,
    maskImage,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  }
}
