<script setup lang="ts">
import { computed } from 'vue'
import { getBuiltinAgentPreset } from '@/data/ai-agent-presets'
import { getBuiltinAgentAvatarUrl } from '@/features/ai/ai-agent-avatar-assets'

const props = withDefaults(
  defineProps<{
    agentCode: string
    agentName?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    agentName: '',
    size: 'md',
  },
)

const preset = computed(() => getBuiltinAgentPreset(props.agentCode))
const avatarUrl = computed(() => getBuiltinAgentAvatarUrl(props.agentCode))
const fallbackText = computed(() => {
  if (preset.value?.avatarText) return preset.value.avatarText
  return props.agentName.trim().slice(0, 1) || '智'
})
const tone = computed(() => preset.value?.avatarTone ?? 'custom')
</script>

<template>
  <span class="ai-agent-avatar" :class="[`ai-agent-avatar--${size}`, `ai-agent-avatar--${tone}`]" aria-hidden="true">
    <img v-if="avatarUrl" :src="avatarUrl" :alt="`${agentName || preset?.name || '智能体'}头像`" />
    <span v-else>{{ fallbackText }}</span>
  </span>
</template>

<style scoped>
.ai-agent-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 14px;
  outline: 1px solid rgb(31 35 41 / 8%);
  outline-offset: -1px;
  background: var(--el-fill-color-light, #f2f3f5);
}

.ai-agent-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ai-agent-avatar span {
  font-weight: 700;
  line-height: 1;
}

.ai-agent-avatar--sm {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.ai-agent-avatar--sm span {
  font-size: 16px;
}

.ai-agent-avatar--md {
  width: 52px;
  height: 52px;
}

.ai-agent-avatar--md span {
  font-size: 20px;
}

.ai-agent-avatar--lg {
  width: 64px;
  height: 64px;
  border-radius: 16px;
}

.ai-agent-avatar--lg span {
  font-size: 24px;
}

.ai-agent-avatar--teaching {
  color: #245a9a;
  background: #e9f2ff;
}

.ai-agent-avatar--communication {
  color: #17685a;
  background: #e7f6f2;
}

.ai-agent-avatar--observation {
  color: #8a5a12;
  background: #fff3dc;
}

.ai-agent-avatar--family {
  color: #8a4936;
  background: #f7ece8;
}

.ai-agent-avatar--wellbeing {
  color: #5f4b8b;
  background: #f0edf9;
}

.ai-agent-avatar--custom {
  color: var(--el-text-color-regular, #606266);
  background: var(--el-fill-color-light, #f2f3f5);
}
</style>
