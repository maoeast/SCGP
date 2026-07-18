#!/usr/bin/env node

/**
 * 导出 resource_meta 表数据为 INSERT 语句
 *
 * 使用方法:
 *   node scripts/export-resources.cjs            导出资源到 exported-resources.ts
 *   node scripts/export-resources.cjs --help     查看帮助（只读，不读取数据库）
 *
 * 输出文件: scripts/exported-resources.ts
 * 数据库引擎: sql.js（与运行时主线一致，零额外原生依赖）
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// 只读帮助分支：禁止用真实 DB 验证导出
function printHelp() {
  console.log('export-resources.cjs — 导出 resource_meta 表数据为 INSERT 语句');
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/export-resources.cjs            导出资源到 scripts/exported-resources.ts');
  console.log('  node scripts/export-resources.cjs --help     显示此帮助（只读，不读取数据库）');
  console.log('');
  console.log('数据库引擎: sql.js（与运行时主线一致，零额外原生依赖）');
  console.log('输出文件: scripts/exported-resources.ts');
}

// 初始化 sql.js（wasm 定位与运行时主线 export-current-emotion-scenes.mjs 一致）
async function loadSqlJs() {
  const sqlJsImport = require('sql.js');
  const initSqlJs = typeof sqlJsImport === 'function' ? sqlJsImport : sqlJsImport.default;
  return initSqlJs({
    locateFile: (file) => path.join(REPO_ROOT, 'node_modules', 'sql.js', 'dist', file),
  });
}

// 从 IndexedDB 或本地文件读取数据库
async function getDatabaseData() {
  const userDatabasePath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'self-care-ats', 'database_backup.db')
    : path.join(process.env.HOME, '.self-care-ats', 'database_backup.db');

  console.log('📍 尝试从以下位置读取数据库:');
  console.log('   ', userDatabasePath);

  // 检查文件是否存在
  if (!fs.existsSync(userDatabasePath)) {
    console.error('❌ 数据库文件不存在:', userDatabasePath);
    console.log('\n💡 提示: 请确保已经运行过系统并导入了资源数据');
    process.exit(1);
  }

  return userDatabasePath;
}

// 使用 sql.js 只读查询数据库（替代原生编译的 sqlite 驱动）
async function exportResourceTable(SQL, dbPath) {
  const buffer = fs.readFileSync(dbPath);
  // sql.js 为内存型 WASM 引擎，此处仅 SELECT 且不写回文件，天然只读
  const db = new SQL.Database(buffer);

  try {
    const result = db.exec(`
      SELECT id, title, type, category, path, size_kb, tags, description
      FROM resource_meta
      ORDER BY id
    `);

    const columns = result?.[0]?.columns || [];
    const values = result?.[0]?.values || [];
    return values.map((row) =>
      Object.fromEntries(columns.map((col, idx) => [col, row[idx]]))
    );
  } finally {
    db.close();
  }
}

// 生成 INSERT 语句
function generateInsertStatements(resources) {
  const lines = [];

  lines.push('// 资源库数据 - 从系统导出');
  lines.push('// 总数: ' + resources.length + ' 条');
  lines.push('// 导出时间: ' + new Date().toLocaleString('zh-CN'));
  lines.push('');
  lines.push('export const importedResources = [');
  lines.push('');

  resources.forEach((r, index) => {
    const id = r.id || (index + 1);
    const title = escapeString(r.title);
    const type = escapeString(r.type);
    const category = r.category || 1;
    const filePath = escapeString(r.path);
    const sizeKb = r.size_kb || 0;
    const tags = escapeString(r.tags || '');
    const description = escapeString(r.description || '');

    lines.push(`  {`);
    lines.push(`    id: ${id},`);
    lines.push(`    title: '${title}',`);
    lines.push(`    type: '${type}',`);
    lines.push(`    category: ${category},`);
    lines.push(`    path: '${filePath}',`);
    lines.push(`    size_kb: ${sizeKb},`);
    lines.push(`    tags: '${tags}',`);
    lines.push(`    description: '${description}'`);
    if (index < resources.length - 1) {
      lines.push(`  },`);
    } else {
      lines.push(`  }`);
    }
    lines.push('');
  });

  lines.push('];');
  lines.push('');
  lines.push('// 初始化导入的资源数据');
  lines.push('export function initImportedResources(db: any): void {');
  lines.push('  const insertResource = db.prepare(`');
  lines.push('    INSERT OR REPLACE INTO resource_meta');
  lines.push('    (id, title, type, category, path, size_kb, tags, description, created_at, updated_at)');
  lines.push('    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))');
  lines.push('  `);');
  lines.push('');
  lines.push('  importedResources.forEach(resource => {');
  lines.push('    insertResource.run(');
  lines.push('      resource.id,');
  lines.push('      resource.title,');
  lines.push('      resource.type,');
  lines.push('      resource.category,');
  lines.push('      resource.path,');
  lines.push('      resource.size_kb,');
  lines.push('      resource.tags,');
  lines.push('      resource.description');
  lines.push('    );');
  lines.push('  });');
  lines.push('}');

  return lines.join('\n');
}

// 转义字符串中的特殊字符
function escapeString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')  // 反斜杠
    .replace(/'/g, "\\'")    // 单引号
    .replace(/"/g, '\\"')    // 双引号
    .replace(/\n/g, '\\n')   // 换行
    .replace(/\r/g, '\\r')   // 回车
    .replace(/\t/g, '\\t');  // 制表符
}

// 主函数
async function main() {
  // 只读帮助分支：不读取数据库
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  try {
    console.log('📦 开始导出资源数据...\n');

    // 初始化 sql.js 引擎
    const SQL = await loadSqlJs();

    // 获取数据库路径
    const dbPath = await getDatabaseData();
    console.log('✅ 找到数据库文件\n');

    // 导出资源表
    const resources = await exportResourceTable(SQL, dbPath);
    console.log(`✅ 读取到 ${resources.length} 条资源记录\n`);

    // 生成 INSERT 语句
    const insertStatements = generateInsertStatements(resources);

    // 输出文件
    const outputFile = path.join(__dirname, 'exported-resources.ts');
    fs.writeFileSync(outputFile, insertStatements, 'utf8');

    console.log('✅ 导出成功！');
    console.log('📄 输出文件: ' + outputFile);
    console.log('');
    console.log('📋 下一步操作:');
    console.log('   1. 复制 exported-resources.ts 的内容');
    console.log('   2. 将其添加到 src/database/resource-data.ts 文件中');
    console.log('   3. 在 initResourceData 函数中调用 initImportedResources(db)');

  } catch (error) {
    console.error('❌ 导出失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
main();
