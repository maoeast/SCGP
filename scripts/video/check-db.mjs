/**
 * 调试：检查隔离库中的班级/学生数据（确认录屏场景数据流转）
 * 用法：node scripts/video/check-db.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import initSqlJs from 'sql.js';

const USER_DATA_DIR = process.env.SCGP_VIDEO_USER_DATA
  || (() => {
    // 默认取最新一次运行留下的 scgp-video-* 目录
    const dirs = fs.existsSync(os.tmpdir())
      ? fs.readdirSync(os.tmpdir()).filter((d) => d.startsWith('scgp-video-')).sort().reverse()
      : [];
    return path.join(os.tmpdir(), dirs[0] || 'scgp-video-userdata');
  })();
const dbPath = path.join(USER_DATA_DIR, 'database.sqlite');
if (!fs.existsSync(dbPath)) { console.error(`库不存在: ${dbPath}`); process.exit(1); }

const SQL = await initSqlJs({ locateFile: (f) => path.join('node_modules/sql.js/dist', f) });
const db = new SQL.Database(fs.readFileSync(dbPath));

const tables = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%class%' OR name LIKE '%student%')`);
console.log('相关表:', JSON.stringify(tables[0]?.values?.flat() || []));

// 班级表探查：找含 学年/名称 的表
for (const [name] of (tables[0]?.values || [])) {
  const cols = db.exec(`PRAGMA table_info(${name})`)[0]?.values.map((r) => r[1]) || [];
  if (cols.some((c) => /academic|year|name|class/i.test(c))) {
    const rows = db.exec(`SELECT * FROM ${name} ORDER BY rowid DESC LIMIT 12`)[0];
    if (rows) {
      console.log(`\n[${name}] 列:`, cols.join(', '));
      for (const r of rows.values) console.log('  ', JSON.stringify(r));
    }
  }
}
