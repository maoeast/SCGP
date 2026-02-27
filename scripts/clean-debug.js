#!/usr/bin/env node
/**
 * 清理调试代码脚本
 * 移除 console.log, console.error, console.warn, console.debug, console.info 等调试语句
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 统计信息
const stats = {
  filesProcessed: 0,
  consoleLogRemoved: 0,
  consoleErrorRemoved: 0,
  consoleWarnRemoved: 0,
  consoleDebugRemoved: 0,
  consoleInfoRemoved: 0,
  filesModified: 0
};

/**
 * 需要清理的目录
 */
const dirsToClean = [
  'src/components',
  'src/views',
  'src/stores',
  'src/utils',
  'src/database',
  'src/router'
];

/**
 * 需要忽略的文件
 */
const ignoreFiles = [
  'node_modules',
  'dist',
  'build',
  '.git'
];

/**
 * 检查是否应该忽略该文件
 */
function shouldIgnore(filePath) {
  return ignoreFiles.some(ignore => filePath.includes(ignore));
}

/**
 * 清理文件中的 console 语句
 */
function cleanConsoleStatements(content) {
  let modified = false;
  let newContent = content;

  // 移除 console.log
  const logMatches = newContent.match(/console\.log\([^)]*\);?\s*\n?/g);
  if (logMatches) {
    stats.consoleLogRemoved += logMatches.length;
    newContent = newContent.replace(/console\.log\([^)]*\);?\s*\n?/g, '');
    modified = true;
  }

  // 移除 console.error (保留重要错误的处理逻辑，只移除纯日志输出)
  const errorMatches = newContent.match(/console\.error\([^)]*\);?\s*\n?/g);
  if (errorMatches) {
    stats.consoleErrorRemoved += errorMatches.length;
    newContent = newContent.replace(/console\.error\([^)]*\);?\s*\n?/g, '');
    modified = true;
  }

  // 移除 console.warn
  const warnMatches = newContent.match(/console\.warn\([^)]*\);?\s*\n?/g);
  if (warnMatches) {
    stats.consoleWarnRemoved += warnMatches.length;
    newContent = newContent.replace(/console\.warn\([^)]*\);?\s*\n?/g, '');
    modified = true;
  }

  // 移除 console.debug
  const debugMatches = newContent.match(/console\.debug\([^)]*\);?\s*\n?/g);
  if (debugMatches) {
    stats.consoleDebugRemoved += debugMatches.length;
    newContent = newContent.replace(/console\.debug\([^)]*\);?\s*\n?/g, '');
    modified = true;
  }

  // 移除 console.info
  const infoMatches = newContent.match(/console\.info\([^)]*\);?\s*\n?/g);
  if (infoMatches) {
    stats.consoleInfoRemoved += infoMatches.length;
    newContent = newContent.replace(/console\.info\([^)]*\);?\s*\n?/g, '');
    modified = true;
  }

  // 清理多余的空行（连续两个以上的空行合并为一个）
  newContent = newContent.replace(/\n{3,}/g, '\n\n');

  return { content: newContent, modified };
}

/**
 * 清理单个文件
 */
function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { content: cleanedContent, modified } = cleanConsoleStatements(content);

    if (modified) {
      fs.writeFileSync(filePath, cleanedContent, 'utf-8');
      stats.filesModified++;
      console.log(`✅ 已清理: ${path.relative(projectRoot, filePath)}`);
    }

    stats.filesProcessed++;
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
  }
}

/**
 * 递归遍历目录
 */
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
      // 只处理 .ts, .js, .vue 文件
      if (/\.(ts|js|vue)$/.test(file)) {
        cleanFile(filePath);
      }
    }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('\n🧹 开始清理调试代码...\n');

  for (const dir of dirsToClean) {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`\n📂 扫描目录: ${dir}`);
      walkDirectory(dirPath);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 清理统计:');
  console.log('='.repeat(50));
  console.log(`处理文件数:     ${stats.filesProcessed}`);
  console.log(`修改文件数:     ${stats.filesModified}`);
  console.log(`移除 console.log:   ${stats.consoleLogRemoved}`);
  console.log(`移除 console.error: ${stats.consoleErrorRemoved}`);
  console.log(`移除 console.warn:  ${stats.consoleWarnRemoved}`);
  console.log(`移除 console.debug: ${stats.consoleDebugRemoved}`);
  console.log(`移除 console.info:  ${stats.consoleInfoRemoved}`);
  console.log('='.repeat(50));
  console.log('\n✅ 调试代码清理完成！\n');
}

main();
