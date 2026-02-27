import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const PORT = 5173;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkPort(port) {
  const platform = os.platform();
  const command = platform === 'win32'
    ? `netstat -ano | findstr ":${port} "`
    : `lsof -i:${port}`;

  try {
    const { stdout } = await execAsync(command);
    // 只返回真正监听该端口的行（包含 LISTENING）
    const lines = stdout.trim().split('\n').filter(line =>
      line.includes(`:${port} `) || line.includes(`:${port}.`)
    );
    return lines.join('\n');
  } catch (error) {
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
    // Windows系统处理
    const lines = portInfo.split('\n');
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    }

    if (pids.size > 0) {
      colorLog(`\n🔍 发现端口 ${port} 被以下进程占用:`, 'yellow');
      for (const pid of pids) {
        try {
          const { stdout: processInfo } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
          const info = processInfo.split('\n')[1];
          if (info) {
            const [imageName] = info.split(',');
            colorLog(`   - PID ${pid}: ${imageName.replace(/"/g, '')}`, 'cyan');
          }
        } catch (e) {
          colorLog(`   - PID ${pid}: (无法获取进程信息)`, 'cyan');
        }
      }

      colorLog('\n⚠️  正在尝试自动终止这些进程...', 'yellow');

      for (const pid of pids) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          colorLog(`   ✅ 成功终止 PID ${pid}`, 'green');
        } catch (error) {
          colorLog(`   ❌ 终止 PID ${pid} 失败: ${error.message}`, 'red');
        }
      }

      // 等待进程完全终止
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 再次检查
      const portStillUsed = await checkPort(port);
      if (portStillUsed) {
        colorLog('\n❌ 端口仍被占用，请手动处理:', 'red');
        colorLog(`   Windows用户请运行: taskkill /F /PID ${Array.from(pids).join(' /PID ')}`, 'white');
        return { killed: false, reason: 'Failed to kill processes' };
      } else {
        colorLog('\n✅ 端口已成功释放！', 'green');
        return { killed: true };
      }
    }
  } else {
    // macOS/Linux系统处理
    const pids = portInfo.trim().split('\n').filter(pid => pid.trim());

    if (pids.length > 0) {
      colorLog(`\n🔍 发现端口 ${port} 被以下进程占用:`, 'yellow');
      for (const pid of pids) {
        try {
          const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,comm=`);
          colorLog(`   - ${processInfo.trim()}`, 'cyan');
        } catch (e) {
          colorLog(`   - PID ${pid}: (无法获取进程信息)`, 'cyan');
        }
      }

      colorLog('\n⚠️  正在尝试自动终止这些进程...', 'yellow');

      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid.trim()}`);
          colorLog(`   ✅ 成功终止 PID ${pid.trim()}`, 'green');
        } catch (error) {
          colorLog(`   ❌ 终止 PID ${pid.trim()} 失败: ${error.message}`, 'red');
        }
      }

      // 等待进程完全终止
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 再次检查
      const portStillUsed = await checkPort(port);
      if (portStillUsed) {
        colorLog('\n❌ 端口仍被占用，请手动处理:', 'red');
        colorLog(`   请运行: kill -9 ${pids.join(' ')}`, 'white');
        return { killed: false, reason: 'Failed to kill processes' };
      } else {
        colorLog('\n✅ 端口已成功释放！', 'green');
        return { killed: true };
      }
    }
  }

  return { killed: false, reason: 'Unknown error' };
}

async function main() {
  colorLog('\n🚀 启动开发服务器...', 'bright');
  colorLog(`📍 检查端口 ${PORT} 状态...`, 'blue');

  const portInfo = await checkPort(PORT);

  if (portInfo) {
    colorLog(`⚠️  端口 ${PORT} 已被占用！`, 'yellow');

    const result = await killPortProcess(PORT);

    if (!result.killed) {
      colorLog('\n💡 提示:', 'yellow');
      colorLog('   1. 如果是您自己启动的开发服务器，请先关闭它', 'white');
      colorLog('   2. 如果是其他程序占用，请手动终止进程', 'white');
      colorLog('   3. 您可以使用 npm run dev:force 强制在5173端口启动', 'white');
      colorLog('\n' + '='.repeat(50), 'white');
      process.exit(1);
    }
  } else {
    colorLog(`✅ 端口 ${PORT} 可用`, 'green');
  }

  colorLog(`\n🎯 启动 Vite 开发服务器 (端口: ${PORT})...\n`, 'green');

  // 启动 Vite
  const vite = exec('vite', { cwd: path.join(__dirname, '..') });

  vite.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  vite.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  vite.on('close', (code) => {
    process.exit(code);
  });
}

// 处理 Ctrl+C
process.on('SIGINT', () => {
  colorLog('\n\n👋 开发服务器已停止', 'yellow');
  process.exit(0);
});

main().catch(error => {
  colorLog(`\n❌ 启动失败: ${error.message}`, 'red');
  process.exit(1);
});