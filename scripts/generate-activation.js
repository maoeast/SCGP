#!/usr/bin/env node
/**
 * 激活码生成工具
 * 用于生成各种类型的激活码
 */

import crypto from 'crypto';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 激活码类型配置
const LICENSE_TYPES = {
  full: {
    name: '永久激活',
    prefix: 'FULL',
    days: null,
    description: '永久有效，无时间限制'
  },
  education: {
    name: '教育版',
    prefix: 'EDU',
    days: 365,
    description: '有效期1年，适用于教育机构'
  },
  enterprise: {
    name: '企业版',
    prefix: 'ENT',
    days: 1095, // 3年
    description: '有效期3年，适用于企业用户'
  },
  trial: {
    name: '试用版',
    prefix: 'TRIAL',
    days: 7,
    description: '7天试用期'
  }
};

/**
 * 生成机器指纹哈希
 */
function generateMachineHash(machineCode) {
  return crypto.createHash('sha256').update(machineCode).digest('hex').substring(0, 8).toUpperCase();
}

/**
 * 生成激活码签名
 */
function generateSignature(code, secret = 'SPED-SAFE-EDU-2025-SECRET-KEY') {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(code);
  return hmac.digest('hex').substring(0, 4).toUpperCase();
}

/**
 * 生成随机字符
 */
function randomChar(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成激活码
 * @param {string} type - 激活类型 (full, education, enterprise, trial)
 * @param {string} machineCode - 机器码（可选）
 * @returns {object} 激活码信息
 */
function generateActivationCode(type = 'full', machineCode = null) {
  const config = LICENSE_TYPES[type];

  if (!config) {
    throw new Error(`无效的激活类型: ${type}`);
  }

  const prefix = 'SPED';
  const typePart = config.prefix;

  // 机器码部分
  let machinePart;
  if (machineCode) {
    // 如果提供了机器码，使用机器码的哈希
    machinePart = generateMachineHash(machineCode).substring(0, 4);
  } else {
    // 否则使用随机字符
    machinePart = randomChar(4);
  }

  // 随机部分
  const randomPart = randomChar(4);

  // 生成签名
  const baseCode = `${prefix}-${typePart}-${machinePart}-${randomPart}`;
  const signature = generateSignature(baseCode);

  // 完整激活码
  const activationCode = `${baseCode}-${signature}`;

  // 计算过期时间
  let expiresAt = null;
  if (config.days) {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + config.days);
    expiresAt = expireDate.toISOString();
  }

  return {
    code: activationCode,
    type: type,
    typeName: config.name,
    description: config.description,
    machineCode: machineCode || '未绑定',
    validDays: config.days,
    expiresAt: expiresAt,
    generatedAt: new Date().toISOString()
  };
}

/**
 * 批量生成激活码
 */
function batchGenerate(type, count, machineCode = null) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(generateActivationCode(type, machineCode));
  }
  return results;
}

/**
 * 导出激活码到文件
 */
function exportToFile(codes, filename) {
  const outputPath = path.join(process.cwd(), filename);

  if (filename.endsWith('.json')) {
    fs.writeFileSync(outputPath, JSON.stringify(codes, null, 2), 'utf-8');
  } else if (filename.endsWith('.csv')) {
    const headers = '激活码,类型,类型名称,机器码,有效期(天),过期时间,生成时间\n';
    const rows = codes.map(c =>
      `${c.code},${c.type},${c.typeName},${c.machineCode},${c.validDays || '永久'},${c.expiresAt || '永久'},${c.generatedAt}`
    ).join('\n');
    fs.writeFileSync(outputPath, headers + rows, 'utf-8');
  } else if (filename.endsWith('.txt')) {
    const content = codes.map(c =>
      `${c.code} - ${c.typeName}${c.machineCode !== '未绑定' ? ` (绑定: ${c.machineCode})` : ''}`
    ).join('\n');
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  colorLog(`\n✅ 激活码已导出到: ${outputPath}`, 'green');
}

/**
 * 显示激活码信息
 */
function displayCodeInfo(codeInfo) {
  colorLog('\n' + '='.repeat(70), 'cyan');
  colorLog('📋 生成的激活码信息', 'bright');
  colorLog('='.repeat(70), 'cyan');

  colorLog(`\n🔑 激活码:`, 'yellow');
  colorLog(`   ${codeInfo.code}`, 'bright');

  colorLog(`\n📦 类型:`, 'yellow');
  colorLog(`   ${codeInfo.typeName} (${codeInfo.type})`, 'white');

  colorLog(`\n📝 描述:`, 'yellow');
  colorLog(`   ${codeInfo.description}`, 'white');

  colorLog(`\n🖥️  机器码:`, 'yellow');
  colorLog(`   ${codeInfo.machineCode}`, 'white');

  if (codeInfo.validDays) {
    colorLog(`\n⏰ 有效期:`, 'yellow');
    colorLog(`   ${codeInfo.validDays} 天`, 'white');

    colorLog(`\n📅 过期时间:`, 'yellow');
    colorLog(`   ${new Date(codeInfo.expiresAt).toLocaleString('zh-CN')}`, 'white');
  } else {
    colorLog(`\n⏰ 有效期:`, 'yellow');
    colorLog(`   永久有效`, 'green');
  }

  colorLog(`\n🕐 生成时间:`, 'yellow');
  colorLog(`   ${new Date(codeInfo.generatedAt).toLocaleString('zh-CN')}`, 'white');

  colorLog('\n' + '='.repeat(70), 'cyan');
}

/**
 * 创建交互式命令行界面
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 提示用户输入
 */
function question(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * 交互式模式
 */
async function interactiveMode() {
  const rl = createInterface();

  try {
    colorLog('\n🔐 激活码生成工具 - 交互模式', 'bright');
    colorLog('='.repeat(50), 'cyan');

    // 选择激活类型
    colorLog('\n可用的激活类型:', 'yellow');
    Object.entries(LICENSE_TYPES).forEach(([key, config]) => {
      colorLog(`  ${key.padEnd(12)} - ${config.name.padEnd(8)} - ${config.description}`, 'white');
    });

    const typeInput = await question(rl, '\n请选择激活类型 (默认: full): ');
    const type = typeInput.trim() || 'full';

    if (!LICENSE_TYPES[type]) {
      colorLog(`\n❌ 无效的激活类型: ${type}`, 'red');
      rl.close();
      return;
    }

    // 是否绑定机器码
    const bindMachine = await question(rl, '\n是否绑定特定机器码? (y/N): ');
    let machineCode = null;

    if (bindMachine.toLowerCase() === 'y') {
      machineCode = await question(rl, '请输入机器码: ');
      if (!machineCode.trim()) {
        colorLog('\n⚠️  机器码为空，将生成通用激活码', 'yellow');
      } else {
        machineCode = machineCode.trim();
        colorLog(`\n✅ 将绑定机器码: ${machineCode}`, 'green');
      }
    }

    // 生成数量
    const countInput = await question(rl, '\n生成数量 (默认: 1): ');
    const count = Math.max(1, Math.min(100, parseInt(countInput) || 1));

    colorLog(`\n🔄 正在生成 ${count} 个${LICENSE_TYPES[type].name}激活码...\n`, 'blue');

    // 生成激活码
    const codes = batchGenerate(type, count, machineCode);

    // 显示结果
    if (count === 1) {
      displayCodeInfo(codes[0]);
    } else {
      colorLog(`\n✅ 成功生成 ${count} 个激活码:\n`, 'green');
      codes.forEach((code, index) => {
        colorLog(`  ${index + 1}. ${code.code}`, 'white');
      });
    }

    // 是否导出
    const exportChoice = await question(rl, '\n是否导出到文件? (y/N): ');

    if (exportChoice.toLowerCase() === 'y') {
      const formatChoice = await question(rl, '选择格式 (1=JSON, 2=CSV, 3=TXT, 默认=JSON): ');
      let format = 'json';

      if (formatChoice === '2') format = 'csv';
      else if (formatChoice === '3') format = 'txt';

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `activation-codes-${type}-${timestamp}.${format}`;

      exportToFile(codes, filename);
    }

  } catch (error) {
    colorLog(`\n❌ 错误: ${error.message}`, 'red');
  } finally {
    rl.close();
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  colorLog('\n🔐 激活码生成工具', 'bright');
  colorLog('='.repeat(50), 'cyan');

  colorLog('\n用法:', 'yellow');
  colorLog('  node scripts/generate-activation.js [选项] [参数]', 'white');

  colorLog('\n选项:', 'yellow');
  colorLog('  -i, --interactive     交互式模式', 'white');
  colorLog('  -t, --type <类型>     激活类型 (full|education|enterprise|trial)', 'white');
  colorLog('  -m, --machine <码>    绑定机器码', 'white');
  colorLog('  -c, --count <数量>    生成数量 (1-100)', 'white');
  colorLog('  -o, --output <文件>   导出到文件 (支持 .json, .csv, .txt)', 'white');
  colorLog('  -h, --help            显示帮助信息', 'white');

  colorLog('\n激活类型:', 'yellow');
  Object.entries(LICENSE_TYPES).forEach(([key, config]) => {
    colorLog(`  ${key.padEnd(12)} - ${config.name}`, 'white');
  });

  colorLog('\n示例:', 'yellow');
  colorLog('  # 交互式模式', 'white');
  colorLog('  node scripts/generate-activation.js -i', 'white');
  colorLog('  npm run generate:activation', 'white');

  colorLog('\n  # 生成一个永久激活码', 'white');
  colorLog('  node scripts/generate-activation.js -t full', 'white');

  colorLog('\n  # 生成5个教育版激活码并导出', 'white');
  colorLog('  node scripts/generate-activation.js -t education -c 5 -o codes.json', 'white');

  colorLog('\n  # 为指定机器码生成激活码', 'white');
  colorLog('  node scripts/generate-activation.js -t full -m A1B2C3D4', 'white');

  colorLog('\n' + '='.repeat(50), 'cyan');
}

/**
 * 命令行模式
 */
function commandLineMode(args) {
  const options = {
    type: 'full',
    machine: null,
    count: 1,
    output: null
  };

  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-i' || arg === '--interactive') {
      interactiveMode();
      return;
    } else if (arg === '-h' || arg === '--help') {
      showHelp();
      return;
    } else if (arg === '-t' || arg === '--type') {
      options.type = args[++i];
    } else if (arg === '-m' || arg === '--machine') {
      options.machine = args[++i];
    } else if (arg === '-c' || arg === '--count') {
      options.count = Math.max(1, Math.min(100, parseInt(args[++i]) || 1));
    } else if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    }
  }

  // 验证类型
  if (!LICENSE_TYPES[options.type]) {
    colorLog(`\n❌ 无效的激活类型: ${options.type}`, 'red');
    colorLog('运行 -h 查看帮助信息', 'yellow');
    process.exit(1);
  }

  try {
    colorLog(`\n🔄 正在生成 ${options.count} 个${LICENSE_TYPES[options.type].name}激活码...\n`, 'blue');

    // 生成激活码
    const codes = batchGenerate(options.type, options.count, options.machine);

    // 显示结果
    if (options.count === 1) {
      displayCodeInfo(codes[0]);
    } else {
      colorLog(`\n✅ 成功生成 ${options.count} 个激活码:\n`, 'green');
      codes.forEach((code, index) => {
        colorLog(`  ${index + 1}. ${code.code}`, 'white');
      });
    }

    // 导出到文件
    if (options.output) {
      exportToFile(codes, options.output);
    }

  } catch (error) {
    colorLog(`\n❌ 错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    interactiveMode();
  } else {
    commandLineMode(args);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  colorLog(`\n❌ 未捕获的异常: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  colorLog(`\n❌ 未处理的Promise拒绝: ${reason}`, 'red');
  process.exit(1);
});

// 运行
main();
