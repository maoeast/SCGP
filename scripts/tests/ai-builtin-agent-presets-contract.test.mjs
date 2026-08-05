import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('内置智能体目录提供 6 个教师场景预设并覆盖 8 个知识技能', () => {
  const relativePath = 'src/data/ai-agent-presets.ts'
  assert.equal(existsSync(resolve(projectRoot, relativePath)), true, `${relativePath} 应存在`)

  const source = readProjectFile(relativePath)
  for (const code of [
    'special_ed_teacher',
    'scgp_builtin_communication_support',
    'scgp_builtin_growth_observer',
    'scgp_builtin_family_communication',
    'scgp_builtin_wellbeing_support',
    'scgp_builtin_rehabilitation_training',
  ]) {
    assert.match(source, new RegExp(`code:\\s*'${code}'`))
  }
  for (const name of ['一人一策', '沟通有方', '成长看得见', '家校好好说', '心晴陪伴', '稳健训练']) {
    assert.match(source, new RegExp(`name:\\s*'${name}'`))
  }
  for (const displayName of [
    '个别化教学专家',
    '课堂沟通支持专家',
    '成长观察助手',
    '家校沟通助手',
    '情绪支持助手',
    '康复训练支持专家',
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
    'rehabilitation-equipment-and-exercise-support',
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
    ['rehabilitation-equipment-and-exercise-support', 'equipment-selection-and-adaptation'],
    ['rehabilitation-equipment-and-exercise-support', 'equipment-session-safety-and-recording'],
    ['rehabilitation-equipment-and-exercise-support', 'professional-plan-translation-boundary'],
  ]

  for (const [skill, reference] of references) {
    const relativePath = `src/data/skills/${skill}/references/${reference}.md`
    assert.equal(existsSync(resolve(projectRoot, relativePath)), true, `${relativePath} 应存在`)
  }
})

test('康复训练支持专家仅绑定最小必要工具、全部康复资料与指定头像', () => {
  const source = readProjectFile('src/data/ai-agent-presets.ts')
  const presetMatch = source.match(
    /code:\s*'scgp_builtin_rehabilitation_training'([\s\S]*?)\n  },\n\]/,
  )
  assert.ok(presetMatch, '应存在康复训练支持专家预设')
  const preset = presetMatch[1]

  assert.match(preset, /displayName:\s*'康复训练支持专家'/)
  assert.match(preset, /先按 A\/B\/C 风险分流/)
  assert.match(preset, /优先查询系统实际返回的器材/)
  assert.match(preset, /不作诊断、治疗处方/)
  assert.match(preset, /不得把器材分类、能力标签或训练记录[\s\S]*医学结论/)
  assert.match(preset, /教师可以继续做什么[\s\S]*转介/)

  const toolMatch = preset.match(/toolCodes:\s*\[([\s\S]*?)\],\s*knowledgeSkills:/)
  assert.ok(toolMatch, '康复训练支持专家应声明工具白名单')
  const toolCodes = Array.from(toolMatch[1].matchAll(/'([^']+)'/g), (match) => match[1])
  assert.deepEqual(toolCodes, [
    'search_students',
    'get_student',
    'get_assessment',
    'get_assessment_trend',
    'get_student_profile',
    'list_training_sessions',
    'list_equipment',
    'generate_report',
  ])

  assert.match(preset, /code:\s*'rehabilitation-equipment-and-exercise-support'/)
  for (const reference of [
    'references/equipment-selection-and-adaptation',
    'references/equipment-session-safety-and-recording',
    'references/professional-plan-translation-boundary',
  ]) {
    assert.match(preset, new RegExp(`'${reference}'`))
  }

  const avatarPath = 'assets/resources/images/ai-agent-avatars/康复训练支持专家.png'
  assert.equal(existsSync(resolve(projectRoot, avatarPath)), true, `${avatarPath} 应存在`)
  const avatarSource = readProjectFile('src/features/ai/ai-agent-avatar-assets.ts')
  assert.match(
    avatarSource,
    /scgp_builtin_rehabilitation_training:\s*'images\/ai-agent-avatars\/康复训练支持专家\.png'/,
  )
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
  assert.match(source, /新增/)
  assert.match(source, /agent-management-header/)
  assert.match(source, /class="agent-create-button" type="primary" :icon="Plus" @click="openCreate"/)
  assert.equal(source.includes('agent-card--create'), false)
  assert.match(source, /agent-grid/)
  assert.match(source, /agent-detail-dialog/)
  assert.equal(source.includes('<el-table :data="aiStore.agents"'), false)
})

test('首页复用 6 个内置智能体卡片并可指定智能体打开新对话', () => {
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
