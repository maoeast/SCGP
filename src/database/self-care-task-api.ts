import type {
  TaskTrainingResourceMeta,
} from '@/features/self-care/task-training-contract'
import {
  TASK_TRAINING_MODULE_CODE,
  TASK_TRAINING_RESOURCE_TYPE,
  normalizeTaskTrainingEditorModel,
} from '@/features/self-care/task-training-contract'
import { ResourceAPI } from '@/database/resource-api'
import { ModuleCode, type ResourceItem } from '@/types/module'

export interface SelfCareTaskListItem extends ResourceItem {
  metadata: TaskTrainingResourceMeta
}

export interface SelfCareTaskMutationInput {
  name: string
  category: string
  description?: string
  coverImage?: string
  tags?: string[]
  metadata: TaskTrainingResourceMeta
}

const TASK_TRAINING_MODULE = TASK_TRAINING_MODULE_CODE as ModuleCode

function toSelfCareTaskItem(resource: ResourceItem): SelfCareTaskListItem {
  return {
    ...resource,
    metadata: normalizeTaskTrainingEditorModel(resource.metadata, resource.name),
  }
}

export class SelfCareTaskAPI {
  private readonly resourceApi: ResourceAPI

  constructor(resourceApi?: ResourceAPI) {
    this.resourceApi = resourceApi ?? new ResourceAPI()
  }

  listTasks(options?: {
    keyword?: string
    includeInactive?: boolean
    category?: string
  }): SelfCareTaskListItem[] {
    const resources = options?.includeInactive
      ? this.resourceApi.getAllResourcesForAdmin({
          moduleCode: TASK_TRAINING_MODULE,
          resourceType: TASK_TRAINING_RESOURCE_TYPE,
          keyword: options.keyword,
          category: options.category,
        })
      : this.resourceApi.getResources({
          moduleCode: TASK_TRAINING_MODULE,
          resourceType: TASK_TRAINING_RESOURCE_TYPE,
          keyword: options?.keyword,
          category: options?.category,
        })

    return resources.map(toSelfCareTaskItem)
  }

  getTaskById(taskId: number): SelfCareTaskListItem | null {
    const resource = this.resourceApi.getResourceById(taskId, TASK_TRAINING_MODULE)
    if (!resource || resource.resourceType !== TASK_TRAINING_RESOURCE_TYPE) {
      return null
    }

    return toSelfCareTaskItem(resource)
  }

  createTask(input: SelfCareTaskMutationInput): number {
    return this.resourceApi.addResource({
      moduleCode: TASK_TRAINING_MODULE,
      resourceType: TASK_TRAINING_RESOURCE_TYPE,
      name: input.name,
      category: input.category,
      description: input.description,
      coverImage: input.coverImage,
      tags: input.tags,
      metadata: normalizeTaskTrainingEditorModel(input.metadata, input.name),
    })
  }

  updateTask(taskId: number, input: SelfCareTaskMutationInput): boolean {
    return this.resourceApi.updateResource(taskId, {
      name: input.name,
      category: input.category,
      description: input.description,
      coverImage: input.coverImage,
      tags: input.tags,
      metadata: normalizeTaskTrainingEditorModel(input.metadata, input.name),
    })
  }

  deleteTask(taskId: number): boolean {
    return this.resourceApi.deleteResource(taskId)
  }

  restoreTask(taskId: number): boolean {
    return this.resourceApi.restoreResource(taskId)
  }
}
