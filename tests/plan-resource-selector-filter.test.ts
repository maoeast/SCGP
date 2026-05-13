import assert from 'node:assert/strict'

import type { ResourceItem } from '../src/types/module.ts'
import { ModuleCode } from '../src/types/module.ts'
import {
  PLAN_RESOURCE_SELECTOR_MODULE_OPTIONS,
  PLAN_RESOURCE_SELECTOR_TYPE_OPTIONS,
  filterPlanResourceSelectorItems,
} from '../src/views/plan/plan-resource-selector-filter.ts'
import {
  ALL_CUSTOM_GAME_RESOURCE_SEED,
} from '../src/data/emotional-game-catalog.ts'

assert.deepEqual(
  PLAN_RESOURCE_SELECTOR_MODULE_OPTIONS.map((item) => item.label),
  ['全部模块', '自理训练', '生活自理', '情绪场景', '表达关心', '感官训练', '情绪调节', '安抚教具', '社交沟通', '精细动作'],
)

assert.deepEqual(
  PLAN_RESOURCE_SELECTOR_TYPE_OPTIONS.map((item) => item.label),
  ['全部类型', '游戏', '器材'],
)

assert.equal(
  ALL_CUSTOM_GAME_RESOURCE_SEED.filter((item) => item.metadata?.trainingEntryCode === 'soothing-aids').length,
  5,
)

assert.equal(
  ALL_CUSTOM_GAME_RESOURCE_SEED.filter((item) => item.metadata?.trainingEntryCode === 'social-communication').length,
  5,
)

assert.equal(
  ALL_CUSTOM_GAME_RESOURCE_SEED.filter((item) => item.metadata?.trainingEntryCode === 'fine-motor').length,
  5,
)

assert.equal(
  ALL_CUSTOM_GAME_RESOURCE_SEED.filter((item) => item.metadata?.trainingEntryCode === 'life-skills').length,
  5,
)

const customGameResources: ResourceItem[] = ALL_CUSTOM_GAME_RESOURCE_SEED.map((item, index) => ({
  id: 1000 + index,
  moduleCode: item.metadata.moduleCode,
  resourceType: 'game',
  name: item.name,
  description: item.description,
  category: item.category,
  tags: [...item.tags],
  coverImage: item.coverImage,
  isCustom: false,
  isActive: true,
  metadata: { ...item.metadata },
}))

assert.equal(
  filterPlanResourceSelectorItems(customGameResources, { moduleFilter: 'soothing-aids', typeFilter: 'game' }).length,
  5,
)

assert.equal(
  filterPlanResourceSelectorItems(customGameResources, { moduleFilter: 'social-communication', typeFilter: 'game' }).length,
  5,
)

assert.equal(
  filterPlanResourceSelectorItems(customGameResources, { moduleFilter: 'fine-motor', typeFilter: 'game' }).length,
  5,
)

const resources: ResourceItem[] = [
  {
    id: 1,
    moduleCode: ModuleCode.LIFE_SKILLS,
    resourceType: 'task_training',
    name: '刷牙步骤训练',
    category: 'selfcare',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: { trainingEntryCode: 'life-skills' },
  },
  {
    id: 2,
    moduleCode: ModuleCode.LIFE_SKILLS,
    resourceType: 'game',
    name: '洗手流程游戏',
    category: 'daily_life',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: { trainingEntryCode: 'life-skills' },
  },
  {
    id: 3,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'emotion_scene',
    name: '考试紧张情绪场景',
    category: 'emotion',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: {},
  },
  {
    id: 4,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'care_scene',
    name: '朋友难过表达关心',
    category: 'care',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: {},
  },
  {
    id: 5,
    moduleCode: ModuleCode.SENSORY,
    resourceType: 'equipment',
    name: '触觉刷',
    category: 'tactile',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: {},
  },
  {
    id: 6,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'game',
    name: '呼吸节奏游戏',
    category: 'emotional',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: { trainingEntryCode: 'emotional-regulation' },
  },
  {
    id: 7,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'equipment',
    name: '重力毯',
    category: 'emotional',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: { kind: 'physical_equipment', domain: 'soothing-aids' },
  },
  {
    id: 8,
    moduleCode: ModuleCode.SOCIAL,
    resourceType: 'game',
    name: '轮流对话游戏',
    category: 'social',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: { trainingEntryCode: 'social-communication' },
  },
  {
    id: 9,
    moduleCode: ModuleCode.SENSORY,
    resourceType: 'game',
    name: '夹珠子训练',
    category: 'integration',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: { trainingEntryCode: 'fine-motor' },
  },
  {
    id: 10,
    moduleCode: ModuleCode.SENSORY,
    resourceType: 'flashcard',
    name: '不应显示的闪卡',
    category: 'integration',
    tags: [],
    isCustom: false,
    isActive: true,
    metadata: {},
  },
]

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'task-training', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'life-skills', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'emotion-scene', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'care-scene', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'sensory-training', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'emotional-regulation', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'soothing-aids', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'social-communication', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'fine-motor', typeFilter: 'all' }).length,
  1,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'all', typeFilter: 'game' }).length,
  7,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'all', typeFilter: 'equipment' }).length,
  2,
)

assert.equal(
  filterPlanResourceSelectorItems(resources, { moduleFilter: 'all', typeFilter: 'all' }).length,
  9,
)

console.log('plan resource selector filter test passed')
