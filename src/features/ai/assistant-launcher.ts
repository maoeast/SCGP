export const AI_ASSISTANT_OPEN_EVENT = 'scgp:ai-assistant:open'

export interface AiAssistantOpenDetail {
  agentCode?: string
}

/** 从任意业务页面打开全局 AI 助手，可同时指定本次新对话使用的智能体。 */
export function openAiAssistant(agentCode?: string) {
  window.dispatchEvent(
    new CustomEvent<AiAssistantOpenDetail>(AI_ASSISTANT_OPEN_EVENT, {
      detail: { agentCode },
    }),
  )
}
