import teachingAvatar from '@/assets/ai-agent-avatars/teaching.svg?url'
import communicationAvatar from '@/assets/ai-agent-avatars/communication.svg?url'
import observationAvatar from '@/assets/ai-agent-avatars/observation.svg?url'
import familyAvatar from '@/assets/ai-agent-avatars/family.svg?url'
import wellbeingAvatar from '@/assets/ai-agent-avatars/wellbeing.svg?url'

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
