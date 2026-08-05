/**
 * 瑞文 CRT 图形矩阵 SVG 生成（DRAFT 占位题图）
 *
 * 按 SPM 五组推理规律，把题库中的图元规格（CrtCellSpec）渲染为原创几何矩阵。
 * 不使用任何真实瑞文图——仅以代码按公开「题目结构 + 推理规律类型」生成，
 * 标 DRAFT，仅供平台筛查 / 发育监测，无标准化效度。
 *
 * 同时服务「视知觉图形匹配筛查任务（cognitive_self）」的选项渲染。
 *
 * 固定变换顺序（全题库统一，见 cognitive-self 设计稿 §3.3）：
 *   局部图元生成（shape + internalMark）→ scale → rotate → 单图元 mirror → layout 定位
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

/** 单个图元的 SVG（以 (cx,cy) 为中心，size 为基准尺寸；ring 的缺口方位由 gapPosition 指定） */
function shapePath(
  shape: CrtShape,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  gapPosition?: number,
): string {
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
      // 默认指向上，靠 rotate 旋转（0/90/180/270 或任意角度）
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
    case 'flag': {
      // 手性（非对称）旗形：旗杆在左、旗面向右上展开。
      // 镜像后旗面朝左上，与任何旋转（绕中心）结果均不同 —— mirrorX 是独立结构属性。
      const poleX = cx - r * 0.4
      const poleW = r * 0.12
      const flagTop = cy - r * 0.95
      const flagBottom = cy - r * 0.05
      const flagRight = cx + r * 0.68
      const flagSlant = cy - r * 0.62
      const d =
        `M${poleX - poleW / 2} ${flagTop} ` +
        `L${poleX + poleW / 2} ${flagTop} ` +
        `L${poleX + poleW / 2} ${cy + r} ` +
        `L${poleX - poleW / 2} ${cy + r} Z ` +
        `M${poleX + poleW / 2} ${flagTop} ` +
        `L${flagRight} ${flagSlant} ` +
        `L${flagRight} ${flagBottom} ` +
        `L${poleX + poleW / 2} ${flagBottom} Z`
      return `<path d="${d}" fill="${fill}"/>`
    }
    case 'ring': {
      // 缺口圆环：外弧 + 内弧反向闭合；缺口由 gapPosition 指定（0=12 点，顺时针）
      const outer = r
      const inner = r * 0.84 // 线宽 ≈ 8% 外径（88px 基准 → 约 7px）
      const gapDeg = 24 // 缺口角宽
      const centerDeg = ((gapPosition ?? 0) % 12) * 30
      return ringArcPath(cx, cy, outer, inner, centerDeg - gapDeg / 2, centerDeg + gapDeg / 2, fill)
    }
    default:
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
  }
}

/** 带缺口的圆环 path：从 gapEnd 顺时针画外弧到 gapStart+360，再内弧闭合 */
function ringArcPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  gapStartDeg: number,
  gapEndDeg: number,
  fill: string,
): string {
  const toXY = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`
  }
  const startOuter = toXY(outer, gapEndDeg)
  const endOuter = toXY(outer, gapStartDeg + 360)
  const startInner = toXY(inner, gapStartDeg + 360)
  const endInner = toXY(inner, gapEndDeg)
  const sweep = 1 // 顺时针
  return (
    `<path d="` +
    `M ${startOuter} ` +
    `A ${outer} ${outer} 0 1 ${sweep} ${endOuter} ` +
    `L ${startInner} ` +
    `A ${inner} ${inner} 0 1 0 ${endInner} ` +
    `Z" fill="${fill}"/>`
  )
}

/** 内部标记点（小圆点）：钟面方位，定位半径 = 图元外径 27%，随 rotate 共同旋转。
 *  必须与主体颜色高对比（白填充 + 深描边，任意底色下可辨），点径约 10% 图元外径
 *  （88px 基准 → 约 8.8 CSS px，设计稿 §3.4）。 */
function internalMarkSvg(cell: CrtCellSpec, cx: number, cy: number, size: number): string {
  const markDeg = ((cell.internalMarkPosition ?? 0) % 12) * 30
  const rad = ((markDeg - 90) * Math.PI) / 180
  const markRadius = size * 0.27
  const mx = cx + markRadius * Math.cos(rad)
  const my = cy + markRadius * Math.sin(rad)
  const markR = Math.max(3.2, size * 0.1)
  return (
    `<circle cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="${markR.toFixed(2)}" ` +
    `fill="#ffffff" stroke="#111827" stroke-width="1.5"/>`
  )
}

/** 渲染单图元（含 internalMark → scale → rotate → mirror 的固定变换顺序） */
function renderSingleCell(cell: CrtCellSpec, cx: number, cy: number, baseSize: number): string {
  const scale = cell.scale ?? 1
  const size = baseSize * scale
  const fill = colorOf(cell)

  let inner = shapePath(cell.shape, cx, cy, size, fill, cell.gapPosition)
  if (cell.internalMarkPosition !== undefined) {
    inner += internalMarkSvg(cell, cx, cy, size)
  }

  const transforms: string[] = []
  if (cell.rotate) {
    transforms.push(`rotate(${cell.rotate} ${cx} ${cy})`)
  }
  if (cell.mirrorX) {
    transforms.push(`translate(${cx} ${cy}) scale(-1 1) translate(${-cx} ${-cy})`)
  }
  if (cell.mirrorY) {
    transforms.push(`translate(${cx} ${cy}) scale(1 -1) translate(${-cx} ${-cy})`)
  }
  return transforms.length > 0 ? `<g transform="${transforms.join(' ')}">${inner}</g>` : inner
}

/** 渲染一个格子内容（含 count 多图元横向排列 / secondary 双图元布局） */
function renderCellContent(cell: CrtCellSpec, cx: number, cy: number, baseSize: number): string {
  // 双图元布局（题16 等）：显式坐标，禁止整体 SVG mirror
  if (cell.secondary && cell.layout) {
    return renderDualLayout(cell, baseSize)
  }

  const count = Math.max(1, cell.count ?? 1)
  if (count === 1) {
    return renderSingleCell(cell, cx, cy, baseSize)
  }

  // 多个图元横向排列
  const each = baseSize * 0.5 * (cell.scale ?? 1)
  const gap = baseSize * 0.55
  const startX = cx - (gap * (count - 1)) / 2
  const items: string[] = []
  for (let i = 0; i < count; i++) {
    items.push(renderSingleCell({ ...cell, count: 1, scale: 1 }, startX + i * gap, cy, each))
  }
  return items.join('')
}

/** 双图元布局（viewBox 100×100 局部坐标，图元外径 ≈ baseSize×0.5）：
 *  diagonal_down：主图元左上 (25,25) + 次图元右下 (75,75)
 *  diagonal_up：主图元右上 (75,25) + 次图元左下 (25,75)
 *  swapped_diagonal_down：主图元右下 (75,75) + 次图元左上 (25,25)
 *  中心距 ≈ 70.7 单位，图元外径 ≈ 39.3 单位（baseSize=78.6），不重叠。
 */
function renderDualLayout(cell: CrtCellSpec, baseSize: number): string {
  const secondary = cell.secondary!
  const size = baseSize * 0.5
  let primaryPos: [number, number]
  let secondaryPos: [number, number]
  switch (cell.layout) {
    case 'diagonal_up':
      primaryPos = [75, 25]
      secondaryPos = [25, 75]
      break
    case 'swapped_diagonal_down':
      primaryPos = [75, 75]
      secondaryPos = [25, 25]
      break
    case 'diagonal_down':
    default:
      primaryPos = [25, 25]
      secondaryPos = [75, 75]
      break
  }
  const primary = renderSingleCell({ ...cell, secondary: undefined, layout: undefined }, primaryPos[0], primaryPos[1], size)
  const secondarySvg = renderSingleCell(
    {
      shape: secondary.shape,
      color: secondary.color,
      rotate: secondary.rotate,
      scale: secondary.scale,
      mirrorX: secondary.mirrorX,
    },
    secondaryPos[0],
    secondaryPos[1],
    size,
  )
  return primary + secondarySvg
}

/** 渲染单格图元为完整 SVG（用于选项图）。
 *  图元外径占 viewBox 78.6%：配合答题板 112×112 CSS px 的 <img>，
 *  实际渲染图元外径 = 112 × 0.786 ≈ 88 CSS px（视知觉筛查任务渲染规格 v4 §3.4，
 *  目标与选项图元基准尺寸统一）。 */
export function renderOptionSvg(cell: CrtCellSpec): string {
  const content = renderCellContent(cell, 50, 50, 78.6)
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
