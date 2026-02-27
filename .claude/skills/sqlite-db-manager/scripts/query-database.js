#!/usr/bin/env node

/**
 * SQLite 数据库查询脚本
 *
 * 这个脚本提供一些实用的数据库查询功能，用于开发调试。
 *
 * 使用方法:
 *   node scripts/query-database.js <command> [options]
 *
 * 可用命令:
 *   list-students          列出所有学生
 *   get-student <id>       获取指定学生信息
 *   list-assessments <id>  列出学生的评估记录
 *   list-plans <id>        列出学生的训练计划
 *   list-logs <id>         列出学生的训练记录
 *   stats                  显示系统统计信息
 */

const fs = require('fs');
const path = require('path');

// 模拟数据库查询（实际项目中应该连接真实数据库）
function queryDatabase(sql, params = []) {
  // 注意：这里只是示例代码
  // 在实际项目中，需要使用 SQL.js 或其他 SQLite 驱动
  console.log('执行 SQL:', sql);
  console.log('参数:', params);
  return [];
}

// 列出所有学生
function listStudents() {
  const sql = `
    SELECT id, name, gender, birthday, admission_date, diagnosis, notes
    FROM student
    ORDER BY admission_date DESC
  `;
  return queryDatabase(sql);
}

// 获取指定学生信息
function getStudent(studentId) {
  const sql = `
    SELECT
      id, name, gender, birthday,
      strftime('%Y', 'now') - strftime('%Y', birthday) -
      (strftime('%m-%d', 'now') < strftime('%m-%d', birthday)) AS age,
      admission_date, diagnosis, notes
    FROM student
    WHERE id = ?
  `;
  return queryDatabase(sql, [studentId]);
}

// 列出学生的评估记录
function listAssessments(studentId) {
  const smSql = `
    SELECT
      'S-M' as type,
      sa.id, sa.assess_date, sa.total_score,
      sas.stage_name,
      u.name as assessor_name
    FROM sm_assess sa
    LEFT JOIN sm_age_stage sas ON sa.age_stage_id = sas.id
    LEFT JOIN user u ON sa.assessor_id = u.id
    WHERE sa.student_id = ?
  `;

  const weefimSql = `
    SELECT
      'WeeFIM' as type,
      wa.id, wa.assess_date, wa.total_score,
      wa.motor_score, wa.cognitive_score,
      u.name as assessor_name
    FROM weefim_assess wa
    LEFT JOIN user u ON wa.assessor_id = u.id
    WHERE wa.student_id = ?
  `;

  return {
    sm: queryDatabase(smSql, [studentId]),
    weefim: queryDatabase(weefimSql, [studentId])
  };
}

// 列出学生的训练计划
function listPlans(studentId) {
  const sql = `
    SELECT
      tp.id, tp.name, tp.start_date, tp.end_date,
      tp.status, u.name as creator_name
    FROM train_plan tp
    LEFT JOIN user u ON tp.creator_id = u.id
    WHERE tp.student_id = ?
    ORDER BY tp.start_date DESC
  `;
  return queryDatabase(sql, [studentId]);
}

// 列出学生的训练记录
function listLogs(studentId) {
  const sql = `
    SELECT
      tl.id, tl.train_date, tl.duration, tl.result, tl.notes,
      t.name as task_name, u.name as trainer_name
    FROM train_log tl
    JOIN train_plan_detail tpd ON tl.plan_detail_id = tpd.id
    JOIN task t ON tpd.task_id = t.id
    LEFT JOIN user u ON tl.trainer_id = u.id
    WHERE tl.student_id = ?
    ORDER BY tl.train_date DESC
    LIMIT 50
  `;
  return queryDatabase(sql, [studentId]);
}

// 显示系统统计信息
function getStats() {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM student) as student_count,
      (SELECT COUNT(*) FROM user) as user_count,
      (SELECT COUNT(*) FROM sm_assess) as sm_assess_count,
      (SELECT COUNT(*) FROM weefim_assess) as weefim_assess_count,
      (SELECT COUNT(*) FROM train_plan) as train_plan_count,
      (SELECT COUNT(*) FROM train_log) as train_log_count,
      (SELECT COUNT(*) FROM task) as task_count
  `;
  return queryDatabase(sql);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('用法: node scripts/query-database.js <command> [options]');
    console.log('');
    console.log('可用命令:');
    console.log('  list-students          列出所有学生');
    console.log('  get-student <id>       获取指定学生信息');
    console.log('  list-assessments <id>  列出学生的评估记录');
    console.log('  list-plans <id>        列出学生的训练计划');
    console.log('  list-logs <id>         列出学生的训练记录');
    console.log('  stats                  显示系统统计信息');
    process.exit(1);
  }

  try {
    let result;

    switch (command) {
      case 'list-students':
        result = listStudents();
        console.log('学生列表:');
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'get-student':
        if (!args[1]) {
          console.error('错误: 请提供学生 ID');
          process.exit(1);
        }
        result = getStudent(args[1]);
        console.log('学生信息:');
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'list-assessments':
        if (!args[1]) {
          console.error('错误: 请提供学生 ID');
          process.exit(1);
        }
        result = listAssessments(args[1]);
        console.log('评估记录:');
        console.log('S-M 评估:', JSON.stringify(result.sm, null, 2));
        console.log('WeeFIM 评估:', JSON.stringify(result.weefim, null, 2));
        break;

      case 'list-plans':
        if (!args[1]) {
          console.error('错误: 请提供学生 ID');
          process.exit(1);
        }
        result = listPlans(args[1]);
        console.log('训练计划:');
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'list-logs':
        if (!args[1]) {
          console.error('错误: 请提供学生 ID');
          process.exit(1);
        }
        result = listLogs(args[1]);
        console.log('训练记录:');
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'stats':
        result = getStats();
        console.log('系统统计:');
        console.log(JSON.stringify(result, null, 2));
        break;

      default:
        console.error(`错误: 未知命令 '${command}'`);
        process.exit(1);
    }
  } catch (error) {
    console.error('执行出错:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  listStudents,
  getStudent,
  listAssessments,
  listPlans,
  listLogs,
  getStats
};
