import teachingAvatar from '@/assets/ai-agent-avatars/个别化教学专家.png'
import communicationAvatar from '@/assets/ai-agent-avatars/课堂沟通支持专家.png'
import observationAvatar from '@/assets/ai-agent-avatars/成长观察助手.png'
import familyAvatar from '@/assets/ai-agent-avatars/家校沟通助手.png'
import wellbeingAvatar from '@/assets/ai-agent-avatars/情绪支持助手.png'

const BUILTIN_AGENT_AVATAR_MAP: Record<string, string> = {
  special_ed_teacher: teachingAvatar,
  scgp_builtin_communication_support: communicationAvatar,
  scgp_builtin_growth_observer: observationAvatar,
  scgp_builtin_family_communication: familyAvatar,
  scgp_builtin_wellbeing_support: wellbeingAvatar,
}

export function getBuiltinAgentAvatarUrl(code: string): string | null {
  return BUILTIN_AGENT_AVATAR_MAP[code] || null
}
