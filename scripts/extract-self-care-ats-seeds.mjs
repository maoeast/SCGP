import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const atsProjectRoot = resolve(projectRoot, '..', 'Self-Care ATS', 'self-care-ats')
const outputDir = resolve(projectRoot, '.tmp', 'self-care-ats')
const outputPath = resolve(outputDir, 'task-seed-inventory.json')

const jiti = createJiti(import.meta.url)
const atsSampleTasksPath = resolve(atsProjectRoot, 'src', 'database', 'sample-tasks.ts')
const { SAMPLE_TASKS, SAMPLE_TASK_STEPS } = jiti(atsSampleTasksPath)

const stepsByTaskId = new Map()
for (const step of SAMPLE_TASK_STEPS) {
  const collection = stepsByTaskId.get(step.task_id) || []
  collection.push(step)
  stepsByTaskId.set(step.task_id, collection)
}

const records = SAMPLE_TASKS.map((task) => {
  const taskSteps = (stepsByTaskId.get(task.id) || [])
    .slice()
    .sort((left, right) => left.seq - right.seq)

  return {
    legacyId: task.id,
    legacySource: 'self_care_ats_task',
    legacyTaskCode: task.code,
    name: task.name,
    description: task.description || null,
    moduleCode: 'life_skills',
    resourceType: 'task_training',
    trainingEntryCode: 'life-skills',
    trainingMode: 'step_task',
    coverImage: task.cover_img || null,
    categoryId: task.category_id ?? null,
    abilityItem: task.ability_item || null,
    stepCount: taskSteps.length,
    steps: taskSteps.map((step) => ({
      id: `legacy_step_${step.id}`,
      seq: step.seq,
      text: step.text,
      imagePath: step.img_path || null,
      videoPath: step.video_path || null,
      audioPath: step.audio_path || null,
    })),
  }
})

mkdirSync(outputDir, { recursive: true })
writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceProject: atsProjectRoot,
      resourceType: 'task_training',
      entryCode: 'life-skills',
      totalTasks: records.length,
      totalSteps: records.reduce((sum, task) => sum + task.stepCount, 0),
      tasks: records,
    },
    null,
    2,
  ),
  'utf8',
)

console.log(`Extracted ${records.length} self-care ATS tasks to ${outputPath}`)
