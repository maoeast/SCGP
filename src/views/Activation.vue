<template>
  <main
    class="activation-page"
    :class="{ 'is-dragging': isDragging }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="aurora" :class="{ paused: isPageHidden }" aria-hidden="true">
      <div class="aurora-blob aurora-blob--teal"></div>
      <div class="aurora-blob aurora-blob--green"></div>
      <div class="aurora-blob aurora-blob--blue"></div>
      <div class="aurora-blob aurora-blob--violet"></div>
      <div class="aurora-curtain"></div>
      <div class="aurora-vignette"></div>
    </div>
    <article class="activation-card" aria-labelledby="activation-title" :aria-busy="isActivating">
      <header class="activation-header">
        <div class="product-row">
          <img v-if="productLogo" :src="productLogo" alt="" class="product-logo" />
          <div class="product-identity">
            <span class="product-name">{{ config.product.name }}</span
            ><span class="version">v{{ appVersion }}</span>
          </div>
          <span class="status-badge" :class="status.tone">{{ status.label }}</span>
        </div>
        <h1 id="activation-title">{{ activationSucceeded ? '激活成功' : '激活软件' }}</h1>
        <p v-if="activationSucceeded" class="intro">授权已保存，可以开始使用软件。</p>
      </header>
      <template v-if="!activationSucceeded">
        <section class="step" aria-labelledby="machine-title">
          <h2 id="machine-title">
            <span class="step-number" aria-hidden="true">1</span>获取机器码并发给供应商
          </h2>
          <div class="machine-block">
            <code class="machine-code" aria-label="当前电脑机器码">{{
              groupedMachineCode || '正在获取…'
            }}</code>
            <div class="machine-actions">
              <button
                type="button"
                class="secondary-button"
                :disabled="!machineCode"
                @click="copyText(machineCode, 'machine')"
              >
                {{ copied === 'machine' ? '已复制 ✓' : '复制机器码' }}
              </button>
              <button
                type="button"
                class="text-button"
                :disabled="!machineCode"
                @click="copyText(supplierMessage, 'supplier')"
              >
                {{ copied === 'supplier' ? '已复制 ✓' : '复制发给供应商的信息' }}
              </button>
            </div>
          </div>
        </section>
        <section class="step" aria-labelledby="code-title">
          <h2 id="code-title"><span class="step-number" aria-hidden="true">2</span>输入激活码</h2>
          <form novalidate @submit.prevent="handleActivation">
            <label class="sr-only" for="activation-code">激活码</label>
            <div class="input-row">
              <input
                id="activation-code"
                ref="activationCodeInputRef"
                autofocus
                :value="activationCode"
                type="text"
                placeholder="请输入激活码"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                :disabled="isActivating"
                :aria-invalid="Boolean(formatError || failure)"
                aria-describedby="code-hint activation-feedback"
                @input="onCodeInput"
              />
              <button
                type="button"
                class="text-button"
                :disabled="isActivating"
                @click="pasteActivationCode"
              >
                粘贴
              </button>
              <button
                type="button"
                class="text-button"
                :disabled="isActivating"
                @click="licenseFileInputRef?.click()"
              >
                导入文件
              </button>
            </div>
            <input
              ref="licenseFileInputRef"
              class="sr-only"
              tabindex="-1"
              type="file"
              accept=".lic,.txt,text/plain"
              :disabled="isActivating"
              @change="handleLicenseFileImport"
            />
            <p v-show="!failure" id="code-hint" class="hint">
              格式示例：SPED-…（保留正文大小写）；也可拖入 .lic / .txt 文件。
            </p>
            <div id="activation-feedback" class="feedback" aria-live="polite" aria-atomic="true">
              <p v-if="formatError" class="error" role="alert">{{ formatError }}</p>
              <div v-else-if="failure" class="error" role="alert">
                <span>{{ failure }}</span>
                <button type="button" class="text-button support-link" @click="focusSupport">
                  联系客服
                </button>
              </div>
              <p v-else-if="notice" class="notice">{{ notice }}</p>
            </div>
            <button
              type="submit"
              class="primary-button"
              :disabled="!activationCode || isActivating"
            >
              {{ isActivating ? '验证中…' : '验证激活码' }}
            </button>
          </form>
        </section>
        <details class="faq">
          <summary>常见问题</summary>
          <ul>
            <li v-for="item in config.faq" :key="item">{{ item }}</li>
          </ul>
        </details>
      </template>
      <section v-else class="success-panel" aria-label="授权信息" aria-live="polite">
        <span class="success-mark" aria-hidden="true">✓</span>
        <h2>此电脑已完成激活</h2>
        <dl class="license-summary">
          <div>
            <dt>授权类型</dt>
            <dd>{{ expiresAt ? '限时授权' : '永久授权' }}</dd>
          </div>
          <div>
            <dt>到期日期</dt>
            <dd>{{ expiresAt ? formatDate(expiresAt) : '永久有效' }}</dd>
          </div>
          <div>
            <dt>剩余天数</dt>
            <dd>{{ expiresAt ? `${daysRemaining} 天` : '不限天数' }}</dd>
          </div>
          <div>
            <dt>绑定设备后 4 位</dt>
            <dd class="device-suffix">{{ machineCode.slice(-4) }}</dd>
          </div>
        </dl>
        <p v-if="expiresAt && daysRemaining <= 30" class="expiry-reminder">
          授权将在 {{ daysRemaining }} 天后到期，可提前联系供应商续期。
        </p>
        <button type="button" class="primary-button" @click="router.push('/login')">
          进入软件
        </button>
      </section>
      <footer class="support" aria-label="客户支持">
        <div class="support-heading">
          <strong>{{ config.support.company }}</strong
          ><button
            ref="supportButtonRef"
            type="button"
            class="text-button"
            @click="copyText(config.support.phone, 'phone')"
          >
            热线 {{ config.support.phone }} · {{ copied === 'phone' ? '已复制 ✓' : '复制' }}
          </button>
        </div>
        <div class="support-details">
          <span v-if="config.support.hours">工作时间：{{ config.support.hours }}</span>
          <span v-if="config.support.wechat">微信：{{ config.support.wechat }}</span>
        </div>
        <div class="footer-actions">
          <span class="clipboard-status" role="status">{{ clipboardNotice }}</span
          ><button
            type="button"
            class="text-button exit-button"
            :disabled="isActivating"
            @click="exitApp"
          >
            退出软件
          </button>
        </div>
      </footer>
    </article>
    <div v-if="isDragging" class="drop-overlay" aria-live="polite">松开鼠标，导入激活文件</div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSystemConfigStore } from '@/stores/systemConfig'
import { extractLicenseKeyFromFile, isLikelyLicenseKey } from '@/utils/license-file'
import { activationPageConfig as config } from '@/config/activation-page'

const router = useRouter()
const authStore = useAuthStore()
const systemConfigStore = useSystemConfigStore()
const activationCode = ref('')
const isActivating = ref(false)
const activationSucceeded = ref(false)
const licenseFileInputRef = ref<HTMLInputElement | null>(null)
const activationCodeInputRef = ref<HTMLInputElement | null>(null)
const isPageHidden = ref(document.hidden)
const syncAuroraVisibility = () => {
  isPageHidden.value = document.hidden
}
let hasPageInteraction = false
const markPageInteraction = () => {
  hasPageInteraction = true
}
const focusInitialInput = () => {
  if (!hasPageInteraction) activationCodeInputRef.value?.focus({ preventScroll: true })
}
const onInitialDocumentFocus = (event: FocusEvent) => {
  // Electron 恢复内容区焦点时可能选择首个按钮；仅在用户尚未操作时纠正。
  const target = event.target
  if (
    target instanceof HTMLElement &&
    target !== activationCodeInputRef.value &&
    target.closest('.activation-card')
  )
    focusInitialInput()
}
const supportButtonRef = ref<HTMLButtonElement | null>(null)
const appVersion = ref<string>(config.product.version)
const failure = ref('')
const notice = ref('')
const clipboardNotice = ref('')
const copied = ref('')
const isDragging = ref(false)
let dragDepth = 0
let copyTimer: ReturnType<typeof setTimeout> | undefined
const machineCode = computed(() => authStore.activationInfo.machineCode || '')
const groupedMachineCode = computed(() => machineCode.value.match(/.{1,4}/g)?.join(' ') || '')
const productLogo = computed(() =>
  config.product.useSystemLogo ? systemConfigStore.displayLogoPath : config.product.logo,
)
const expiresAt = computed(() => authStore.activationInfo.expiresAt)
const daysRemaining = computed(() =>
  expiresAt.value
    ? Math.max(0, Math.ceil((new Date(expiresAt.value).getTime() - Date.now()) / 86400000))
    : 0,
)
const status = computed(() => {
  const expiry = expiresAt.value || authStore.activationInfo.trialEnd
  if (expiry && new Date(expiry).getTime() <= Date.now())
    return { label: '已过期', tone: 'expired' }
  if (authStore.activationInfo.isActivated || activationSucceeded.value) {
    if (expiresAt.value && daysRemaining.value <= 30) return { label: '即将到期', tone: 'expiring' }
    return { label: '已激活', tone: 'active' }
  }
  return { label: '未激活', tone: 'inactive' }
})
const supplierMessage = computed(
  () =>
    `软件名称：${config.product.name}\n版本：${appVersion.value}\n机器码：${machineCode.value}\n请为此电脑提供激活码，谢谢。`,
)
const formatError = computed(() =>
  activationCode.value && !isLikelyLicenseKey(activationCode.value)
    ? '请检查激活码是否复制完整（应以 SPED- 开头）。'
    : '',
)

// 仅清理输入外观。正文是大小写敏感的 Base64，不能整串转大写。
function normalizeCode(value: string): string {
  return value
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[\r\n\u200B-\u200F\u2060\uFEFF]/g, '')
    .trim()
    .replace(/^sped-/i, 'SPED-')
}
function setCode(value: string) {
  activationCode.value = normalizeCode(value)
  failure.value = ''
  notice.value = ''
}
function onCodeInput(event: Event) {
  const input = event.target as HTMLInputElement
  setCode(input.value)
  input.value = activationCode.value
}
// 只根据现有调用返回的消息展示原因，不解析许可证、不补造被底层合并的错误类型。
function failureMessage(message: string): string {
  if (/格式|复制完整/.test(message)) return '请检查激活码是否复制完整，再粘贴重试。'
  if (/机器码不匹配|当前机器.*不匹配|其他机器|不是为这台电脑/.test(message))
    return '该激活码不是为这台电脑生成的，请确认发送给供应商的是当前机器码。'
  if (/过期/.test(message)) return '激活码已过期，请联系供应商申请续期激活码。'
  if (/签名|篡改/.test(message))
    return '激活文件可能已损坏或被篡改，请联系供应商重新发送原始激活文件。'
  if (/无效|损坏/.test(message))
    return '激活码无效或已损坏。请重新复制完整激活码，核对当前机器码；仍有问题请联系客服。'
  return `${message || '暂时无法完成验证'}。请重试，或联系客服。`
}
async function handleActivation() {
  if (!activationCode.value || isActivating.value || formatError.value) return
  isActivating.value = true
  failure.value = ''
  notice.value = ''
  try {
    const result = await authStore.validateActivationCodeWithMessage(activationCode.value)
    if (result.success) activationSucceeded.value = true
    else failure.value = failureMessage(result.message)
  } catch (error) {
    failure.value = failureMessage(error instanceof Error ? error.message : '验证暂时不可用')
  } finally {
    isActivating.value = false
  }
}
async function copyText(text: string, target: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = target
    clipboardNotice.value = ''
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = ''
    }, 2000)
  } catch {
    clipboardNotice.value = '复制失败，请手动选中内容复制。'
  }
}
async function pasteActivationCode() {
  try {
    setCode(await navigator.clipboard.readText())
  } catch {
    notice.value = '无法读取剪贴板，请在输入框中按 Ctrl+V 粘贴。'
  }
}
async function importFile(file?: File) {
  if (!file || isActivating.value) return
  failure.value = ''
  notice.value = ''
  try {
    // 沿用原有文件提取器；仅先清理文本中的全角、换行及零宽字符。
    // 摘要文件的换行仍是字段分隔符，逐行清理，避免把下一字段接进激活码。
    const cleanText = (await file.text()).split(/\r?\n/).map(normalizeCode).join('\n')
    const cleanFile = new File([cleanText], file.name, { type: file.type })
    setCode(await extractLicenseKeyFromFile(cleanFile))
    notice.value = '已读取激活码，请点击“验证激活码”。'
  } catch (error) {
    failure.value = `无法导入：${error instanceof Error ? error.message : '文件读取失败'}。请使用供应商发送的原始文件。`
  }
}
async function handleLicenseFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  await importFile(input.files?.[0])
  input.value = ''
}
function onDragEnter(event: DragEvent) {
  if (
    event.dataTransfer?.types.includes('Files') &&
    !isActivating.value &&
    !activationSucceeded.value
  ) {
    dragDepth++
    isDragging.value = true
  }
}
function onDragOver(event: DragEvent) {
  if (event.dataTransfer)
    event.dataTransfer.dropEffect =
      isActivating.value || activationSucceeded.value ? 'none' : 'copy'
}
function onDragLeave() {
  if (--dragDepth <= 0) {
    dragDepth = 0
    isDragging.value = false
  }
}
async function onDrop(event: DragEvent) {
  dragDepth = 0
  isDragging.value = false
  if (!activationSucceeded.value) await importFile(event.dataTransfer?.files[0])
}
function focusSupport() {
  supportButtonRef.value?.focus()
}
function exitApp() {
  window.close()
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN')
}
onMounted(async () => {
  syncAuroraVisibility()
  document.addEventListener('visibilitychange', syncAuroraVisibility)
  document.addEventListener('focusin', onInitialDocumentFocus)
  document.addEventListener('pointerdown', markPageInteraction, { once: true, capture: true })
  document.addEventListener('keydown', markPageInteraction, { once: true, capture: true })
  // 保留原有状态检查与已激活跳转。
  systemConfigStore.loadConfig()
  try {
    await authStore.checkActivation()
    if (authStore.activationInfo.isActivated) router.push('/login')
  } catch {
    failure.value = '无法读取本机激活状态，请重试或联系客服。'
  }
  try {
    const version = await window.electronAPI?.getAppVersion()
    if (version) appVersion.value = version
  } catch {
    /* 展示版本读取失败时使用配置中的构建版本。 */
  }
  await nextTick()
  focusInitialInput()
})
onUnmounted(() => {
  clearTimeout(copyTimer)
  document.removeEventListener('visibilitychange', syncAuroraVisibility)
  document.removeEventListener('focusin', onInitialDocumentFocus)
  document.removeEventListener('pointerdown', markPageInteraction, true)
  document.removeEventListener('keydown', markPageInteraction, true)
})
</script>

<style>
:root {
  /* 数值越大越慢；亮度建议在 0.45 至 0.65 之间。 */
  --aurora-speed: 1;
  --aurora-intensity: 0.58;
  --aurora-teal: #2dd4bf;
  --aurora-green: #34d399;
  --aurora-blue: #38bdf8;
  --aurora-violet: #818cf8;
  --aurora-base: linear-gradient(160deg, #04121c 0%, #071f2e 50%, #0a1a2b 100%);
}
</style>

<style scoped>
.aurora {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  isolation: isolate;
  background: var(--aurora-base);
}
.aurora-blob {
  position: absolute;
  width: 64vw;
  height: 64vw;
  border-radius: 50%;
  filter: blur(70px);
  mix-blend-mode: screen;
  opacity: var(--aurora-intensity);
  will-change: transform;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}
.aurora-blob--teal {
  left: -20vw;
  top: -32vw;
  background: radial-gradient(circle, var(--aurora-teal), transparent 68%);
  animation-name: aurora-teal-drift;
  animation-duration: calc(28s * var(--aurora-speed));
  animation-delay: -11s;
}
.aurora-blob--green {
  left: -15vw;
  bottom: -43vw;
  background: radial-gradient(circle, var(--aurora-green), transparent 67%);
  animation-name: aurora-green-drift;
  animation-duration: calc(34s * var(--aurora-speed));
  animation-delay: -23s;
}
.aurora-blob--blue {
  right: -20vw;
  top: -26vw;
  background: radial-gradient(circle, var(--aurora-blue), transparent 68%);
  animation-name: aurora-blue-drift;
  animation-duration: calc(26s * var(--aurora-speed));
  animation-delay: -17s;
}
.aurora-blob--violet {
  right: -18vw;
  bottom: -42vw;
  background: radial-gradient(circle, var(--aurora-violet), transparent 68%);
  animation-name: aurora-violet-drift;
  animation-duration: calc(38s * var(--aurora-speed));
  animation-delay: -29s;
}
.aurora-curtain {
  position: absolute;
  inset: -20% -35%;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 13px,
    var(--aurora-teal) 14px,
    transparent 17px 30px
  );
  mask-image: linear-gradient(to bottom, transparent, #000 40%, transparent);
  transform: skewX(-12deg);
  opacity: 0.09;
  will-change: transform;
  animation: aurora-curtain-drift calc(48s * var(--aurora-speed)) ease-in-out -19s infinite
    alternate;
}
.aurora-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 24%, rgba(1, 7, 16, 0.65) 100%);
}
.aurora.paused .aurora-blob,
.aurora.paused .aurora-curtain {
  animation-play-state: paused;
}
@keyframes aurora-teal-drift {
  from {
    transform: translate(-4vw, -2vw) scale(0.95) rotate(-8deg);
  }
  to {
    transform: translate(12vw, 10vw) scale(1.08) rotate(8deg);
  }
}
@keyframes aurora-green-drift {
  from {
    transform: translate(2vw, 0) scale(1.04) rotate(6deg);
  }
  to {
    transform: translate(17vw, -11vw) scale(0.94) rotate(-7deg);
  }
}
@keyframes aurora-blue-drift {
  from {
    transform: translate(5vw, 5vw) scale(1.08) rotate(7deg);
  }
  to {
    transform: translate(-11vw, 15vw) scale(0.96) rotate(-6deg);
  }
}
@keyframes aurora-violet-drift {
  from {
    transform: translate(-2vw, 3vw) scale(0.96) rotate(-7deg);
  }
  to {
    transform: translate(-16vw, -9vw) scale(1.1) rotate(6deg);
  }
}
@keyframes aurora-curtain-drift {
  from {
    transform: translateX(-7vw) skewX(-12deg);
  }
  to {
    transform: translateX(7vw) skewX(-12deg);
  }
}
.activation-page {
  --primary: #0f766e;
  --ink: #203b39;
  --muted: #5b6b6b;
  height: 100dvh;
  overflow-y: auto;
  display: flex;
  padding: 20px;
  position: relative;
  isolation: isolate;
  background: #04121c;
  color: var(--ink);
  font:
    14px/1.5 'Microsoft YaHei',
    'PingFang SC',
    sans-serif;
}
.activation-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  margin: auto;
  padding: 24px 28px 16px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  border-radius: 16px;
}
.product-row,
.product-identity,
.machine-actions,
.input-row,
.support-heading,
.footer-actions {
  display: flex;
  align-items: center;
}
.product-row {
  gap: 10px;
}
.product-logo {
  width: auto;
  height: 32px;
  flex-shrink: 0;
  object-fit: contain;
}
.product-identity {
  flex: 1;
  gap: 8px;
  flex-wrap: wrap;
}
.product-name {
  font-size: 14px;
  font-weight: 600;
}
.version,
.hint,
.support-details,
.clipboard-status {
  color: var(--muted);
  font-size: 13px;
}
.status-badge {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 600;
}
.inactive {
  color: #9a4309;
  background: #fff1e4;
}
.expired {
  color: #b42318;
  background: #feeceb;
}
.expiring {
  color: #785900;
  background: #fff6ce;
}
.active {
  color: #0f766e;
  background: #e8f4f0;
}
h1 {
  margin: 12px 0 2px;
  font-size: 25px;
  line-height: 1.3;
  font-weight: 700;
}
.intro {
  color: var(--muted);
  font-size: 13px;
}
.step {
  margin-top: 18px;
}
.step h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 9px;
  line-height: 24px;
}
.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
  border-radius: 50%;
  background: #e6f2ef;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.machine-block {
  padding: 12px 14px;
  border: 1px solid #cfdfda;
  border-radius: 8px;
  background: #f4f8f6;
}
.machine-code {
  display: block;
  font:
    600 28px/1.3 Consolas,
    'Courier New',
    monospace;
  letter-spacing: 0.5px;
  color: #173f3a;
  user-select: all;
  white-space: nowrap;
}
.machine-actions {
  gap: 10px;
  margin-top: 9px;
  flex-wrap: wrap;
}
button,
input,
summary {
  font: inherit;
}
button {
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s;
}
button:disabled {
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
summary:focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 3px;
}
.secondary-button {
  padding: 5px 10px;
  border: 1px solid #8db5aa;
  background: #fff;
  color: var(--primary);
  font-size: 13px;
}
.secondary-button:hover:not(:disabled) {
  background: #e5f1ed;
}
.text-button {
  border: 0;
  padding: 4px 2px;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  white-space: nowrap;
}
.text-button:hover:not(:disabled) {
  background: #e9f3ef;
}
.text-button:disabled {
  color: var(--muted);
  opacity: 0.7;
}
.input-row {
  gap: 10px;
}
.input-row input {
  min-width: 0;
  flex: 1;
  width: 100%;
  height: 40px;
  padding: 8px 11px;
  border: 1px solid #9bacaa;
  border-radius: 6px;
  color: var(--ink);
  background: #fff;
  font-size: 14px;
}
.input-row input::placeholder {
  color: var(--muted);
}
.input-row input[aria-invalid='true'] {
  border-color: #b42318;
}
.hint {
  margin-top: 5px;
  line-height: 1.5;
}
.feedback:empty {
  display: none;
}
.feedback {
  margin-top: 5px;
  font-size: 13px;
  animation: result-in 0.15s ease-out;
}
.error {
  color: #b42318;
}
.notice {
  color: var(--primary);
}
.support-link {
  text-decoration: underline;
}
.primary-button {
  width: 100%;
  min-height: 40px;
  margin-top: 12px;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.primary-button:hover:not(:disabled) {
  background: #0b625c;
}
.primary-button:active:not(:disabled) {
  background: #084e49;
}
.primary-button:disabled {
  background: #e5ece9;
  border-color: #d5dfda;
  color: #5b6b6b;
}
.faq {
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
}
.faq summary {
  cursor: pointer;
  width: fit-content;
  padding: 2px 0;
  color: var(--primary);
}
.faq ul {
  padding-left: 20px;
  margin-top: 5px;
}
.support {
  border-top: 1px solid #e1e9e5;
  margin-top: 14px;
  padding-top: 11px;
}
.support-heading {
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.support-heading strong {
  font-size: 13px;
  font-weight: 600;
}
.support-details {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin-top: 3px;
}
.footer-actions {
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
}
.exit-button {
  margin-left: auto;
  color: var(--muted);
}
.success-panel {
  margin-top: 18px;
  text-align: center;
}
.success-mark {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 42px;
  height: 42px;
  color: var(--primary);
  background: #e8f4f0;
  border-radius: 50%;
  font-size: 27px;
}
.success-panel h2 {
  margin: 10px 0 14px;
  font-size: 17px;
  font-weight: 600;
}
.license-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 14px;
  border: 1px solid #dce6e2;
  background: #f5f8f6;
  border-radius: 8px;
  text-align: left;
}
.license-summary dt {
  font-size: 13px;
  color: var(--muted);
}
.license-summary dd {
  margin-top: 3px;
  font-weight: 600;
}
.device-suffix {
  font-family: Consolas, monospace;
}
.expiry-reminder {
  margin-top: 10px;
  padding: 8px;
  background: #fff6ce;
  color: #785900;
  font-size: 13px;
  border-radius: 6px;
}
.drop-overlay {
  position: fixed;
  inset: 16px;
  z-index: 10;
  display: grid;
  place-items: center;
  border: 2px dashed var(--primary);
  background: #edf8f2ed;
  color: var(--primary);
  font-size: 20px;
  pointer-events: none;
  border-radius: 12px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@keyframes result-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (max-height: 600px) {
  .activation-page {
    padding: 8px 16px;
  }
  .activation-card {
    padding: 14px 22px 8px;
    border-radius: 12px;
  }
  h1 {
    font-size: 23px;
    margin-top: 6px;
  }
  .step {
    margin-top: 10px;
  }
  .step h2 {
    margin-bottom: 6px;
  }
  .machine-block {
    padding: 8px 12px;
  }
  .machine-code {
    font-size: 26px;
  }
  .machine-actions {
    margin-top: 4px;
  }
  .primary-button {
    margin-top: 8px;
    min-height: 36px;
  }
  .faq {
    margin-top: 7px;
  }
  .support {
    margin-top: 8px;
    padding-top: 6px;
  }
  .footer-actions {
    margin-top: 1px;
  }
  .success-panel {
    margin-top: 10px;
  }
}
@media (max-height: 520px) and (min-width: 481px) {
  .product-logo {
    height: 28px;
  }
  .step {
    margin-top: 6px;
  }
  .machine-block {
    padding: 6px 12px;
  }
  .secondary-button {
    padding-top: 3px;
    padding-bottom: 3px;
  }
  .primary-button {
    min-height: 34px;
  }
  .success-mark {
    width: 32px;
    height: 32px;
    font-size: 22px;
  }
  .success-panel h2 {
    margin: 6px 0 8px;
  }
  .license-summary {
    padding: 10px;
    gap: 8px;
  }
  .support {
    position: relative;
  }
  .support-details {
    padding-right: 70px;
  }
  .footer-actions {
    display: contents;
  }
  .exit-button {
    position: absolute;
    bottom: -4px;
    right: 0;
  }
  .clipboard-status:not(:empty) {
    display: block;
    padding-right: 70px;
  }
}
@media (max-width: 480px) {
  .activation-page {
    padding: 8px;
  }
  .activation-card {
    padding: 16px;
  }
  .machine-code {
    font-size: clamp(20px, 5.7vw, 26px);
    letter-spacing: 0;
  }
  .product-identity {
    gap: 0 6px;
  }
  .input-row {
    gap: 6px;
  }
  .machine-actions {
    gap: 4px 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
