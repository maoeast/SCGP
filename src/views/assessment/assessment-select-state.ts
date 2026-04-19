import type { TrainingEntryCode } from '@/utils/training-entry'

export interface AssessmentTabAvailability {
  id: TrainingEntryCode
  count: number
}

interface ReconcileAssessmentActiveTabInput {
  currentTab: TrainingEntryCode
  hasUserSelectedTab: boolean
  panels: AssessmentTabAvailability[]
}

export function reconcileAssessmentActiveTab({
  currentTab,
  hasUserSelectedTab,
  panels,
}: ReconcileAssessmentActiveTabInput): TrainingEntryCode {
  const currentPanel = panels.find((panel) => panel.id === currentTab)

  if (hasUserSelectedTab && currentPanel) {
    return currentPanel.id
  }

  if (currentPanel?.count && currentPanel.count > 0) {
    return currentPanel.id
  }

  return panels.find((panel) => panel.count > 0)?.id || currentPanel?.id || panels[0]?.id || currentTab
}

export function isAssessmentCardActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}
