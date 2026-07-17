import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skillsRoot = resolve(projectRoot, 'src/data/skills')

function readSkill(code) {
  return readFileSync(join(skillsRoot, code, 'SKILL.md'), 'utf8')
}

function readMarkdownTree(code) {
  const root = join(skillsRoot, code)
  const files = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) visit(fullPath)
      else if (extname(entry.name).toLowerCase() === '.md') files.push(fullPath)
    }
  }
  visit(root)
  return files.map((file) => readFileSync(file, 'utf8')).join('\n')
}

function assertGovernanceFields(code) {
  const skill = readSkill(code)
  assert.match(skill, /^name:\s*["']?.+?["']?$/m)
  assert.match(skill, /^description:\s*.+$/m)
  assert.match(skill, /^license:\s*.+$/m)
  assert.match(skill, /^evidence_level:\s*.+$/m)
  assert.match(skill, /^risk_level:\s*.+$/m)
  assert.match(skill, /^audience:\s*教师端$/m)
}

test('高风险三包不再注入美国制度、资质和英文临床量表流程', () => {
  const content = [
    readMarkdownTree('special-education-teacher'),
    readMarkdownTree('speech-therapist'),
    readMarkdownTree('developmental-screening-assessment'),
  ].join('\n')

  assert.doesNotMatch(
    content,
    /IDEIA|FAPE|PLAAFP|CCC-SLP|ASHA-aligned|PLS-5|CELF-5|GFTA-3|SSI-4|AIMSweb/i,
  )
})

test('特殊教育教师技能采用国内随班就读与资源教室工作语境', () => {
  assertGovernanceFields('special-education-teacher')
  const skill = readSkill('special-education-teacher')
  assert.match(skill, /随班就读/)
  assert.match(skill, /一人一案/)
  assert.match(skill, /资源教室/)
  assert.match(skill, /不作诊断|不做诊断/)
})

test('言语语言支持技能以普通话和功能性沟通支持为核心', () => {
  assertGovernanceFields('speech-therapist')
  const skill = readSkill('speech-therapist')
  assert.match(skill, /普通话/)
  assert.match(skill, /功能性沟通/)
  assert.match(skill, /听力.*转介|转介.*听力/)
  assert.match(skill, /不.*诊断/)
})

test('发展观察技能不得由自由描述生成 DQ 或 ASD 风险等级', () => {
  assertGovernanceFields('developmental-screening-assessment')
  const skill = readSkill('developmental-screening-assessment')
  assert.match(skill, /不得根据.*自由描述.*DQ|不得.*自由描述.*发育商/)
  assert.match(skill, /不得输出.*ASD.*风险等级|不输出.*ASD.*风险等级/)
  assert.match(skill, /正式评估/)
  assert.doesNotMatch(skill, /儿童姓名：\[姓名\]/)
})

test('蒙台梭利技能适配中国园校场景', () => {
  assertGovernanceFields('montessori-teacher')
  assert.match(readSkill('montessori-teacher'), /中国幼儿园|资源教室/)
})

test('家校沟通技能要求去标识化且不作虚假隐私承诺', () => {
  assertGovernanceFields('家校沟通话术官')
  assert.match(readSkill('家校沟通话术官'), /化名|去标识/)
  assert.doesNotMatch(readSkill('家校沟通话术官'), /不会.*上传到第三方/)
})

test('心理支持和融合训练技能保留教师端边界', () => {
  for (const code of ['child-adolescent-mental-health-support', 'inclusive-training-adaptation']) {
    assert.equal(existsSync(join(skillsRoot, code, 'SKILL.md')), true)
    assertGovernanceFields(code)
  }
  assert.match(readSkill('child-adolescent-mental-health-support'), /学校既有危机处置流程/)
  assert.match(readSkill('inclusive-training-adaptation'), /保留训练目标|不降低训练目标/)
})

test('SKILL.md 中声明的本地 reference 文件均存在', () => {
  const codes = [
    'special-education-teacher',
    'speech-therapist',
    'developmental-screening-assessment',
    'montessori-teacher',
    '家校沟通话术官',
    'child-adolescent-mental-health-support',
    'inclusive-training-adaptation',
  ]

  for (const code of codes) {
    const skill = readSkill(code)
    const references = [...skill.matchAll(/`(references\/[^`]+\.md)`/g)].map((match) => match[1])
    for (const reference of references) {
      assert.equal(
        existsSync(join(skillsRoot, code, reference)),
        true,
        `${code}/${reference} 应存在`,
      )
    }
  }
})
