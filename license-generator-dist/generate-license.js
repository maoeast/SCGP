/**
 * 激活码生成器
 * 用于生成试用或正式授权码，并可按授权能力包输出授权子集。
 *
 * 示例:
 * 1. 试用码: node generate-license.js --trial
 * 2. 正式码: node generate-license.js --machine <机器码> --days <天数>
 * 3. 永久码: node generate-license.js --machine <机器码> --permanent
 * 4. 子集授权: node generate-license.js --machine <机器码> --days 365 --entitlements sensory_integration,social_communication
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RSA_KEY_SIZE = 2048;
const LICENSE_VERSION = '1.0';
const KEY_DIR = path.join(__dirname, '.keys');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public.pem');
const ENTITLEMENT_CODES = Object.freeze([
    'sensory_integration',
    'emotional',
    'social_communication',
    'fine_motor',
    'soothing_aids',
    'life_skills',
    'cognitive'
]);

function generateRSAKeys() {
    console.log('正在生成 RSA 密钥对...');
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

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, 'utf8');
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, 'utf8');

    console.log('RSA 密钥对生成完成');
    console.log(`   私钥: ${PRIVATE_KEY_PATH}`);
    console.log(`   公钥: ${PUBLIC_KEY_PATH}`);
    console.log('请妥善保管私钥，不要泄露');

    return { privateKey, publicKey };
}

function loadRSAKeys() {
    if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
        console.log('未找到 RSA 密钥，将自动生成...');
        return generateRSAKeys();
    }

    return {
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
        publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8')
    };
}

function copyPublicKeyToProject() {
    const destPath = path.join(__dirname, 'public-key.pem');

    try {
        fs.writeFileSync(destPath, fs.readFileSync(PUBLIC_KEY_PATH, 'utf8'), 'utf8');
        return destPath;
    } catch (error) {
        console.warn(`公钥同步到 ${destPath} 失败: ${error.message}`);
        return null;
    }
}

function initializeKeys(options = {}) {
    loadRSAKeys();

    if (options.syncPublicKeyToProject === false) {
        return {
            keyDir: KEY_DIR,
            publicKeyPath: null
        };
    }

    return {
        keyDir: KEY_DIR,
        publicKeyPath: copyPublicKeyToProject()
    };
}

function getDefaultEntitlements() {
    return [...ENTITLEMENT_CODES];
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN');
}

function formatEntitlements(entitlements) {
    return entitlements.join(', ');
}

function normalizeEntitlements(entitlements) {
    if (entitlements === undefined || entitlements === null) {
        return getDefaultEntitlements();
    }

    const requestedEntitlements = (Array.isArray(entitlements) ? entitlements : [entitlements])
        .flatMap((token) => String(token).split(','))
        .map((entitlementCode) => entitlementCode.trim().toLowerCase())
        .filter(Boolean);

    if (requestedEntitlements.length === 0) {
        throw new Error('至少选择一个授权能力包');
    }

    const invalidEntitlements = requestedEntitlements.filter((entitlementCode) => !ENTITLEMENT_CODES.includes(entitlementCode));
    if (invalidEntitlements.length > 0) {
        throw new Error(
            `存在不支持的授权能力包编码: ${invalidEntitlements.join(', ')}；仅允许: ${ENTITLEMENT_CODES.join(', ')}`
        );
    }

    return [...new Set(requestedEntitlements)];
}

function resolveEntitlements(args) {
    const entitlementsIndex = args.indexOf('--entitlements');
    const modulesAliasIndex = args.indexOf('--modules');
    const targetIndex = entitlementsIndex !== -1 ? entitlementsIndex : modulesAliasIndex;

    if (targetIndex === -1) {
        return getDefaultEntitlements();
    }

    const entitlementTokens = [];
    for (let i = targetIndex + 1; i < args.length; i++) {
        const currentArg = args[i];
        if (currentArg.startsWith('--')) {
            break;
        }
        entitlementTokens.push(currentArg);
    }

    if (entitlementTokens.length === 0) {
        throw new Error('`--entitlements` / `--modules` 后必须提供至少一个授权能力包编码');
    }

    return normalizeEntitlements(entitlementTokens);
}

function generateTrialLicense(entitlements = getDefaultEntitlements()) {
    return {
        t: 'trial',
        v: LICENSE_VERSION,
        c: Date.now(),
        e: Date.now() + 7 * 24 * 60 * 60 * 1000,
        m: '*',
        am: [...entitlements]
    };
}

function generateFullLicense(machineId, days = null, entitlements = getDefaultEntitlements()) {
    return {
        t: 'full',
        v: LICENSE_VERSION,
        m: machineId,
        c: Date.now(),
        e: days ? Date.now() + days * 24 * 60 * 60 * 1000 : null,
        am: [...entitlements],
        p: !days
    };
}

function encryptLicenseData(licenseData, privateKey) {
    const jsonData = JSON.stringify(licenseData);
    const dataBuffer = Buffer.from(jsonData, 'utf8');

    const signature = crypto.sign('sha256', dataBuffer, {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    });

    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(dataBuffer.length, 0);

    return Buffer.concat([lengthBuffer, dataBuffer, signature]).toString('base64');
}

function formatLicenseKey(base64Key) {
    const groups = [];
    for (let i = 0; i < base64Key.length; i += 5) {
        groups.push(base64Key.slice(i, i + 5));
    }

    return 'SPED-' + groups.join('-');
}

function createLicenseFileContent(artifact) {
    const { summary, formattedKey } = artifact;
    const lines = [
        `激活码类型: ${summary.typeLabel}`,
        `机器码: ${summary.machineIdLabel}`,
        `有效期: ${summary.validityLabel}`,
        `创建时间: ${summary.createdAtLabel}`
    ];

    if (summary.expireAtLabel) {
        lines.push(`过期时间: ${summary.expireAtLabel}`);
    }

    lines.push(`授权能力包: ${summary.entitlementsLabel}`);
    lines.push('');
    lines.push('激活码:');
    lines.push(formattedKey);
    lines.push('');

    return lines.join('\n');
}

function writeLicenseFile(filename, content, outputDir = process.cwd()) {
    const resolvedOutputDir = path.resolve(outputDir);
    fs.mkdirSync(resolvedOutputDir, { recursive: true });

    const outputPath = path.join(resolvedOutputDir, filename);
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
}

function buildSummary(licenseData, entitlements, type, machineId, days) {
    const isPermanent = type === 'permanent';
    const isTrial = type === 'trial';

    return {
        type,
        typeLabel: isTrial ? '试用版' : '正式版',
        machineIdLabel: isTrial ? '不绑定机器码' : machineId,
        validityLabel: isTrial ? '7天' : isPermanent ? '永久' : `${days}天`,
        createdAtLabel: formatTimestamp(licenseData.c),
        expireAtLabel: licenseData.e ? formatTimestamp(licenseData.e) : '',
        entitlements,
        entitlementsLabel: formatEntitlements(entitlements),
        isPermanent,
        isTrial
    };
}

function generateLicenseArtifact(options) {
    const {
        type,
        machineId = '',
        days,
        entitlements,
        outputDir = process.cwd(),
        syncPublicKeyToProject = false
    } = options || {};

    if (!['trial', 'full', 'permanent'].includes(type)) {
        throw new Error('授权类型无效，只允许 trial / full / permanent');
    }

    const normalizedEntitlements = normalizeEntitlements(entitlements);
    const { privateKey } = loadRSAKeys();

    let publicKeyPath = null;
    if (syncPublicKeyToProject) {
        publicKeyPath = copyPublicKeyToProject();
    }

    let parsedMachineId = String(machineId).trim();
    let parsedDays = null;
    let licenseData;
    let filename;

    if (type === 'trial') {
        licenseData = generateTrialLicense(normalizedEntitlements);
        filename = `trial_license_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    } else {
        if (!parsedMachineId) {
            throw new Error('机器码不能为空');
        }

        if (type === 'full') {
            parsedDays = Number.parseInt(String(days), 10);
            if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
                throw new Error('正式授权的天数必须是正整数');
            }
        }

        licenseData = generateFullLicense(parsedMachineId, type === 'permanent' ? null : parsedDays, normalizedEntitlements);
        filename = `license_${parsedMachineId.slice(0, 8)}_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    }

    const formattedKey = formatLicenseKey(encryptLicenseData(licenseData, privateKey));
    const summary = buildSummary(
        licenseData,
        normalizedEntitlements,
        type,
        parsedMachineId,
        parsedDays
    );
    const fileContent = createLicenseFileContent({
        formattedKey,
        summary
    });
    const outputPath = writeLicenseFile(filename, fileContent, outputDir);

    return {
        filename,
        formattedKey,
        fileContent,
        outputPath,
        publicKeyPath,
        licenseData,
        summary
    };
}

function printUsage() {
    console.log(`
============================================================
SCGP License Generator v${LICENSE_VERSION}
============================================================

Usage:
  node generate-license.js --trial [--entitlements sensory_integration,social_communication]
  node generate-license.js --machine <machineId> --days <days> [--entitlements sensory_integration,social_communication]
  node generate-license.js --machine <machineId> --permanent [--entitlements fine_motor,soothing_aids]
  node generate-license.js --init

Entitlements:
  --entitlements 推荐参数，仅允许授权能力包编码，可用逗号或空格分隔。
  --modules 为兼容别名，行为与 --entitlements 相同。
  Allowed values: ${ENTITLEMENT_CODES.join(', ')}
  省略参数时，默认授权全部能力包。

Examples:
  node generate-license.js --trial --entitlements sensory_integration emotional
  node generate-license.js --machine ABC123DEF456 --days 365 --modules sensory_integration,social_communication
  node generate-license.js --machine ABC123DEF456 --permanent
`);
}

function printArtifactResult(artifact) {
    console.log('\n' + '='.repeat(60));
    console.log('激活码信息:');
    console.log(`   类型: ${artifact.summary.typeLabel}`);
    console.log(`   机器码: ${artifact.summary.machineIdLabel}`);
    console.log(`   有效期: ${artifact.summary.validityLabel}`);
    console.log(`   创建时间: ${artifact.summary.createdAtLabel}`);
    if (artifact.summary.expireAtLabel) {
        console.log(`   过期时间: ${artifact.summary.expireAtLabel}`);
    }
    console.log(`   授权能力包: ${artifact.summary.entitlementsLabel}`);
    console.log('\n激活码:');
    console.log(`\n   ${artifact.formattedKey}\n`);
    console.log(`已保存到文件: ${artifact.outputPath}`);
    console.log('='.repeat(60));
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        return;
    }

    if (args.includes('--init')) {
        const initResult = initializeKeys({ syncPublicKeyToProject: false });
        console.log('密钥初始化完成');
        console.log(`   密钥目录: ${initResult.keyDir}`);
        return;
    }

    let entitlements;
    try {
        entitlements = resolveEntitlements(args);
    } catch (error) {
        console.log(`错误: ${error.message}`);
        printUsage();
        return;
    }

    try {
        let artifact;

        if (args.includes('--trial')) {
            artifact = generateLicenseArtifact({
                type: 'trial',
                entitlements
            });
        } else {
            const machineIdIndex = args.indexOf('--machine');
            if (machineIdIndex === -1) {
                console.log('错误: 缺少 --machine 参数');
                printUsage();
                return;
            }

            const machineId = args[machineIdIndex + 1];
            if (!machineId || machineId.startsWith('--')) {
                console.log('错误: --machine 参数值不能为空');
                return;
            }

            if (args.includes('--permanent')) {
                artifact = generateLicenseArtifact({
                    type: 'permanent',
                    machineId,
                    entitlements
                });
            } else {
                const daysIndex = args.indexOf('--days');
                if (daysIndex === -1) {
                    console.log('错误: 缺少 --days 或 --permanent 参数');
                    printUsage();
                    return;
                }

                const parsedDays = Number.parseInt(args[daysIndex + 1], 10);
                artifact = generateLicenseArtifact({
                    type: 'full',
                    machineId,
                    days: parsedDays,
                    entitlements
                });
            }
        }

        printArtifactResult(artifact);
    } catch (error) {
        console.log(`错误: ${error.message}`);
    }
}

module.exports = {
    KEY_DIR,
    LICENSE_VERSION,
    ENTITLEMENT_CODES,
    formatEntitlements,
    formatTimestamp,
    generateLicenseArtifact,
    getDefaultEntitlements,
    initializeKeys,
    normalizeEntitlements,
    resolveEntitlements
};

if (require.main === module) {
    main();
}
