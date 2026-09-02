import taskSeedInventory from './self-care-task-seed-inventory.json';
import { normalizeTaskTrainingEditorModel, type TaskTrainingResourceMeta } from '@/features/self-care/task-training-contract';

export type SelfCareTaskSeedMode = 'overwrite' | 'preserve' | 'missing-only';

interface RawTaskSeedStep {
  id?: string;
  seq?: number;
  text?: string;
  imagePath?: string | null;
  videoPath?: string | null;
  audioPath?: string | null;
}

interface RawTaskSeedItem {
  legacyId: number;
  legacySource: string;
  legacyTaskCode: string;
  name: string;
  description?: string | null;
  moduleCode: 'life_skills';
  resourceType: 'task_training';
  trainingEntryCode: 'life-skills';
  trainingMode: 'step_task';
  coverImage?: string | null;
  categoryId?: number | null;
  abilityItem?: string | null;
  stepCount: number;
  steps: RawTaskSeedStep[];
}

interface RawTaskSeedInventory {
  generatedAt: string;
  sourceProject: string;
  resourceType: 'task_training';
  entryCode: 'life-skills';
  totalTasks: number;
  totalSteps: number;
  tasks: RawTaskSeedItem[];
}

export interface SelfCareTaskSeedResource {
  legacyId: number;
  legacySource: string;
  legacyTaskCode: string;
  name: string;
  category: string;
  description: string | null;
  coverImage: string | null;
  isCustom: 0;
  isActive: 1;
  metadata: ReturnType<typeof normalizeTaskTrainingEditorModel>;
}

const seedInventory = taskSeedInventory as RawTaskSeedInventory;

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSlashes(value: unknown): string {
  return trimString(value).replace(/\\/g, '/').replace(/^\/+/, '');
}

const DIRECT_MEDIA_URL_RE = /^(?:https?:|data:|blob:|resource:\/\/)/i;
const PRESET_RESOURCE_PREFIXES = ['images/', 'videos/', 'audio/', 'docs/'];

const TASK_STEP_IMAGE_MAPPINGS: Record<string, Array<number | null>> = {
  ASK_DIRECTIONS_001: [1, 2, 3, 4, 5],
  BLOW_NOSE_001: [1, 2, 3, 4, 5, 6, 7, 8],
  FOLD_CLOTHES_001: [1, 2, 3, 4, 5],
  TAKE_OFF_PANTS_001: [1, 2, 3, 4, 5, 6],
  BOY_URINATE_001: [1, 2, 3, 4, 5, 6, 7, 8],
  BRUSH_TEETH_001: [1, 2, 3, 4, 5, 6, 7, 9, 10],
  COMB_HAIR_001: [1, 2, 3, 4, 5, 6, 7],
  CROSS_ROAD_001: [1, 2, 3, 4, 5, 6],
  DRINK_WATER_001: [1, 2, 3, 4, 5, 6, 7],
  EAT_CHOPSTICKS_001: [1, 2, 3, 4, 5, 6, 7],
  EAT_SPOON_001: [1, 2, 3, 4, 5, 6, 7, 8],
  EXPRESS_TOILET_001: [1, 2, 3, 4, 5],
  GIRL_URINATE_001: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  PACK_SCHOOLBAG_001: [1, 2, 3, 4, 5, 6],
  SQUEEZE_TOOTHPASTE_001: [1, 2, 3, 4, 5, 6, 7],
  SUPERMARKET_SHOPPING_001: [1, 2, 3, 4, 5, 6, 7, 8],
  SWEEP_FLOOR_001: [1, 2, 3, 4, 5, 6, 7],
  TAKE_BUS_001: [1, 2, 3, 4, 5, 6, 7, 8],
  TAKE_SHOWER_001: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  WASH_FACE_001: [1, 2, 3, 4, 5, 6, 7, 8],
  WASH_HANDS_001: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  WEAR_PANTS_001: [1, 2, 3, 4],
  WEAR_SHIRT_001: [1, 2, 3, 4],
  WIPE_TABLE_001: [1, 2, 3, 4, 5, 6, 7],
};

function isPresetResourcePath(value: string): boolean {
  return PRESET_RESOURCE_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function normalizePresetRelativePath(value: unknown): string | null {
  const normalized = normalizeSlashes(value);
  if (!normalized) {
    return null;
  }

  if (DIRECT_MEDIA_URL_RE.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('assets/resources/')) {
    return normalized.slice('assets/resources/'.length);
  }

  if (normalized.startsWith('tasks/')) {
    return `images/${normalized}`;
  }

  if (isPresetResourcePath(normalized)) {
    return normalized;
  }

  return normalized;
}

function normalizeSelfCareTaskCoverImagePath(value: unknown): string | null {
  const normalized = normalizeSlashes(value);
  if (!normalized) {
    return null;
  }

  if (DIRECT_MEDIA_URL_RE.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('images/tasks/')) {
    return normalized;
  }

  if (normalized.startsWith('tasks/')) {
    const fileName = normalized.slice('tasks/'.length);
    return fileName ? `images/tasks/${fileName}` : null;
  }

  if (normalized.startsWith('public/tasks/')) {
    return `images/tasks/${normalized.slice('public/tasks/'.length)}`;
  }

  return normalizePresetRelativePath(normalized);
}

function resolveSelfCareTaskStepImagePaths({
  legacyTaskCode,
  stepCount,
  coverImage,
}: {
  legacyTaskCode: string;
  stepCount: number;
  coverImage: string | null;
}): Array<string | null> {
  const count = Number(stepCount);
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const normalizedTaskCode = trimString(legacyTaskCode);
  const mapping = TASK_STEP_IMAGE_MAPPINGS[normalizedTaskCode] || null;
  if (Array.isArray(mapping) && mapping.length > 0) {
    return Array.from({ length: count }, (_value, index) => {
      const stepImageIndex = mapping[index] ?? null;
      if (typeof stepImageIndex === 'number' && stepImageIndex > 0) {
        return `images/tasks/${normalizedTaskCode}/${stepImageIndex}.png`;
      }
      return coverImage || null;
    });
  }

  return Array.from({ length: count }, () => coverImage || null);
}

const TASK_CATEGORY_MAP: Record<number, { parentId: number; parentName: string; childId: number; childName: string }> = {
  11: { parentId: 1, parentName: '饮食技能', childId: 11, childName: '使用勺子' },
  12: { parentId: 1, parentName: '饮食技能', childId: 12, childName: '使用筷子' },
  15: { parentId: 1, parentName: '饮食技能', childId: 15, childName: '使用杯子' },
  21: { parentId: 2, parentName: '穿着技能', childId: 21, childName: '穿脱上衣' },
  22: { parentId: 2, parentName: '穿着技能', childId: 22, childName: '穿脱裤子' },
  23: { parentId: 2, parentName: '穿着技能', childId: 23, childName: '穿袜子' },
  24: { parentId: 2, parentName: '穿着技能', childId: 24, childName: '穿鞋/系鞋带' },
  26: { parentId: 2, parentName: '穿着技能', childId: 26, childName: '扣/解纽扣' },
  31: { parentId: 3, parentName: '如厕技能', childId: 31, childName: '表达如厕需求' },
  32: { parentId: 3, parentName: '如厕技能', childId: 32, childName: '独立如厕' },
  41: { parentId: 4, parentName: '个人卫生', childId: 41, childName: '口腔清洁' },
  42: { parentId: 4, parentName: '个人卫生', childId: 42, childName: '洗手洗脸' },
  43: { parentId: 4, parentName: '个人卫生', childId: 43, childName: '洗澡' },
  44: { parentId: 4, parentName: '个人卫生', childId: 44, childName: '梳头' },
  46: { parentId: 4, parentName: '个人卫生', childId: 46, childName: '擦鼻涕' },
  51: { parentId: 5, parentName: '居家生活', childId: 51, childName: '整理物品' },
  53: { parentId: 5, parentName: '居家生活', childId: 53, childName: '简单家务' },
  61: { parentId: 6, parentName: '社区生活', childId: 61, childName: '过马路' },
  62: { parentId: 6, parentName: '社区生活', childId: 62, childName: '乘坐公交车' },
  63: { parentId: 6, parentName: '社区生活', childId: 63, childName: '超市购物' },
  64: { parentId: 6, parentName: '社区生活', childId: 64, childName: '问路求助' },
};

const ABILITY_ITEM_NAME_MAP: Record<string, string> = {
  feed_01: '独立进食',
  feed_02: '独立饮水',
  dress_01: '穿脱上衣',
  dress_02: '穿脱裤子',
  dress_03: '穿袜穿鞋',
  dress_04: '衣物精细操作',
  toilet_01: '表达如厕需求',
  toilet_02: '独立如厕',
  hygiene_01: '口腔清洁',
  hygiene_02: '洗手洗脸',
  hygiene_03: '身体清洁与梳理',
  home_01: '整理收纳',
  home_02: '简单家务',
  community_01: '安全出行',
  community_02: '购物参与',
  community_03: '求助沟通',
};

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildSeedMetadata(task: RawTaskSeedItem) {
  const categoryMeta = task.categoryId ? TASK_CATEGORY_MAP[task.categoryId] || null : null;
  const abilityItemId = normalizeNullableString(task.abilityItem);
  const coverImage = normalizeSelfCareTaskCoverImagePath(task.coverImage || null);
  const fallbackStepImages = resolveSelfCareTaskStepImagePaths({
    legacyTaskCode: task.legacyTaskCode,
    stepCount: task.steps.length,
    coverImage,
  });

  return normalizeTaskTrainingEditorModel({
    trainingMode: task.trainingMode,
    trainingEntryCode: task.trainingEntryCode,
    legacyTaskCode: task.legacyTaskCode,
    category: categoryMeta,
    abilityItem: abilityItemId
      ? {
          id: abilityItemId,
          name: ABILITY_ITEM_NAME_MAP[abilityItemId] || '',
        }
      : null,
    steps: task.steps.map((step, index) => ({
      id: step.id || `legacy_step_${task.legacyId}_${index + 1}`,
      seq: index + 1,
      text: step.text || '',
      imagePath: step.imagePath || fallbackStepImages[index] || null,
      videoPath: step.videoPath || null,
      audioPath: step.audioPath || null,
    })),
  });
}

export const SELF_CARE_TASK_SEED_RESOURCES: ReadonlyArray<SelfCareTaskSeedResource> = Object.freeze(
  seedInventory.tasks.map((task) => {
    const metadata = buildSeedMetadata(task);
    return Object.freeze({
      legacyId: task.legacyId,
      legacySource: task.legacySource,
      legacyTaskCode: task.legacyTaskCode,
      name: task.name,
      category: metadata.category?.childName || '',
      description: normalizeNullableString(task.description),
      coverImage: normalizeSelfCareTaskCoverImagePath(task.coverImage || null),
      isCustom: 0 as const,
      isActive: 1 as const,
      metadata,
    });
  }),
);

export const SELF_CARE_TASK_SEED_SUMMARY = Object.freeze({
  totalTasks: SELF_CARE_TASK_SEED_RESOURCES.length,
  totalSteps: SELF_CARE_TASK_SEED_RESOURCES.reduce((sum, task) => sum + task.metadata.steps.length, 0),
});

export function resolveSelfCareTaskSeedMode(
  mode = (import.meta.env.DEV ? 'overwrite' : 'missing-only'),
): SelfCareTaskSeedMode {
  if (mode === 'overwrite' || mode === 'preserve' || mode === 'missing-only') {
    return mode;
  }
  return import.meta.env.DEV ? 'overwrite' : 'missing-only';
}

/**
 * 步骤图缺图补全：老库（生产 missing-only 模式跳过更新）中步骤 imagePath 仍是
 * 封面占位（空 / *_cover.jpg）而 seed 已提供编号真图时，仅替换 imagePath 字段，
 * 其余步骤字段（text / videoPath / audioPath 等）保持不变，避免覆盖用户改动。
 *
 * 返回补全后的 meta_data JSON；若无变化或输入不可解析返回 null。
 */
export function upgradeSeedTaskStepsImagePaths(
  existingMetaJson: string | null,
  seedMeta: TaskTrainingResourceMeta,
  legacyTaskCode: string,
): string | null {
  if (!existingMetaJson) {
    return null
  }

  let existingMeta: unknown
  try {
    existingMeta = JSON.parse(existingMetaJson)
  } catch {
    return null
  }

  const candidate = existingMeta as { steps?: unknown } | null
  if (!candidate || !Array.isArray(candidate.steps)) {
    return null
  }

  // 步骤数变化（如文案重组：叠衣服 7 步 → 5 步）：仅当现有步骤全部由 seed 管理
  // （封面占位 或 seed 编号路径 {CODE}/{n}.png，即 seed 写入的布局）时，steps 结构与
  // 文本整体替换为 seed 权威版本；若任一步骤存在用户内容路径（上传/自定义），不动。
  // 仅适用于内置 seed 任务（is_custom=0），用户自定义资源不经过本函数
  if (candidate.steps.length !== seedMeta.steps.length) {
    const seedManagedPattern = new RegExp(`/tasks/${legacyTaskCode}/\\d+\\.(?:png|jpg|jpeg|webp)$`, 'i')
    const allSeedManaged = candidate.steps.every((step) => {
      const rawStep = step as Record<string, unknown> | null
      const image = rawStep && typeof rawStep.imagePath === 'string' ? rawStep.imagePath.trim() : ''
      if (!image || image.includes(`${legacyTaskCode}_cover`)) {
        return true
      }
      return seedManagedPattern.test(image)
    })
    if (!allSeedManaged) {
      return null
    }
    return JSON.stringify({
      ...candidate,
      steps: seedMeta.steps,
      trainingMode: seedMeta.trainingMode,
      trainingEntryCode: seedMeta.trainingEntryCode,
      legacyTaskCode: seedMeta.legacyTaskCode,
    })
  }

  const seedImagePrefix = `/tasks/${legacyTaskCode}/`
  let changed = false
  const upgradedSteps = candidate.steps.map((step, index) => {
    const rawStep = step as Record<string, unknown> | null
    if (!rawStep || typeof rawStep !== 'object') {
      return step
    }

    const seedImage = seedMeta.steps[index]?.imagePath
    if (!seedImage || !seedImage.includes(seedImagePrefix)) {
      // seed 该步骤未提供编号真图（如部分步骤仍用封面）→ 不动
      return step
    }

    const existingImage = typeof rawStep.imagePath === 'string' ? rawStep.imagePath.trim() : ''
    const isCoverPlaceholder = !existingImage || existingImage.includes(`${legacyTaskCode}_cover`)
    if (!isCoverPlaceholder) {
      // 已有真实图像（用户配置或此前已补）→ 不动
      return step
    }

    changed = true
    return { ...rawStep, imagePath: seedImage }
  })

  if (!changed) {
    return null
  }

  return JSON.stringify({ ...candidate, steps: upgradedSteps })
}

