import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import http from 'http'
import https from 'https'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..')
const execAsync = promisify(exec)

const PORT = 5173
const DEV_CERT_PATH = path.join(ROOT_DIR, 'dev-cert.pem')
const DEV_KEY_PATH = path.join(ROOT_DIR, 'dev-key.pem')
const DEV_PROTOCOL = fs.existsSync(DEV_CERT_PATH) && fs.existsSync(DEV_KEY_PATH) ? 'https' : 'http'
const DEV_SERVER_URL = `${DEV_PROTOCOL}://localhost:${PORT}`
const WAIT_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 800

let viteProcess = null
let electronProcess = null
let isShuttingDown = false

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function checkPort(port) {
  const platform = os.platform()
  const command = platform === 'win32'
    ? `netstat -ano | findstr ":${port} "`
    : `lsof -i:${port}`

  try {
    const { stdout } = await execAsync(command)
    const lines = stdout.trim().split('\n').filter((line) =>
      line.includes(`:${port} `) || line.includes(`:${port}.`)
    )
    return lines.join('\n')
  } catch {
    return ''
  }
}

async function killPortProcess(port) {
  const portInfo = await checkPort(port)
  if (!portInfo) {
    return
  }

  const platform = os.platform()

  if (platform === 'win32') {
    const lines = portInfo.split('\n')
    const pids = new Set()

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && !Number.isNaN(Number(pid))) {
        pids.add(pid)
      }
    }

    if (pids.size === 0) {
      return
    }

    colorLog(`⚠️  端口 ${port} 已被占用，正在清理旧进程...`, 'yellow')

    for (const pid of pids) {
      await execAsync(`taskkill /F /PID ${pid}`)
    }
  } else {
    const pids = portInfo.trim().split('\n').filter((pid) => pid.trim())
    for (const pid of pids) {
      await execAsync(`kill -9 ${pid.trim()}`)
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1500))
}

function requestDevServerOnce() {
  return new Promise((resolve, reject) => {
    const url = new URL(DEV_SERVER_URL)
    const client = url.protocol === 'https:' ? https : http
    const request = client.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: '/',
        method: 'GET',
        rejectUnauthorized: false,
      },
      (response) => {
        response.resume()
        const statusCode = response.statusCode ?? 0
        if (statusCode > 0 && statusCode < 500) {
          resolve(true)
          return
        }

        reject(new Error(`Unexpected status code: ${statusCode}`))
      },
    )

    request.on('error', reject)
    request.setTimeout(3000, () => {
      request.destroy(new Error('Timed out while probing dev server'))
    })
    request.end()
  })
}

async function waitForDevServer() {
  const startedAt = Date.now()

  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    if (viteProcess?.exitCode !== null) {
      throw new Error(`Vite 开发服务器提前退出，退出码: ${viteProcess.exitCode}`)
    }

    try {
      await requestDevServerOnce()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }

  throw new Error(`等待开发服务器超时：${DEV_SERVER_URL}`)
}

function spawnViteProcess() {
  colorLog(`🚀 启动 Vite 开发服务器: ${DEV_SERVER_URL}`, 'green')

  viteProcess = spawn('vite', [], {
    cwd: ROOT_DIR,
    shell: true,
    env: {
      ...process.env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  viteProcess.stdout?.on('data', (data) => {
    process.stdout.write(data)
  })

  viteProcess.stderr?.on('data', (data) => {
    process.stderr.write(data)
  })

  viteProcess.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return
    }

    colorLog(`❌ Vite 开发服务器已退出（code=${code ?? 'null'}, signal=${signal ?? 'null'}）`, 'red')
    shutdown(code ?? 1)
  })
}

function spawnElectronProcess() {
  colorLog(`🖥️  启动 Electron，并注入开发地址: ${DEV_SERVER_URL}`, 'cyan')

  electronProcess = spawn('electron', ['.'], {
    cwd: ROOT_DIR,
    shell: true,
    env: {
      ...process.env,
      SCGP_DEV_SERVER_URL: DEV_SERVER_URL,
    },
    stdio: 'inherit',
  })

  electronProcess.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return
    }

    colorLog(`👋 Electron 已退出（code=${code ?? 'null'}, signal=${signal ?? 'null'}）`, 'yellow')
    shutdown(code ?? 0)
  })
}

function terminateChild(childProcess) {
  if (!childProcess || childProcess.killed) {
    return
  }

  try {
    childProcess.kill()
  } catch {
    // ignore
  }
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    process.exit(exitCode)
    return
  }

  isShuttingDown = true
  terminateChild(electronProcess)
  terminateChild(viteProcess)
  process.exit(exitCode)
}

async function main() {
  colorLog('🔎 检查开发端口状态...', 'blue')
  await killPortProcess(PORT)
  spawnViteProcess()
  await waitForDevServer()
  colorLog(`✅ 开发服务器已就绪: ${DEV_SERVER_URL}`, 'green')
  spawnElectronProcess()
}

process.on('SIGINT', () => {
  colorLog('\n👋 已停止 Electron 联调', 'yellow')
  shutdown(0)
})

process.on('SIGTERM', () => {
  shutdown(0)
})

main().catch((error) => {
  colorLog(`❌ Electron 联调启动失败: ${error.message}`, 'red')
  shutdown(1)
})
