import { resolvePresetResourceUrl } from '@/utils/preset-resource'

// 内置智能体头像已统一迁至 assets/resources/images/ai-agent-avatars/，运行时经 resource:// 解析。
// 路径常量在调用时解析（与器材图片解析器同模式），确保 window.electronAPI 就绪后再求值。

const BUILTIN_AGENT_AVATAR_PATHS: Record<string, string> = {
  special_ed_teacher: 'images/ai-agent-avatars/个别化教学专家.png',
  scgp_builtin_communication_support: 'images/ai-agent-avatars/课堂沟通支持专家.png',
  scgp_builtin_growth_observer: 'images/ai-agent-avatars/成长观察助手.png',
  scgp_builtin_family_communication: 'images/ai-agent-avatars/家校沟通助手.png',
  scgp_builtin_wellbeing_support: 'images/ai-agent-avatars/情绪支持助手.png',
}

export function getBuiltinAgentAvatarUrl(code: string): string | null {
  const path = BUILTIN_AGENT_AVATAR_PATHS[code]
  return path ? resolvePresetResourceUrl(path) : null
}
