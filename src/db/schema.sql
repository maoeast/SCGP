PRAGMA foreign_keys = ON;

-- Phase 1 schema for immersive emotional scene training.
-- Important: all relative asset paths stored in this database must use forward slashes.

CREATE TABLE IF NOT EXISTS scenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_code VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  background_image_url VARCHAR(255) CHECK (
    background_image_url IS NULL
    OR instr(background_image_url, char(92)) = 0
  ),
  target_emotion VARCHAR(50),
  character_name VARCHAR(50) NOT NULL DEFAULT '小朋友',
  difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 3),
  scene_domain VARCHAR(50),
  age_range VARCHAR(20),
  ability_level VARCHAR(20) CHECK (
    ability_level IS NULL
    OR ability_level IN ('primary', 'middle', 'advanced')
  ),
  tags TEXT,
  recommended_hint_ceiling INTEGER CHECK (
    recommended_hint_ceiling IS NULL
    OR recommended_hint_ceiling BETWEEN 0 AND 3
  ),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_id INTEGER NOT NULL,
  content VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_id INTEGER NOT NULL,
  step_index INTEGER NOT NULL CHECK (step_index BETWEEN 1 AND 4),
  question_id VARCHAR(100),
  question_text TEXT NOT NULL,
  step_type VARCHAR(50) NOT NULL CHECK (
    step_type IN ('emotion', 'reason', 'need', 'response')
  ),
  audio_url VARCHAR(255) CHECK (
    audio_url IS NULL
    OR instr(audio_url, char(92)) = 0
  ),
  UNIQUE (scene_id, step_index),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id INTEGER NOT NULL,
  option_code VARCHAR(100),
  content TEXT NOT NULL,
  icon_name VARCHAR(50),
  color_hex VARCHAR(7) CHECK (
    color_hex IS NULL
    OR (length(color_hex) = 7 AND substr(color_hex, 1, 1) = '#')
  ),
  color_label VARCHAR(20),
  is_correct BOOLEAN NOT NULL CHECK (is_correct IN (0, 1)),
  is_acceptable BOOLEAN CHECK (
    is_acceptable IS NULL
    OR is_acceptable IN (0, 1)
  ),
  feedback_text TEXT,
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id INTEGER NOT NULL,
  hint_level INTEGER NOT NULL CHECK (hint_level IN (1, 2)),
  hint_text TEXT NOT NULL,
  UNIQUE (step_id, hint_level),
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_id INTEGER NOT NULL,
  student_id INTEGER,
  stars INTEGER NOT NULL CHECK (stars IN (1, 2, 3)),
  hint_level_sum INTEGER NOT NULL DEFAULT 0 CHECK (hint_level_sum >= 0),
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scene_id) REFERENCES scenes(id)
);

CREATE INDEX IF NOT EXISTS idx_scenes_scene_code
  ON scenes (scene_code);

CREATE INDEX IF NOT EXISTS idx_scenes_target_emotion
  ON scenes (target_emotion);

CREATE INDEX IF NOT EXISTS idx_clues_scene_display_order
  ON clues (scene_id, display_order, id);

CREATE INDEX IF NOT EXISTS idx_steps_scene_step_index
  ON steps (scene_id, step_index);

CREATE INDEX IF NOT EXISTS idx_steps_question_id
  ON steps (question_id);

CREATE INDEX IF NOT EXISTS idx_options_step_id
  ON options (step_id);

CREATE INDEX IF NOT EXISTS idx_options_option_code
  ON options (option_code);

CREATE INDEX IF NOT EXISTS idx_hints_step_level
  ON hints (step_id, hint_level);

CREATE INDEX IF NOT EXISTS idx_training_records_scene_completed_at
  ON training_records (scene_id, completed_at DESC);
