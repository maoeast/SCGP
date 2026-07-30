import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const idPattern = /^S\d{3}$/u
const hashPattern = /^[a-f0-9]{64}$/u

export function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

export function loadScreenshotApprovals(repoRoot, indexPath) {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  if (index.schemaVersion !== 1 || !Array.isArray(index.approvals)) {
    throw new Error(`Invalid screenshot approval index: ${indexPath}`)
  }
  const ids = new Set()
  return index.approvals.map((entry) => {
    if (!idPattern.test(entry.id) || !/^[-a-z0-9]+$/u.test(entry.runId) || !hashPattern.test(entry.sha256)) {
      throw new Error(`Invalid screenshot approval entry: ${JSON.stringify(entry)}`)
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate screenshot approval: ${entry.id}`)
    ids.add(entry.id)
    return {
      ...entry,
      artifactPath: path.join(repoRoot, 'output', 'manual-screenshot-capture', 'runs', entry.runId, 'screenshots', `${entry.id}.png`),
      finalPath: path.join(repoRoot, 'docs', 'user-manual', 'screenshots', `${entry.id}.png`),
    }
  })
}

export function assertApprovedArtifact(entry) {
  if (!fs.existsSync(entry.artifactPath)) throw new Error(`Approved artifact is missing: ${entry.id}`)
  const actualHash = hashFile(entry.artifactPath)
  if (actualHash !== entry.sha256) throw new Error(`Approved artifact hash mismatch: ${entry.id}`)
}
