import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const avatarDirectory = resolve(projectRoot, 'assets/resources/images/user-avatars')
const expectedAvatarFiles = [
  'Elementary_Female_Student.png',
  'Elementary_Male_Student.png',
  'Kindergarten_Female_Student.png',
  'Kindergarten_Male_Student.png',
  'MiddleAged_Female_Teacher.png',
  'MiddleAged_Male_Teacher.png',
  'MiddleSchool_Female_Student.png',
  'MiddleSchool_Male_Student.png',
  'Senior_Female_Teacher.png',
  'Senior_Male_Teacher.png',
  'Young_Female_Teacher.png',
  'Young_Male_Teacher.png',
]

function readSource(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('user avatar preset catalog preserves the twelve supplied PNG assets and canonical paths', () => {
  const catalogSource = readSource('src/utils/avatar-presets.ts')
  const avatarFiles = readdirSync(avatarDirectory)
    .filter((file) => file.endsWith('.png'))
    .sort()

  assert.deepEqual(avatarFiles, expectedAvatarFiles)
  assert.match(catalogSource, /STUDENT_AVATAR_PRESETS/)
  assert.match(catalogSource, /TEACHER_AVATAR_PRESETS/)
  assert.match(catalogSource, /resolvePresetResourceUrl/)
  assert.doesNotMatch(catalogSource, /assets\/resources\/images\/user-avatars/)

  for (const filename of expectedAvatarFiles) {
    const filePath = resolve(avatarDirectory, filename)
    assert.equal(existsSync(filePath), true)
    assert.equal(readFileSync(filePath).subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.match(catalogSource, new RegExp(`images/user-avatars/${filename}`))
  }
})

test('one picker owns upload compression and camera capture for both student and profile flows', () => {
  const pickerSource = readSource('src/components/common/AvatarPicker.vue')
  const studentDialogSource = readSource('src/components/AddStudentDialog.vue')
  const profileSource = readSource('src/views/Profile.vue')

  assert.match(pickerSource, /compressImage\(file/)
  assert.match(pickerSource, /maxWidth: MAX_AVATAR_DIMENSION/)
  assert.match(pickerSource, /getUserMedia/)
  assert.match(pickerSource, /toDataURL\('image\/jpeg', AVATAR_QUALITY\)/)
  assert.match(studentDialogSource, /<AvatarPicker/)
  assert.doesNotMatch(studentDialogSource, /navigator\.mediaDevices\.getUserMedia/)
  assert.match(profileSource, /<AvatarPicker/)
  assert.match(profileSource, /TEACHER_AVATAR_PRESETS/)
})

test('user avatar reaches schemas, startup migration, profile cache, and all display consumers', () => {
  const initSource = readSource('src/database/init.ts')
  const sqljsInitSource = readSource('src/database/sqljs-init.ts')
  const schemaSource = readSource('src/database/schema.sql')
  const apiSource = readSource('src/database/api.ts')
  const authSource = readSource('src/stores/auth.ts')
  const profileSource = readSource('src/views/Profile.vue')
  const layoutSource = readSource('src/views/Layout.vue')
  const studentDisplaySource = readSource('src/utils/student-display.ts')
  const planListSource = readSource('src/views/plan/PlanList.vue')

  for (const source of [initSource, sqljsInitSource, schemaSource]) {
    assert.match(source, /avatar_path TEXT/)
  }

  assert.match(initSource, /safeAddColumn\(rawDb, 'user', 'avatar_path TEXT'\)/)
  assert.match(apiSource, /avatar_path\?: string \| null/)
  assert.match(authSource, /updateCurrentUser\(userInfo: Partial<User>\)/)
  assert.match(authSource, /localStorage\.setItem\('user_info', JSON\.stringify\(this\.user\)\)/)
  assert.match(profileSource, /authStore\.updateCurrentUser/)
  assert.match(layoutSource, /currentUserAvatarUrl/)
  assert.match(studentDisplaySource, /resolvePresetResourceUrl\(normalized\)/)
  assert.match(planListSource, /<StudentAvatar/)
  assert.doesNotMatch(planListSource, /<el-avatar :size="24" :src="student\.avatar_path">/)
})
