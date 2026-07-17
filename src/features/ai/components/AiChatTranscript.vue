<script setup lang="ts">
import type { AiAttachmentRef } from '@/database/ai-api'
import { aiAttachmentManager } from '@/utils/ai-attachment-manager'
import { resolveAbsolutePath } from '@/utils/resource-file-service'
import { renderMarkdown } from '@/utils/render-markdown'
import type { ToolStep } from '@/services/ai-tools'

export interface AiTranscriptMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  pending?: boolean
  attachments?: AiAttachmentRef[] | null
}

const props = withDefaults(
  defineProps<{
    messages: AiTranscriptMessage[]
    toolSteps?: ToolStep[]
  }>(),
  {
    toolSteps: () => [],
  },
)

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'])
function isImageExt(fileType: string): boolean {
  return IMAGE_EXTS.has((fileType || '').toLowerCase())
}

async function openAttachment(ref: AiAttachmentRef) {
  try {
    const abs = await resolveAbsolutePath(ref.rel)
    await window.electronAPI.openFile(abs)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div class="ai-transcript">
    <div
      v-for="(msg, idx) in messages"
      :key="idx"
      class="msg-row"
      :class="msg.role === 'user' ? 'is-user' : 'is-assistant'"
    >
      <div class="msg-bubble" :class="{ pending: msg.pending }">
        <div v-if="msg.pending && toolSteps.length > 0" class="tool-steps">
          <div
            v-for="(step, sIdx) in toolSteps"
            :key="sIdx"
            class="tool-step"
            :class="{ failed: !step.ok }"
          >🔧 {{ step.label }}{{ step.ok ? '' : '（失败）' }}</div>
        </div>
        <div v-if="msg.attachments && msg.attachments.length > 0" class="att-row">
          <template v-for="(a, aIdx) in msg.attachments" :key="aIdx">
            <img v-if="isImageExt(a.fileType)" :src="aiAttachmentManager.getFileUrl(a)" />
            <span
              v-else
              class="att-doc"
              :title="`打开原件：${a.fileName}`"
              @click="openAttachment(a)"
            >📄 {{ a.fileName }}</span>
          </template>
        </div>
        <template v-if="msg.role === 'user'">{{ msg.content }}</template>
        <div v-else class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
        <span v-if="msg.pending" class="streaming-cursor" aria-hidden="true"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-transcript {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-row {
  display: flex;
}

.msg-row.is-user {
  justify-content: flex-end;
}

.msg-row.is-assistant {
  justify-content: flex-start;
}

.msg-bubble {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.is-user .msg-bubble {
  background: var(--el-color-primary, #409eff);
  color: #fff;
  border-bottom-right-radius: 2px;
}

.is-assistant .msg-bubble {
  max-width: 90%;
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-primary, #303133);
  border-bottom-left-radius: 2px;
}

.msg-bubble.pending {
  opacity: 0.85;
}

.markdown-body {
  white-space: normal;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 0.6em 0 0.3em;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-body :deep(h1) { font-size: 1.25em; }
.markdown-body :deep(h2) { font-size: 1.15em; }
.markdown-body :deep(h3) { font-size: 1.05em; }
.markdown-body :deep(p) { margin: 0.3em 0; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { margin: 0.3em 0; padding-left: 1.4em; }
.markdown-body :deep(li) { margin: 0.15em 0; }
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
  font-size: 0.92em;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--el-border-color, #dcdfe6);
  padding: 4px 8px;
  text-align: left;
  white-space: normal;
}

.markdown-body :deep(th) {
  background: var(--el-fill-color-light, #f5f7fa);
  font-weight: 600;
}

.markdown-body :deep(pre) {
  background: var(--el-fill-color-dark, #e9e9eb);
  border-radius: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  margin: 0.5em 0;
  font-size: 0.88em;
}

.markdown-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--el-fill-color, #f5f7fa);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: inherit;
}

.markdown-body :deep(blockquote) {
  margin: 0.4em 0;
  padding-left: 0.8em;
  border-left: 3px solid var(--el-border-color, #dcdfe6);
  color: var(--el-text-color-secondary, #909399);
}

.markdown-body :deep(a) {
  color: var(--el-color-primary, #409eff);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--el-border-color, #dcdfe6);
  margin: 0.6em 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

.streaming-cursor {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--el-color-primary, #409eff);
  border-radius: 1px;
  animation: ai-cursor-blink 1s infinite;
}

@keyframes ai-cursor-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

.tool-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--el-border-color, #dcdfe6);
}

.tool-step {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.tool-step.failed {
  color: var(--el-color-danger, #f56c6c);
}

.att-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.att-row img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}

.att-doc {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid currentColor;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.85;
}

.att-doc:hover {
  opacity: 1;
}
</style>
