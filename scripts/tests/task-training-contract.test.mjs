import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'
import ts from 'typescript'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

function loadContract() {
  return jiti('../../src/features/self-care/task-training-contract.ts')
}

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  if (!diagnostic.file || diagnostic.start === undefined) {
    return message
  }

  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
  return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${message}`
}

function compileTypeFixture(sourceText) {
  const fixturePath = resolve(projectRoot, '__task_training_contract_typecheck.ts')
  const options = {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    baseUrl: projectRoot,
    paths: {
      '@/*': ['src/*'],
    },
  }
  const host = ts.createCompilerHost(options, true)
  const originalFileExists = host.fileExists.bind(host)
  const originalReadFile = host.readFile.bind(host)
  const originalGetSourceFile = host.getSourceFile.bind(host)

  host.fileExists = (fileName) => resolve(fileName) === fixturePath || originalFileExists(fileName)
  host.readFile = (fileName) => (resolve(fileName) === fixturePath ? sourceText : originalReadFile(fileName))
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (resolve(fileName) === fixturePath) {
      return ts.createSourceFile(fileName, sourceText, languageVersion, true)
    }

    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  }

  const program = ts.createProgram([fixturePath], options, host)
  return ts.getPreEmitDiagnostics(program).map(formatDiagnostic)
}

test('task_training contract exports platform constants', () => {
  const contract = loadContract()

  assert.equal(contract.TASK_TRAINING_RESOURCE_TYPE, 'task_training')
  assert.equal(contract.TASK_TRAINING_MODULE_CODE, 'life_skills')
  assert.equal(contract.TASK_TRAINING_ENTRY_CODE, 'life-skills')
  assert.equal(contract.TASK_TRAINING_RESOURCE_DISPLAY_TYPE, 'game')
  assert.equal(contract.TASK_TRAINING_MODE, 'step_task')
})

test('task_training contract types model metadata, steps, and execution results', () => {
  const diagnostics = compileTypeFixture(`
    import {
      TASK_TRAINING_ENTRY_CODE,
      TASK_TRAINING_MODE,
      TASK_TRAINING_MODULE_CODE,
      TASK_TRAINING_RESOURCE_DISPLAY_TYPE,
      TASK_TRAINING_RESOURCE_TYPE,
    } from './src/features/self-care/task-training-contract'
    import type {
      TaskTrainingCompletionLevel,
      TaskTrainingErrorType,
      TaskTrainingExecutionResult,
      TaskTrainingResourceContract,
      TaskTrainingResourceMeta,
      TaskTrainingStep,
      TaskTrainingStepResult,
    } from './src/features/self-care/task-training-contract'

    const step: TaskTrainingStep = {
      id: 'step-1',
      seq: 1,
      text: 'Pick up the spoon',
      imagePath: 'resource://images/self-care/spoon-step-1.png',
      videoPath: null,
      audioPath: null,
    }

    const meta: TaskTrainingResourceMeta = {
      trainingMode: TASK_TRAINING_MODE,
      trainingEntryCode: TASK_TRAINING_ENTRY_CODE,
      legacyTaskCode: 'EAT_SPOON_001',
      category: {
        parentId: 1,
        parentName: 'feeding',
        childId: 11,
        childName: 'spoon',
      },
      abilityItem: {
        id: 'feed_01',
        name: 'independent feeding',
      },
      steps: [step],
    }

    const level: TaskTrainingCompletionLevel = 'assist'
    const errorType: TaskTrainingErrorType = 3
    const stepResult: TaskTrainingStepResult = {
      seq: step.seq,
      stepId: step.id,
      completionLevel: level,
      errorType,
      teacherNotes: null,
    }

    const executionResult: TaskTrainingExecutionResult = {
      trainingMode: TASK_TRAINING_MODE,
      stepCount: meta.steps.length,
      completedStepCount: 1,
      errorType,
      teacherNotes: 'verbal prompt needed',
      stepResults: [stepResult],
    }

    const resource: TaskTrainingResourceContract = {
      resourceId: 203,
      moduleCode: TASK_TRAINING_MODULE_CODE,
      resourceType: TASK_TRAINING_RESOURCE_TYPE,
      entryCode: TASK_TRAINING_ENTRY_CODE,
      displayType: TASK_TRAINING_RESOURCE_DISPLAY_TYPE,
      metadata: meta,
    }

    void executionResult
    void resource

    // @ts-expect-error task training only supports the four ATS completion levels.
    const invalidCompletionLevel: TaskTrainingCompletionLevel = 'done'
    void invalidCompletionLevel

    // @ts-expect-error task training preserves the four legacy error type codes only.
    const invalidErrorType: TaskTrainingErrorType = 4
    void invalidErrorType
  `)

  assert.deepEqual(diagnostics, [])
})
