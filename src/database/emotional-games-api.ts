import type {
  EmotionGameBadgePayload,
  EmotionGameCode,
  EmotionGameCompletionStatus,
  EmotionGameDifficulty,
  GameEmotionRecord,
} from '@/types/emotional/games'

type DbLike = {
  get: (sql: string, params?: any[]) => any
  run: (sql: string, params?: any[]) => any
  getRawDB?: () => any
  lastInsertId?: () => number
  saveNow?: () => Promise<void>
}

interface PersistEmotionGameSessionInput {
  studentId: number
  gameCode: EmotionGameCode
  startedAt: string
  durationMs: number
  difficultyLevel: EmotionGameDifficulty
  completionStatus: EmotionGameCompletionStatus
  performanceData: Record<string, any>
  badge?: EmotionGameBadgePayload
}

interface PersistEmotionGameSessionResult {
  recordId: number
  badgeId?: number
  badgeUnlockCount?: number
}

function getActiveDb(): DbLike {
  const activeDb = (window as Window & { db?: DbLike }).db
  if (!activeDb) {
    throw new Error('Database is not initialized on window.db')
  }
  return activeDb
}

function getRawDb(db: DbLike) {
  return typeof db.getRawDB === 'function' ? db.getRawDB() : db
}

function getLastInsertId(db: DbLike): number {
  if (typeof db.lastInsertId === 'function') {
    return db.lastInsertId()
  }

  const row = db.get('SELECT last_insert_rowid() as id')
  return row?.id || 0
}

export class EmotionalGamesAPI {
  async persistSession(input: PersistEmotionGameSessionInput): Promise<PersistEmotionGameSessionResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)

    rawDb.run('BEGIN TRANSACTION')

    try {
      db.run(
        `INSERT INTO game_emotion_records (
          student_id, game_code, start_time, duration_ms, difficulty_level, completion_status, performance_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.studentId,
          input.gameCode,
          input.startedAt,
          input.durationMs,
          input.difficultyLevel,
          input.completionStatus,
          JSON.stringify(input.performanceData || {}),
        ],
      )

      const recordId = getLastInsertId(db)

      let badgeResult: { badgeId: number; unlockCount: number } | null = null
      if (input.completionStatus === 'completed' && input.badge) {
        badgeResult = this.upsertBadge(db, input.studentId, input.gameCode, input.badge)
      }

      rawDb.run('COMMIT')

      if (typeof db.saveNow === 'function') {
        await db.saveNow()
      }

      return {
        recordId,
        badgeId: badgeResult?.badgeId,
        badgeUnlockCount: badgeResult?.unlockCount,
      }
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  private upsertBadge(
    db: DbLike,
    studentId: number,
    gameCode: EmotionGameCode,
    badge: EmotionGameBadgePayload,
  ) {
    const existing = db.get(
      `SELECT id, unlock_count
       FROM student_badges
       WHERE student_id = ? AND badge_code = ?`,
      [studentId, badge.badgeCode],
    )

    if (existing?.id) {
      db.run(
        `UPDATE student_badges
         SET unlock_count = unlock_count + 1,
             badge_name = ?,
             game_code = ?,
             last_earned_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [badge.badgeName, gameCode, existing.id],
      )

      return {
        badgeId: Number(existing.id),
        unlockCount: Number(existing.unlock_count || 0) + 1,
      }
    }

    db.run(
      `INSERT INTO student_badges (
        student_id, badge_code, badge_name, game_code, unlock_count, first_earned_at, last_earned_at
      ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [studentId, badge.badgeCode, badge.badgeName, gameCode],
    )

    return {
      badgeId: getLastInsertId(db),
      unlockCount: 1,
    }
  }

  getLatestRecord(studentId: number, gameCode: EmotionGameCode): GameEmotionRecord | null {
    const db = getActiveDb()
    const row = db.get(
      `SELECT *
       FROM game_emotion_records
       WHERE student_id = ? AND game_code = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [studentId, gameCode],
    )

    if (!row) {
      return null
    }

    return {
      ...row,
      performance_data: row.performance_data ? JSON.parse(row.performance_data) : {},
    }
  }
}
