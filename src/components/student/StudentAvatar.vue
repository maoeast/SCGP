<template>
  <div
    class="student-avatar"
    :class="[
      `student-avatar--${props.size}`,
      `student-avatar--${tone}`
    ]"
  >
    <img v-if="displayAvatarUrl" :src="displayAvatarUrl" :alt="altText" />
    <span v-else>{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getStudentInitial,
  normalizeStudentGender,
  resolveStudentAvatarUrl,
} from '@/utils/student-display'

type StudentAvatarSize = 'sm' | 'md' | 'lg'
type StudentAvatarGender = 'male' | 'female' | '男' | '女'

const props = withDefaults(defineProps<{
  name?: string
  gender?: StudentAvatarGender
  avatarUrl?: string
  size?: StudentAvatarSize
}>(), {
  name: '',
  gender: undefined,
  avatarUrl: '',
  size: 'md',
})

const displayAvatarUrl = computed(() => resolveStudentAvatarUrl(props.avatarUrl))
const initial = computed(() => getStudentInitial(props.name))
const tone = computed(() => normalizeStudentGender(props.gender))
const altText = computed(() => `${props.name || '学生'}头像`)
</script>

<style scoped>
.student-avatar {
  border-radius: 999px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.student-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.student-avatar span {
  font-weight: 700;
}

.student-avatar--sm {
  width: 28px;
  height: 28px;
}

.student-avatar--sm span {
  font-size: 13px;
}

.student-avatar--md {
  width: 40px;
  height: 40px;
}

.student-avatar--md span {
  font-size: 16px;
}

.student-avatar--lg {
  width: 80px;
  height: 80px;
}

.student-avatar--lg span {
  font-size: 36px;
}

.student-avatar--male {
  background: #E6F1FB;
  color: #185FA5;
}

.student-avatar--female {
  background: #FBEAF0;
  color: #993556;
}

.student-avatar--neutral {
  background: #EDF4FF;
  color: #486A93;
}
</style>
