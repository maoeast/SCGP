/**
 * 瑞文 CRT 图形矩阵 SVG 生成（DRAFT 占位题图）
 *
 * 按 SPM 五组推理规律，把题库中的图元规格（CrtCellSpec）渲染为原创几何矩阵。
 * 不使用任何真实瑞文图——仅以代码按公开「题目结构 + 推理规律类型」生成，
 * 标 DRAFT，仅供平台筛查 / 发育监测，无标准化效度。
 *
 * 生成的 SVG 经 svgToDataUri 转 data-URI，交由 resolvePresetResourceUrl 透传给 <img>。
 *
 * @module utils/crt-matrix
 */

import type { CrtCellSpec, CrtShape } from '@/database/crt-data'

/** 主题调色板（color 字段可填键名或具体色值） */
const PALETTE: Record<string, string> = {
  primary: '#409eff',
  red: '#f56c6c',
  green: '#67c23a',
  orange: '#e6a23c',
  purple: '#9b59b6',
  gray: '#909399',
}

const DEFAULT_COLOR = '#409eff'

function colorOf(cell: CrtCellSpec): string {
  const key = cell.color
  if (!key) return DEFAULT_COLOR
  const fromPalette = PALETTE[key]
  return fromPalette ?? key
}

/** 单个图元的 SVG（以 (cx,cy) 为中心，size 为基准尺寸） */
function shapePath(shape: CrtShape, cx: number, cy: number, size: number, fill: string): string {
  const r = size / 2
  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
    case 'dot':
      return `<circle cx="${cx}" cy="${cy}" r="${size * 0.18}" fill="${fill}"/>`
    case 'square':
      return `<rect x="${cx - r}" y="${cy - r}" width="${size}" height="${size}" rx="${size * 0.1}" fill="${fill}"/>`
    case 'triangle': {
      const h = size * 0.866
      return `<polygon points="${cx},${cy - h / 2} ${cx - r},${cy + h / 2} ${cx + r},${cy + h / 2}" fill="${fill}"/>`
    }
    case 'diamond':
      return `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${fill}"/>`
    case 'star': {
      const pts: string[] = []
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2
        const rad = i % 2 === 0 ? r : r * 0.4
        pts.push(`${(cx + rad * Math.cos(ang)).toFixed(1)},${(cy + rad * Math.sin(ang)).toFixed(1)}`)
      }
      return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`
    }
    case 'hexagon': {
      const pts: string[] = []
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i + Math.PI / 6
        pts.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`)
      }
      return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`
    }
    case 'arrow': {
      // 默认指向上，靠 rotate 旋转（0/90/180/270）
      const d =
        `M${cx} ${cy - r} ` +
        `L${cx + r * 0.6} ${cy - r * 0.2} ` +
        `L${cx + r * 0.25} ${cy - r * 0.2} ` +
        `L${cx + r * 0.25} ${cy + r} ` +
        `L${cx - r * 0.25} ${cy + r} ` +
        `L${cx - r * 0.25} ${cy - r * 0.2} ` +
        `L${cx - r * 0.6} ${cy - r * 0.2} Z`
      return `<path d="${d}" fill="${fill}"/>`
    }
    default:
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
  }
}

/** 渲染一个格子内容（含旋转、count 多图元横向排列） */
function renderCellContent(cell: CrtCellSpec, cx: number, cy: number, baseSize: number): string {
  const count = Math.max(1, cell.count ?? 1)
  const scale = cell.scale ?? 1
  const fill = colorOf(cell)

  if (count === 1) {
    const inner = shapePath(cell.shape, cx, cy, baseSize * scale, fill)
    return cell.rotate ? `<g transform="rotate(${cell.rotate} ${cx} ${cy})">${inner}</g>` : inner
  }

  // 多个图元横向排列
  const each = baseSize * 0.5 * scale
  const gap = baseSize * 0.55
  const startX = cx - (gap * (count - 1)) / 2
  const items: string[] = []
  for (let i = 0; i < count; i++) {
    items.push(shapePath(cell.shape, startX + i * gap, cy, each, fill))
  }
  return items.join('')
}

/** 渲染单格图元为完整 SVG（用于选项图） */
export function renderOptionSvg(cell: CrtCellSpec): string {
  const content = renderCellContent(cell, 50, 50, 56)
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${content}</svg>`
}

/** 渲染 3×3 矩阵为完整 SVG（缺失格画虚线框 + 问号） */
export function renderMatrixSvg(matrix: (CrtCellSpec | null)[]): string {
  const cellSize = 100
  const gap = 6
  const total = cellSize * 3 + gap * 2
  const cells: string[] = []

  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3)
    const col = i % 3
    const x = col * (cellSize + gap)
    const y = row * (cellSize + gap)
    const spec = matrix[i]

    if (spec === null || spec === undefined) {
      // 缺失格（右下角）
      cells.push(
        `<rect x="${x + 2}" y="${y + 2}" width="${cellSize - 4}" height="${cellSize - 4}" rx="6" fill="#fafafa" stroke="#c0c4cc" stroke-width="2" stroke-dasharray="6 4"/>`
      )
      cells.push(
        `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 10}" text-anchor="middle" font-size="34" fill="#c0c4cc" font-family="sans-serif">?</text>`
      )
    } else {
      cells.push(
        `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="6" fill="#ffffff" stroke="#e4e7ed" stroke-width="1"/>`
      )
      cells.push(renderCellContent(spec, x + cellSize / 2, y + cellSize / 2, cellSize * 0.6))
    }
  }

  return `<svg viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg">${cells.join('')}</svg>`
}

/** SVG 字符串 → data-URI（resolvePresetResourceUrl 对 data: 前缀原样透传） */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
