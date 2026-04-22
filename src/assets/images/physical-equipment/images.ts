import type { PhysicalEquipmentDomain } from '@/types/physical-equipment'

const imageModules = import.meta.glob<{ default: string }>('./**/*.webp', { eager: true })

const DOMAIN_COLORS: Record<PhysicalEquipmentDomain, string> = {
  'emotional-regulation': '#e67e22',
  'social-communication': '#3498db',
  'fine-motor': '#27ae60',
  'soothing-aids': '#8e44ad',
  'daily-living': '#e74c3c',
}

function generatePlaceholderUrl(domain: PhysicalEquipmentDomain, name: string): string {
  const color = DOMAIN_COLORS[domain] || '#95a5a6'
  const firstChar = name.trim().charAt(0) || '?'

  const svg = `
    <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="24" fill="${color}"/>
      <text x="64" y="78" font-size="48" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${firstChar}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function getPhysicalEquipmentImageUrl(
  domain: PhysicalEquipmentDomain,
  resourceCode: string,
  name: string
): string {
  const imageName = `./${domain}/${resourceCode}.webp`

  if (imageName in imageModules) {
    return imageModules[imageName]?.default || generatePlaceholderUrl(domain, name)
  }

  return generatePlaceholderUrl(domain, name)
}
