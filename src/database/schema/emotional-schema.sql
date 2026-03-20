CREATE TABLE IF NOT EXISTS emotional_training_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_record_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  module_code TEXT NOT NULL DEFAULT 'emotional',
  sub_module TEXT NOT NULL CHECK(sub_module IN ('emotion_scene', 'care_scene')),
  resource_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('emotion_scene', 'care_scene')),
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  accuracy_rate REAL NOT NULL DEFAULT 0 CHECK(accuracy_rate BETWEEN 0 AND 1),
  hint_count INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  completion_status TEXT NOT NULL DEFAULT 'completed'
    CHECK(completion_status IN ('completed', 'cancelled', 'interrupted')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (training_record_id) REFERENCES training_records(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id)
);

CREATE INDEX IF NOT EXISTS idx_emotional_session_record
  ON emotional_training_session(training_record_id);
CREATE INDEX IF NOT EXISTS idx_emotional_session_student
  ON emotional_training_session(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_session_submodule
  ON emotional_training_session(sub_module, created_at DESC);

CREATE TABLE IF NOT EXISTS emotional_training_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  step_type TEXT NOT NULL
    CHECK(step_type IN ('emotion_choice', 'reasoning_question', 'solution_choice', 'care_utterance', 'receiver_preference')),
  step_index INTEGER NOT NULL,
  prompt_id TEXT,
  selected_value TEXT,
  selected_label TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK(is_correct IN (0, 1)),
  is_acceptable INTEGER NOT NULL DEFAULT 0 CHECK(is_acceptable IN (0, 1)),
  hint_level INTEGER NOT NULL DEFAULT 0 CHECK(hint_level BETWEEN 0 AND 3),
  retry_count INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  feedback_code TEXT,
  perspective TEXT NOT NULL DEFAULT 'none' CHECK(perspective IN ('sender', 'receiver', 'none')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES emotional_training_session(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id)
);

CREATE INDEX IF NOT EXISTS idx_emotional_detail_session
  ON emotional_training_detail(session_id, step_index);
CREATE INDEX IF NOT EXISTS idx_emotional_detail_student
  ON emotional_training_detail(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_detail_step
  ON emotional_training_detail(step_type, created_at DESC);

CREATE TABLE IF NOT EXISTS game_emotion_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  game_code TEXT NOT NULL
    CHECK(game_code IN ('G01_BALLOON', 'G03_FOREST', 'G04_WIPE_ICE', 'G07_MONSTER')),
  start_time TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  difficulty_level INTEGER DEFAULT 1
    CHECK(difficulty_level IN (1, 2, 3)),
  completion_status TEXT NOT NULL
    CHECK(completion_status IN ('completed', 'aborted')),
  performance_data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE INDEX IF NOT EXISTS idx_game_emotion_records_student
  ON game_emotion_records(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_emotion_records_code
  ON game_emotion_records(game_code, created_at DESC);

CREATE TABLE IF NOT EXISTS student_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  badge_code TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  game_code TEXT NOT NULL
    CHECK(game_code IN ('G01_BALLOON', 'G03_FOREST', 'G04_WIPE_ICE', 'G07_MONSTER')),
  unlock_count INTEGER DEFAULT 1,
  first_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, badge_code),
  FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student
  ON student_badges(student_id, last_earned_at DESC);
