<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="onVisibilityChange"
    title="评估器材推荐"
    direction="rtl"
    size="540px"
    class="recommendation-drawer"
  >
    <div v-loading="loading" class="rec-content">
      <!-- 无结果空态 -->
      <el-empty
        v-if="!result && !loading"
        description="暂无推荐结果，请从评估完成弹窗点击「器材推荐」生成。"
      />

      <template v-else-if="result">
        <!-- 弱势领域（弱势模式） -->
        <section v-if="!isConsolidation" class="rec-section">
          <h4 class="section-title">弱势领域</h4>
          <div v-if="weakDomains.length === 0" class="muted">未检测到明显弱势领域。</div>
          <div v-else class="weak-grid">
            <div
              v-for="wd in weakDomains"
              :key="wd.domain"
              class="weak-chip"
              :class="`sev-${wd.severity}`"
            >
              <span class="weak-label">{{ wd.label }}</span>
              <el-tag size="small" :type="wd.severity === 'danger' ? 'danger' : 'warning'">
                {{ wd.severity === 'danger' ? '重度弱势' : '弱势' }}
              </el-tag>
              <span v-if="!wd.equipmentSupported" class="no-equip">暂无配套器材</span>
            </div>
          </div>
        </section>

        <!-- 发展概况（巩固模式：无弱势，器材可用于能力巩固） -->
        <section v-else class="rec-section">
          <h4 class="section-title">发展概况</h4>
          <div class="overview-card">
            <p class="overview-main">✅ 各领域发展均衡，本次评估未发现明显弱势领域。</p>
            <p class="overview-sub">器材训练同样适用于日常能力巩固与全面发展，以下为按使用热度精选的器材，可按需勾选。</p>
          </div>
        </section>

        <!-- 推荐器材 -->
        <section class="rec-section">
          <div class="section-head">
            <h4 class="section-title">{{ isConsolidation ? '推荐器材（能力巩固精选）' : '推荐器材' }}</h4>
            <span class="section-hint">{{ selectedCount }}/{{ recommendations.length }} 已选</span>
          </div>

          <el-empty
            v-if="!hasAnyEquipment"
            :description="isConsolidation ? '当前授权下暂无配套巩固器材，可前往「资源中心」浏览全部器材。' : '暂无配套器材推荐（部分领域如大运动/语言可能无器材包，或当前授权未开通对应能力包）。'"
          />

          <div v-else class="equip-list">
            <div
              v-for="rec in recommendations"
              :key="rec.resource.id"
              class="equip-item"
              :class="{ 'is-selected': rec.selected }"
            >
              <el-checkbox
                :model-value="rec.selected"
                @change="store.toggleSelection(rec.resource.id)"
              />
              <div class="equip-cover">
                <img
                  v-if="resolvedCover(rec.resource)"
                  :src="resolvedCover(rec.resource)"
                  :alt="rec.resource.name"
                  @error="onCoverError"
                />
                <el-icon v-else :size="28"><Box /></el-icon>
              </div>
              <div class="equip-main">
                <div class="equip-name">{{ rec.resource.name }}</div>
                <div class="equip-tags">
                  <el-tag
                    v-for="tag in rec.matchedTags"
                    :key="tag"
                    size="small"
                    type="success"
                    effect="light"
                  >
                    {{ tag }}
                  </el-tag>
                  <span v-if="rec.matchedTags.length === 0" class="domain-only">
                    {{ domainLabel(rec.domain) }} 领域匹配
                  </span>
                </div>
                <div class="equip-meta">
                  <el-tag size="small" effect="plain">{{ entitlementName(rec.entitlement) }}</el-tag>
                  <span class="domain-badge">{{ domainLabel(rec.domain) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <span v-if="lastError" class="footer-error">{{ lastError }}</span>
        <div class="footer-actions">
          <el-button @click="onVisibilityChange(false)">关闭</el-button>
          <el-button
            type="primary"
            :disabled="!hasAnyEquipment || selectedCount === 0"
            :loading="creating"
            @click="handleCreateDraft"
          >
            生成训练计划(草稿)
          </el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Box } from '@element-plus/icons-vue'
import { useRecommendationStore } from '@/stores/recommendation'
import { getUnifiedDomainDefinition } from '@/features/recommendation/ability-taxonomy'
import { getEntitlementDefinition } from '@/features/entitlements/entitlement-catalog'
import type { EntitlementCode } from '@/features/entitlements/entitlement-catalog'
import { resolveResourceItemCoverImage } from '@/utils/resource-cover'
import type { ResourceItem } from '@/types/module'

const store = useRecommendationStore()
const router = useRouter()

const creating = ref(false)

const visible = computed(() => store.visible)
const loading = computed(() => store.loading)
const result = computed(() => store.result)
const weakDomains = computed(() => store.weakDomains)
const recommendations = computed(() => store.recommendations)
const hasAnyEquipment = computed(() => store.result?.hasAnyEquipment ?? false)
const isConsolidation = computed(() => store.result?.mode === 'consolidation')
const selectedCount = computed(() => store.selectedCount)
const lastError = computed(() => store.error)

function onVisibilityChange(val: boolean) {
  if (val) {
    store.open()
  } else {
    store.close()
  }
}

function domainLabel(domain: string): string {
  try {
    return getUnifiedDomainDefinition(domain as any)?.label || domain
  } catch {
    return domain
  }
}

function entitlementName(code: EntitlementCode): string {
  try {
    return getEntitlementDefinition(code)?.name || code
  } catch {
    return code
  }
}

function onCoverError(e: Event) {
  const img = e.target as HTMLImageElement
  if (img) img.style.display = 'none'
}

/**
 * 解析器材封面为可用 URL。
 * 全项目统一走 resolveResourceItemCoverImage：物理器材走 getPhysicalEquipmentImageUrl，
 * legacy 器材走 getEquipmentImageUrl，其余走 resolvePresetResourceUrl(coverImage)。
 * 直接用 resource.coverImage 原始相对路径会导致图片无法加载（回归点）。
 */
function resolvedCover(resource: ResourceItem): string {
  return resolveResourceItemCoverImage(resource)
}

async function handleCreateDraft() {
  creating.value = true
  try {
    const outcome = store.createDraftPlan()
    if (outcome.success) {
      ElMessage.success(
        `已生成训练计划草稿${outcome.attachedCount != null ? `（挂载 ${outcome.attachedCount} 件器材）` : ''}`,
      )
      store.close()
      // 跳 PlanList 审阅激活
      try {
        await ElMessageBox.confirm('已生成训练计划草稿，是否前往计划列表审阅激活？', '生成成功', {
          confirmButtonText: '前往计划列表',
          cancelButtonText: '稍后',
          type: 'success',
        })
        router.push('/training-plan')
      } catch {
        // 用户选择稍后，不跳转
      }
    } else {
      ElMessage.error(outcome.error || '生成训练计划失败')
    }
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.rec-content {
  padding: 0 4px;
}

.rec-section {
  margin-bottom: 24px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.section-hint {
  font-size: 12px;
  color: #909399;
}

.muted {
  color: #909399;
  font-size: 13px;
}

.overview-card {
  background: #f0f9eb;
  border: 1px solid #c2e7b0;
  border-radius: 8px;
  padding: 12px 14px;
}

.overview-main {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.overview-sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

.weak-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weak-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  font-size: 13px;
}

.weak-chip.sev-danger {
  background: #fef0f0;
  border-color: #fbc4c4;
}

.weak-chip.sev-warning {
  background: #fdf6ec;
  border-color: #f5dab1;
}

.weak-label {
  font-weight: 600;
  color: #303133;
}

.no-equip {
  font-size: 11px;
  color: #909399;
}

.equip-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.equip-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s, background 0.15s;
}

.equip-item.is-selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.equip-cover {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 6px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #c0c4cc;
}

.equip-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.equip-main {
  flex: 1;
  min-width: 0;
}

.equip-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
  word-break: break-all;
}

.equip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.domain-only {
  font-size: 12px;
  color: #67c23a;
}

.equip-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.domain-badge {
  font-size: 12px;
  color: #909399;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-error {
  font-size: 12px;
  color: #f56c6c;
}

.footer-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}
</style>
