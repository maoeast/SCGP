#!/usr/bin/env node
/**
 * 替换 alert 和 confirm 为 Element Plus 的消息提示
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const stats = {
  filesProcessed: 0,
  alertReplaced: 0,
  confirmReplaced: 0,
  filesModified: 0
};

const dirsToClean = [
  'src/components',
  'src/views',
  'src/stores',
  'src/utils'
];

const ignoreFiles = [
  'node_modules',
  'dist',
  'build',
  '.git'
];

function shouldIgnore(filePath) {
  return ignoreFiles.some(ignore => filePath.includes(ignore));
}

/**
 * 替换 alert 和 confirm
 */
function replaceAlertConfirm(content) {
  let modified = false;
  let newContent = content;

  // 替换 alert('消息') 为 ElMessage.info('消息')
  // 处理单行和双引号
  const alertPatternSingle = /alert\('([^']+)'\);?/g;
  const alertPatternDouble = /alert\("([^"]+)"\);?/g;

  let matches = newContent.match(alertPatternSingle) || [];
  matches = matches.concat(newContent.match(alertPatternDouble) || []);

  if (matches.length > 0) {
    stats.alertReplaced += matches.length;
    newContent = newContent.replace(alertPatternSingle, 'ElMessage.info(\'$1\')');
    newContent = newContent.replace(alertPatternDouble, 'ElMessage.info("$1")');
    modified = true;
  }

  // 替换 alert(变量) 为 ElMessage.error(变量)
  const alertVarPattern = /alert\(([^'"][^)]*)\);?/g;
  matches = newContent.match(alertVarPattern);
  if (matches) {
    newContent = newContent.replace(alertVarPattern, 'ElMessage.error($1)');
    modified = true;
  }

  // 替换 confirm('消息') - 需要手动处理异步逻辑
  // 这里只做简单标记，实际使用需要手动修改为 ElMessageBox.confirm
  const confirmPattern = /if\s*\(!confirm\('([^']+)'\)\)\s*return;?/g;
  matches = newContent.match(confirmPattern);
  if (matches) {
    stats.confirmReplaced += matches.length;
    // 标记需要手动处理的地方
    newContent = newContent.replace(
      confirmPattern,
      '// TODO: 替换为 ElMessageBox.confirm - $1\n// await ElMessageBox.confirm(\'$1\', \'提示\', { confirmButtonText: \'确定\', cancelButtonText: \'取消\' })\nreturn;'
    );
    modified = true;
  }

  // 清理多余的空行
  newContent = newContent.replace(/\n{3,}/g, '\n\n');

  return { content: newContent, modified };
}

function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { content: cleanedContent, modified } = replaceAlertConfirm(content);

    if (modified) {
      fs.writeFileSync(filePath, cleanedContent, 'utf-8');
      stats.filesModified++;
      console.log(`✅ 已处理: ${path.relative(projectRoot, filePath)}`);
    }

    stats.filesProcessed++;
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldIgnore(filePath)) {
        walkDirectory(filePath);
      }
    } else if (stat.isFile()) {
      if (/\.(ts|js|vue)$/.test(file)) {
        cleanFile(filePath);
      }
    }
  }
}

function main() {
  console.log('\n🔄 开始替换 alert/confirm...\n');

  for (const dir of dirsToClean) {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`\n📂 扫描目录: ${dir}`);
      walkDirectory(dirPath);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 替换统计:');
  console.log('='.repeat(50));
  console.log(`处理文件数:     ${stats.filesProcessed}`);
  console.log(`修改文件数:     ${stats.filesModified}`);
  console.log(`替换 alert:     ${stats.alertReplaced}`);
  console.log(`标记 confirm:   ${stats.confirmReplaced}`);
  console.log('='.repeat(50));
  console.log('\n⚠️  confirm 替换已标记为 TODO，需要手动处理异步逻辑\n');
}

main();
