/**
 * 激活码生成器
 * 用于生成试用或正式授权码，并可按顶层模块输出授权子集。
 *
 * 示例:
 * 1. 试用码: node generate-license.js --trial
 * 2. 正式码: node generate-license.js --machine <机器码> --days <天数>
 * 3. 永久码: node generate-license.js --machine <机器码> --permanent
 * 4. 子集授权: node generate-license.js --machine <机器码> --days 365 --modules sensory,social
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RSA_KEY_SIZE = 2048;
const LICENSE_VERSION = '1.0';
const KEY_DIR = path.join(__dirname, '.keys');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public.pem');
const TOP_LEVEL_MODULE_CODES = Object.freeze([
    'sensory',
    'emotional',
    'social',
    'cognitive',
    'life_skills'
]);

function generateRSAKeys() {
    console.log('🔐 正在生成 RSA 密钥对...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: RSA_KEY_SIZE,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    if (!fs.existsSync(KEY_DIR)) {
        fs.mkdirSync(KEY_DIR, { recursive: true });
    }

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

    console.log('✅ RSA 密钥对生成完成');
    console.log(`   私钥: ${PRIVATE_KEY_PATH}`);
    console.log(`   公钥: ${PUBLIC_KEY_PATH}`);
    console.log('⚠️  请妥善保管私钥，不要泄露');

    return { privateKey, publicKey };
}

function loadRSAKeys() {
    if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
        console.log('⚠️  未找到 RSA 密钥，将自动生成...');
        return generateRSAKeys();
    }

    return {
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
        publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8')
    };
}

function copyPublicKeyToProject() {
    const destPath = path.join(__dirname, 'public-key.pem');
    fs.copyFileSync(PUBLIC_KEY_PATH, destPath);
    console.log(`✅ 公钥已复制到: ${destPath}`);
}

function getDefaultAllowedModules() {
    return [...TOP_LEVEL_MODULE_CODES];
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN');
}

function formatAllowedModules(allowedModules) {
    return allowedModules.join(', ');
}

function resolveAllowedModules(args) {
    const modulesIndex = args.indexOf('--modules');
    if (modulesIndex === -1) {
        return getDefaultAllowedModules();
    }

    const moduleTokens = [];
    for (let i = modulesIndex + 1; i < args.length; i++) {
        const currentArg = args[i];
        if (currentArg.startsWith('--')) {
            break;
        }
        moduleTokens.push(currentArg);
    }

    if (moduleTokens.length === 0) {
        throw new Error('`--modules` 后必须提供至少一个顶层模块编码');
    }

    const requestedModules = moduleTokens
        .flatMap((token) => token.split(','))
        .map((moduleCode) => moduleCode.trim().toLowerCase())
        .filter(Boolean);

    if (requestedModules.length === 0) {
        throw new Error('`--modules` 未解析出有效模块编码');
    }

    const invalidModules = requestedModules.filter((moduleCode) => !TOP_LEVEL_MODULE_CODES.includes(moduleCode));
    if (invalidModules.length > 0) {
        throw new Error(
            `存在不支持的顶层模块编码: ${invalidModules.join(', ')}；仅允许: ${TOP_LEVEL_MODULE_CODES.join(', ')}`
        );
    }

    return [...new Set(requestedModules)];
}

function generateTrialLicense(allowedModules = getDefaultAllowedModules()) {
    return {
        t: 'trial',
        v: LICENSE_VERSION,
        c: Date.now(),
        e: Date.now() + 7 * 24 * 60 * 60 * 1000,
        m: '*',
        am: [...allowedModules]
    };
}

function generateFullLicense(machineId, days = null, allowedModules = getDefaultAllowedModules()) {
    return {
        t: 'full',
        v: LICENSE_VERSION,
        m: machineId,
        c: Date.now(),
        e: days ? Date.now() + days * 24 * 60 * 60 * 1000 : null,
        am: [...allowedModules],
        p: !days
    };
}

function encryptLicenseData(licenseData, privateKey) {
    const jsonData = JSON.stringify(licenseData);
    const dataBuffer = Buffer.from(jsonData, 'utf8');

    console.log('原始数据:', jsonData);
    console.log('数据长度:', dataBuffer.length);

    const signature = crypto.sign('sha256', dataBuffer, {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    });

    console.log('签名长度:', signature.length);

    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(dataBuffer.length, 0);

    const combined = Buffer.concat([lengthBuffer, dataBuffer, signature]);
    console.log('组合后长度:', combined.length);

    const base64 = combined.toString('base64');
    console.log('Base64 长度:', base64.length);

    return base64;
}

function formatLicenseKey(base64Key) {
    const groups = [];
    for (let i = 0; i < base64Key.length; i += 5) {
        groups.push(base64Key.slice(i, i + 5));
    }

    return 'SPED-' + groups.join('-');
}

function printUsage() {
    console.log(`
============================================================
SCGP License Generator v${LICENSE_VERSION}
============================================================

Usage:
  node generate-license.js --trial [--modules sensory,social]
  node generate-license.js --machine <machineId> --days <days> [--modules sensory,social]
  node generate-license.js --machine <machineId> --permanent [--modules sensory,social]
  node generate-license.js --init

Modules:
  --modules 仅允许顶层模块编码，可用逗号或空格分隔。
  Allowed values: ${TOP_LEVEL_MODULE_CODES.join(', ')}
  省略 --modules 时，默认授权全部 5 个顶层模块。

Examples:
  node generate-license.js --trial --modules sensory emotional
  node generate-license.js --machine ABC123DEF456 --days 365 --modules sensory,social
  node generate-license.js --machine ABC123DEF456 --permanent
`);
}

function writeLicenseFile(filename, content) {
    fs.writeFileSync(filename, content);
    console.log(`📑 已保存到文件: ${filename}\n`);
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        return;
    }

    const { privateKey } = loadRSAKeys();
    copyPublicKeyToProject();

    console.log('\n' + '='.repeat(60));

    if (args.includes('--init')) {
        console.log('✅ 密钥初始化完成');
        return;
    }

    let allowedModules;
    try {
        allowedModules = resolveAllowedModules(args);
    } catch (error) {
        console.log(`❌ 错误: ${error.message}`);
        printUsage();
        return;
    }

    if (args.includes('--trial')) {
        console.log('🎆 生成试用激活码...\n');
        const licenseData = generateTrialLicense(allowedModules);
        const encrypted = encryptLicenseData(licenseData, privateKey);
        const formatted = formatLicenseKey(encrypted);

        console.log('📫 激活码信息:');
        console.log('   类型: 试用版');
        console.log('   有效期: 7天');
        console.log(`   创建时间: ${formatTimestamp(licenseData.c)}`);
        console.log(`   过期时间: ${formatTimestamp(licenseData.e)}`);
        console.log(`   授权模块: ${formatAllowedModules(licenseData.am)}`);
        console.log('\n📽 激活码:');
        console.log(`\n   ${formatted}\n`);
        console.log('='.repeat(60));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `trial_license_${timestamp}.txt`;
        writeLicenseFile(
            filename,
            `激活码类型: 试用版
有效期: 7天
创建时间: ${formatTimestamp(licenseData.c)}
过期时间: ${formatTimestamp(licenseData.e)}
授权模块: ${formatAllowedModules(licenseData.am)}

激活码:
${formatted}
`
        );

        return;
    }

    const machineIdIndex = args.indexOf('--machine');
    if (machineIdIndex === -1) {
        console.log('❌ 错误: 缺少 --machine 参数');
        printUsage();
        return;
    }

    const machineId = args[machineIdIndex + 1];
    if (!machineId || machineId.startsWith('--')) {
        console.log('❌ 错误: --machine 参数值不能为空');
        return;
    }

    const isPermanent = args.includes('--permanent');
    let days = null;

    if (!isPermanent) {
        const daysIndex = args.indexOf('--days');
        if (daysIndex === -1) {
            console.log('❌ 错误: 缺少 --days 或 --permanent 参数');
            printUsage();
            return;
        }

        days = parseInt(args[daysIndex + 1], 10);
        if (Number.isNaN(days) || days <= 0) {
            console.log('❌ 错误: --days 参数必须是正整数');
            return;
        }
    }

    console.log('🎆 生成正式激活码...\n');
    const licenseData = generateFullLicense(machineId, isPermanent ? null : days, allowedModules);
    const encrypted = encryptLicenseData(licenseData, privateKey);
    const formatted = formatLicenseKey(encrypted);

    console.log('📫 激活码信息:');
    console.log('   类型: 正式版');
    console.log(`   机器码: ${machineId}`);
    console.log(`   有效期: ${isPermanent ? '永久' : `${days}天`}`);
    console.log(`   创建时间: ${formatTimestamp(licenseData.c)}`);
    if (!isPermanent) {
        console.log(`   过期时间: ${formatTimestamp(licenseData.e)}`);
    }
    console.log(`   授权模块: ${formatAllowedModules(licenseData.am)}`);
    console.log('\n📽 激活码:');
    console.log(`\n   ${formatted}\n`);
    console.log('='.repeat(60));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `license_${machineId.slice(0, 8)}_${timestamp}.txt`;
    writeLicenseFile(
        filename,
        `激活码类型: 正式版
机器码: ${machineId}
有效期: ${isPermanent ? '永久' : `${days}天`}
创建时间: ${formatTimestamp(licenseData.c)}
${!isPermanent ? `过期时间: ${formatTimestamp(licenseData.e)}\n` : ''}授权模块: ${formatAllowedModules(licenseData.am)}

激活码:
${formatted}
`
    );
}

main();
