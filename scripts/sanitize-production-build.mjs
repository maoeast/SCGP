import { readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = path.join(projectRoot, 'dist')

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs'])

const JS_DEBUG_PATTERNS = [
  {
    name: 'console call',
    pattern: /\bconsole\.(?:log|debug|info|trace|warn|error|table|group|groupCollapsed|groupEnd|time|timeEnd)\s*\(/,
  },
  {
    name: 'debugger statement',
    pattern: /\bdebugger\b/,
  },
  {
    name: 'Vue devtools hook',
    pattern: /__VUE_DEVTOOLS_GLOBAL_HOOK__|vite-plugin-vue-devtools/,
  },
]

const HTML_DEBUG_PATTERNS = [
  {
    name: 'debug script',
    pattern: /<(script|link)\b[^>]*(debug|devtools|webgazer|vconsole|eruda)[^>]*>/i,
  },
  {
    name: 'console output',
    pattern: /\bconsole\.(?:log|debug|info|trace|warn|error)\s*\(/,
  },
]

const CSS_DEBUG_PATTERNS = [
  {
    name: 'debug marker',
    pattern: /@debug|debug-outline|debug-border|debug-grid/i,
  },
]

function stripDebugBlocks(content, extension) {
  let next = content

  next = next.replace(/\/\*\s*@debug:start\s*\*\/[\s\S]*?\/\*\s*@debug:end\s*\//gi, '')
  next = next.replace(/\/\/\s*@debug:start[\s\S]*?\/\/\s*@debug:end/g, '')

  if (extension === '.html') {
    next = next.replace(/<!--\s*@debug:start\s*-->[\s\S]*?<!--\s*@debug:end\s*-->/gi, '')
    next = next.replace(/<!--[\s\S]*?-->/g, '')
  }

  next = next.replace(/\/\/# sourceMappingURL=.*$/gm, '')
  next = next.replace(/\/\*# sourceMappingURL=[\s\S]*?\*\//gm, '')

  return next
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(abs))
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(abs)
    }
  }

  return files
}

function scanForDebugResidue(filePath, content) {
  const ext = path.extname(filePath)
  const patterns = ext === '.js' || ext === '.mjs'
    ? JS_DEBUG_PATTERNS
    : ext === '.html'
      ? HTML_DEBUG_PATTERNS
      : ext === '.css'
        ? CSS_DEBUG_PATTERNS
        : []

  return patterns
    .filter(({ pattern }) => pattern.test(content))
    .map(({ name }) => name)
}

if (!existsSync(distRoot)) {
  throw new Error(`dist directory does not exist: ${distRoot}`)
}

const files = await collectFiles(distRoot)
const failures = []
let changed = 0

for (const filePath of files) {
  const ext = path.extname(filePath)
  const original = await readFile(filePath, 'utf8')
  const sanitized = stripDebugBlocks(original, ext)

  if (sanitized !== original) {
    await writeFile(filePath, sanitized)
    changed++
  }

  const residues = scanForDebugResidue(filePath, sanitized)
  if (residues.length > 0) {
    failures.push({
      file: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
      residues,
    })
  }
}

if (failures.length > 0) {
  const details = failures
    .map((item) => `- ${item.file}: ${item.residues.join(', ')}`)
    .join('\n')
  throw new Error(`production debug residue detected:\n${details}`)
}

console.log(`[sanitize-production-build] checked ${files.length} files, sanitized ${changed}`)
