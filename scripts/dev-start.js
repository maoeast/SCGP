import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const execAsync = promisify(exec);

const PORT = 5173;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function resolveProjectCliPath(...segments) {
  const cliPath = path.join(ROOT_DIR, 'node_modules', ...segments);

  if (!fs.existsSync(cliPath)) {
    throw new Error(`未找到本地 CLI: ${path.relative(ROOT_DIR, cliPath)}`);
  }

  return cliPath;
}

async function checkPort(port) {
  const platform = os.platform();
  const command = platform === 'win32'
    ? `netstat -ano | findstr ":${port} "`
    : `lsof -i:${port}`;

  try {
    const { stdout } = await execAsync(command);
    const lines = stdout.trim().split('\n').filter((line) =>
      line.includes(`:${port} `) || line.includes(`:${port}.`)
    );
    return lines.join('\n');
  } catch {
    return '';
  }
}

async function killPortProcess(port) {
  const platform = os.platform();
  const portInfo = await checkPort(port);

  if (!portInfo) {
    return { killed: false, reason: 'Port not in use' };
  }

  if (platform === 'win32') {
    const lines = portInfo.split('\n');
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !Number.isNaN(Number(pid))) {
        pids.add(pid);
      }
    }

    if (pids.size > 0) {
      colorLog(`\n发现端口 ${port} 被以下进程占用:`, 'yellow');
      for (const pid of pids) {
        try {
          const { stdout: processInfo } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
          const info = processInfo.split('\n')[1];
          if (info) {
            const [imageName] = info.split(',');
            colorLog(`   - PID ${pid}: ${imageName.replace(/"/g, '')}`, 'cyan');
          }
        } catch {
          colorLog(`   - PID ${pid}: (无法获取进程信息)`, 'cyan');
        }
      }

      colorLog('\n正在尝试自动终止这些进程...', 'yellow');

      for (const pid of pids) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          colorLog(`   成功终止 PID ${pid}`, 'green');
        } catch (error) {
          colorLog(`   终止 PID ${pid} 失败: ${error.message}`, 'red');
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const portStillUsed = await checkPort(port);
      if (portStillUsed) {
        colorLog('\n端口仍被占用，请手动处理:', 'red');
        colorLog(`   taskkill /F /PID ${Array.from(pids).join(' /PID ')}`, 'white');
        return { killed: false, reason: 'Failed to kill processes' };
      }

      colorLog('\n端口已成功释放。', 'green');
      return { killed: true };
    }
  } else {
    const pids = portInfo.trim().split('\n').filter((pid) => pid.trim());

    if (pids.length > 0) {
      colorLog(`\n发现端口 ${port} 被以下进程占用:`, 'yellow');
      for (const pid of pids) {
        try {
          const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,comm=`);
          colorLog(`   - ${processInfo.trim()}`, 'cyan');
        } catch {
          colorLog(`   - PID ${pid}: (无法获取进程信息)`, 'cyan');
        }
      }

      colorLog('\n正在尝试自动终止这些进程...', 'yellow');

      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          colorLog(`   成功终止 PID ${pid.trim()}`, 'green');
        } catch (error) {
          colorLog(`   终止 PID ${pid.trim()} 失败: ${error.message}`, 'red');
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const portStillUsed = await checkPort(port);
      if (portStillUsed) {
        colorLog('\n端口仍被占用，请手动处理:', 'red');
        colorLog(`   kill -9 ${pids.join(' ')}`, 'white');
        return { killed: false, reason: 'Failed to kill processes' };
      }

      colorLog('\n端口已成功释放。', 'green');
      return { killed: true };
    }
  }

  return { killed: false, reason: 'Unknown error' };
}

async function main() {
  colorLog('\n启动开发服务器...', 'bright');
  colorLog(`检查端口 ${PORT} 状态...`, 'blue');

  const portInfo = await checkPort(PORT);

  if (portInfo) {
    colorLog(`端口 ${PORT} 已被占用。`, 'yellow');

    const result = await killPortProcess(PORT);

    if (!result.killed) {
      colorLog('\n提示:', 'yellow');
      colorLog('   1. 如果是您自己启动的开发服务器，请先关闭它', 'white');
      colorLog('   2. 如果是其他程序占用，请手动终止进程', 'white');
      colorLog('   3. 也可以使用 npm run dev:force 强制在 5173 端口启动', 'white');
      colorLog(`\n${'='.repeat(50)}`, 'white');
      process.exit(1);
    }
  } else {
    colorLog(`端口 ${PORT} 可用`, 'green');
  }

  colorLog(`\n启动 Vite 开发服务器 (端口: ${PORT})...\n`, 'green');

  const viteCliPath = resolveProjectCliPath('vite', 'bin', 'vite.js');
  const vite = exec(`"${process.execPath}" "${viteCliPath}"`, { cwd: ROOT_DIR });

  vite.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  vite.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  vite.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

process.on('SIGINT', () => {
  colorLog('\n\n开发服务器已停止', 'yellow');
  process.exit(0);
});

main().catch((error) => {
  colorLog(`\n启动失败: ${error.message}`, 'red');
  process.exit(1);
});
