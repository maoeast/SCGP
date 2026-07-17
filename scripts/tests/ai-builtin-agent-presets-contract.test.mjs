import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('内置智能体目录提供 5 个教师场景预设并覆盖 7 个知识技能', () => {
  const relativePath = 'src/data/ai-agent-presets.ts'
  assert.equal(existsSync(resolve(projectRoot, relativePath)), true, `${relativePath} 应存在`)

  const source = readProjectFile(relativePath)
  for (const code of [
    'special_ed_teacher',
    'scgp_builtin_communication_support',
    'scgp_builtin_growth_observer',
    'scgp_builtin_family_communication',
    'scgp_builtin_wellbeing_support',
  ]) {
    assert.match(source, new RegExp(`code:\\s*'${code}'`))
  }
  for (const name of ['一人一策', '沟通有方', '成长看得见', '家校好好说', '心晴陪伴']) {
    assert.match(source, new RegExp(`name:\\s*'${name}'`))
  }
  for (const displayName of [
    '个别化教学专家',
    '课堂沟通支持专家',
    '成长观察助手',
    '家校沟通助手',
    '情绪支持助手',
  ]) {
    assert.match(source, new RegExp(`displayName:\\s*'${displayName}'`))
  }
  for (const skill of [
    'special-education-teacher',
    'speech-therapist',
    'developmental-screening-assessment',
    'montessori-teacher',
    '家校沟通话术官',
    'child-adolescent-mental-health-support',
    'inclusive-training-adaptation',
  ]) {
    assert.match(source, new RegExp(skill))
  }
  assert.match(source, /starterPrompts:/)
  assert.match(source, /expertiseTags:/)
  assert.match(source, /avatarText:/)
  assert.match(source, /avatarTone:/)
  assert.match(source, /教师端/)
  assert.match(source, /不作诊断|不做诊断/)
})

test('数据库启动时同步内置智能体与精确技能绑定', () => {
  const source = readProjectFile('src/database/init.ts')
  const apiSource = readProjectFile('src/database/ai-api.ts')

  assert.match(source, /BUILTIN_AGENT_PRESETS/)
  assert.match(source, /UPDATE ai_agent[\s\S]*system_prompt/)
  assert.match(source, /DELETE FROM ai_agent_skill WHERE agent_id = \?/)
  assert.match(source, /a\.code NOT IN/)
  assert.match(source, /knowledge_/)
  assert.match(source, /tool_/)
  assert.match(apiSource, /isBuiltinAgentCode\(input\.code\)/)
  assert.match(apiSource, /setAgentEnabled/)
  assert.match(apiSource, /内置智能体由系统维护/)
})

test('内置智能体选择的默认引用资料均真实存在', () => {
  const references = [
    ['special-education-teacher', 'domestic-school-workflow'],
    ['special-education-teacher', 'individualized-support-template'],
    ['special-education-teacher', 'classroom-behavior-support'],
    ['inclusive-training-adaptation', 'adaptation-checklist'],
    ['montessori-teacher', 'prepared-environment-local'],
    ['montessori-teacher', 'observation-and-presentation'],
    ['speech-therapist', 'classroom-communication-support'],
    ['speech-therapist', 'observation-and-referral'],
    ['speech-therapist', 'family-collaboration'],
    ['developmental-screening-assessment', 'naturalistic-observation'],
    ['developmental-screening-assessment', 'formal-assessment-boundaries'],
    ['developmental-screening-assessment', 'support-and-referral'],
    ['child-adolescent-mental-health-support', 'safety-boundaries'],
    ['child-adolescent-mental-health-support', 'teacher-workflow'],
  ]

  for (const [skill, reference] of references) {
    const relativePath = `src/data/skills/${skill}/references/${reference}.md`
    assert.equal(existsSync(resolve(projectRoot, relativePath)), true, `${relativePath} 应存在`)
  }
})

test('聊天入口展示当前内置智能体简介与快捷提问', () => {
  const source = readProjectFile('src/features/ai/components/AiAssistant.vue')

  assert.match(source, /getBuiltinAgentPreset/)
  assert.match(source, /starterPrompts/)
  assert.match(source, /starter-prompt/)
})

test('系统设置保护内置智能体并保留自定义智能体入口', () => {
  const source = readProjectFile('src/views/system/AiAgentConfig.vue')

  assert.match(source, /isBuiltinAgentCode/)
  assert.match(source, /setAgentEnabled/)
  assert.match(source, /内置/)
  assert.match(source, /新增智能体/)
  assert.match(source, /agent-grid/)
  assert.match(source, /agent-detail-dialog/)
  assert.equal(source.includes('<el-table :data="aiStore.agents"'), false)
})

test('首页复用 5 个内置智能体卡片并可指定智能体打开新对话', () => {
  const dashboardSource = readProjectFile('src/views/Dashboard.vue')
  const launcherSource = readProjectFile('src/features/ai/assistant-launcher.ts')
  const assistantSource = readProjectFile('src/features/ai/components/AiAssistant.vue')

  assert.match(dashboardSource, /BUILTIN_AGENT_PRESETS/)
  assert.match(dashboardSource, /home-agent-grid/)
  assert.match(dashboardSource, /开始聊天/)
  assert.match(dashboardSource, /openAiAssistant\(agentCode\)/)
  assert.equal(dashboardSource.includes('<h2>快捷操作区</h2>'), false)

  assert.match(launcherSource, /scgp:ai-assistant:open/)
  assert.match(launcherSource, /CustomEvent<AiAssistantOpenDetail>/)
  assert.match(assistantSource, /AI_ASSISTANT_OPEN_EVENT/)
  assert.match(assistantSource, /aiStore\.selectAgent\(agentCode\)/)
  assert.match(assistantSource, /该智能体当前未启用/)
})
