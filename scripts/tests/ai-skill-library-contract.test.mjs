import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('知识技能包保留主体与可单选的 references 元数据', () => {
  const source = readProjectFile('src/data/skills/index.ts')

  assert.match(source, /references:\s*Array<\{\s*id:/)
  assert.match(source, /body:\s*fm\.body/)
})

test('内置知识技能展示中文名时保留稳定 code', () => {
  const source = readProjectFile('src/data/skills/index.ts')
  assert.match(source, /code:\s*fm\.name/)
  assert.match(source, /name:\s*fm\.displayName\s*\|\|\s*fm\.name/)

  const displayNames = {
    '家校沟通话术官': '家校沟通话术',
    'assessment-profile-interpretation': '跨量表画像综合解读',
    'child-adolescent-mental-health-support': '儿童青少年心理健康支持',
    'developmental-screening-assessment': '儿童发展筛查与评估支持',
    'inclusive-training-adaptation': '融合教育训练适配支持',
    'montessori-teacher': '蒙特梭利教学支持',
    'rehabilitation-equipment-and-exercise-support': '康复器材与常规锻炼支持',
    'special-education-teacher': '特殊教育专业支持',
    'speech-therapist': '言语语言评估与干预支持',
  }

  for (const [code, displayName] of Object.entries(displayNames)) {
    const skill = readProjectFile(`src/data/skills/${code}/SKILL.md`)
    assert.match(skill, new RegExp(`^name:\\s*${code}$`, 'm'))
    assert.match(skill, new RegExp(`^display_name:\\s*${displayName}$`, 'm'))
  }
})

test('智能体技能绑定支持按需选择知识 references', () => {
  const source = readProjectFile('src/database/ai-api.ts')

  assert.match(source, /getAgentSkillBindings/)
  assert.match(source, /setAgentSkillBindings/)
  assert.match(source, /referenceIds/)
})

test('儿童青少年心理支持技能只面向教师，且明确诊断与危机升级边界', () => {
  const relativePath = 'src/data/skills/child-adolescent-mental-health-support/SKILL.md'
  const skillPath = resolve(projectRoot, relativePath)
  assert.equal(existsSync(skillPath), true, `${relativePath} 应存在`)

  const skill = readFileSync(skillPath, 'utf8')
  assert.match(skill, /^name:\s*child-adolescent-mental-health-support$/m)
  assert.match(skill, /仅供教师|教师端/)
  assert.match(skill, /不作诊断|不做诊断/)
  assert.match(skill, /立即启动学校既有危机处置流程/)
  assert.match(skill, /不.*风险等级评分/)
  assert.doesNotMatch(skill, /输出.*(PHQ-9|GAD-7|诊断结果|风险等级评分)/)
})

test('融合训练与活动适配技能保留目标、区分通用调整与专业支持', () => {
  const relativePath = 'src/data/skills/inclusive-training-adaptation/SKILL.md'
  const skillPath = resolve(projectRoot, relativePath)
  assert.equal(existsSync(skillPath), true, `${relativePath} 应存在`)

  const skill = readFileSync(skillPath, 'utf8')
  assert.match(skill, /^name:\s*inclusive-training-adaptation$/m)
  assert.match(skill, /不降低训练目标|保留训练目标/)
  assert.match(skill, /通用调整/)
  assert.match(skill, /需专业支持/)
  assert.match(skill, /不以学习风格测试/) 
})
