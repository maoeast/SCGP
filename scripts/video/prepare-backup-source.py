"""Create a traceable demo DB copy for the backup tutorial; never edit the source."""

import collections
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(os.environ["APPDATA"]) / "scgp" / "database.sqlite"
TARGET_DIR = ROOT / "output" / "video-sources" / "backup-demo-2026-10-16"
TARGET = TARGET_DIR / "database.sqlite"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def violation_counts(db):
    return dict(collections.Counter((row[0], row[2]) for row in db.execute("PRAGMA foreign_key_check")))


def main():
    if TARGET_DIR.exists():
        raise SystemExit(f"目标目录已存在，保留现有副本：{TARGET_DIR}")
    if not SOURCE.is_file():
        raise SystemExit(f"原演示库不存在：{SOURCE}")
    source_hash = sha256(SOURCE)
    TARGET_DIR.mkdir(parents=True)
    source = sqlite3.connect(f"file:{SOURCE.as_posix()}?mode=ro", uri=True)
    target = sqlite3.connect(TARGET)
    try:
        source.backup(target)
        target.row_factory = sqlite3.Row
        if target.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("演示库副本完整性校验失败")
        before = violation_counts(target)
        expected = {
            ("report_record", "train_plan"): 42,
            ("cpep3_assess_detail", "cpep3_assess"): 278,
        }
        for key, count in expected.items():
            if before.get(key) != count:
                raise ValueError(f"历史关系数量变化，需重新审核：{key} {before.get(key)}")
        plan_rows = target.execute("""
            SELECT r.* FROM report_record AS r
            WHERE r.plan_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM train_plan AS p WHERE p.id = r.plan_id)
            ORDER BY r.id
        """).fetchall()
        if any(target.execute("SELECT 1 FROM sys_training_plan WHERE id = ?", (row["plan_id"],)).fetchone() is None for row in plan_rows):
            raise ValueError("失效计划关联并非全部指向现有新计划，停止迁移")
        cpep_rows = target.execute("""
            SELECT d.* FROM cpep3_assess_detail AS d
            WHERE NOT EXISTS (SELECT 1 FROM cpep3_assess AS a WHERE a.id = d.assess_id)
            ORDER BY d.id
        """).fetchall()

        target.execute("PRAGMA foreign_keys = OFF")
        target.execute("BEGIN IMMEDIATE")
        target.execute("""
            CREATE TABLE demo_legacy_relation_archive (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_table TEXT NOT NULL,
                source_row_id INTEGER NOT NULL,
                reason TEXT NOT NULL,
                original_row_json TEXT NOT NULL,
                source_db_sha256 TEXT NOT NULL,
                archived_at TEXT NOT NULL,
                UNIQUE (source_table, source_row_id)
            )
        """)
        archived_at = datetime.now(timezone.utc).isoformat()
        for table_name, rows, reason in (
            ("report_record", plan_rows, "legacy_plan_id_points_to_sys_training_plan"),
            ("cpep3_assess_detail", cpep_rows, "missing_cpep3_assess_parent"),
        ):
            for row in rows:
                target.execute("""
                    INSERT INTO demo_legacy_relation_archive
                    (source_table, source_row_id, reason, original_row_json, source_db_sha256, archived_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (table_name, row["id"], reason,
                      json.dumps(dict(row), ensure_ascii=False, sort_keys=True), source_hash, archived_at))
        target.execute("""
            UPDATE report_record SET plan_id = NULL
            WHERE plan_id IS NOT NULL AND NOT EXISTS
              (SELECT 1 FROM train_plan WHERE train_plan.id = report_record.plan_id)
        """)
        target.execute("""
            DELETE FROM cpep3_assess_detail WHERE NOT EXISTS
              (SELECT 1 FROM cpep3_assess WHERE cpep3_assess.id = cpep3_assess_detail.assess_id)
        """)
        target.commit()
        after = violation_counts(target)
        remaining = {key: value for key, value in after.items() if key not in {
            ("sm_assess_detail", "sm_question"), ("weefim_assess_detail", "weefim_question")}}
        if remaining or sum(after.values()) != sum(before.values()) - 320:
            raise ValueError(f"迁移后仍有未分类失效关系：{remaining}")
        if target.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("迁移后数据库完整性校验失败")
        archive_count = target.execute("SELECT count(*) FROM demo_legacy_relation_archive").fetchone()[0]
        if archive_count != 320:
            raise ValueError("历史行归档数量不一致")
        target.close()
        source.close()

        source_resources = SOURCE.parent / "resources"
        if source_resources.is_dir():
            shutil.copytree(source_resources, TARGET_DIR / "resources")
        manifest = {
            "source": str(SOURCE), "sourceSha256": source_hash,
            "derivedDatabase": str(TARGET), "derivedSha256": sha256(TARGET),
            "archivedPlanLinks": len(plan_rows), "archivedOrphanCpepDetails": len(cpep_rows),
            "archivedRows": archive_count,
            "remainingForeignKeyGroups": {f"{table}->{parent}": count for (table, parent), count in after.items()},
            "note": "原行保存在 demo_legacy_relation_archive；原库和原资源未修改。静态量表题目外键由产品恢复流程补齐。",
        }
        (TARGET_DIR / "migration-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        if sha256(SOURCE) != source_hash:
            raise ValueError("原演示库在迁移期间发生变化")
        print(json.dumps(manifest, ensure_ascii=False, indent=2))
    finally:
        source.close()
        target.close()


if __name__ == "__main__":
    main()
