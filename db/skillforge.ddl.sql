-- SkillForge PostgreSQL DDL
-- Generated: 2026-04-06

BEGIN;

CREATE
    EXTENSION IF NOT EXISTS pgcrypto;

-- ===== Enums =====
CREATE TYPE user_role AS ENUM ('learner', 'instructor', 'admin');
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE unit_type AS ENUM ('module', 'exercise', 'assessment', 'final_exam');
CREATE TYPE content_kind AS ENUM ('video', 'article_markdown');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE unit_progress_status AS ENUM ('locked', 'available', 'in_progress', 'completed', 'failed');
CREATE TYPE quiz_question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false');
CREATE TYPE challenge_difficulty AS ENUM ('normal', 'advanced');
CREATE TYPE submission_kind AS ENUM ('exercise_normal', 'exercise_advanced', 'final_exam_exercise');
CREATE TYPE submission_status AS ENUM ('queued', 'running', 'passed', 'failed', 'reviewed', 'errored', 'canceled');
CREATE TYPE final_exam_component_type AS ENUM ('quiz', 'exercise');
CREATE TYPE recommendation_status AS ENUM ('proposed', 'accepted', 'dismissed');
CREATE TYPE forum_entity_status AS ENUM ('visible', 'hidden', 'locked', 'deleted');
CREATE TYPE moderation_target_type AS ENUM ('post', 'reply');
CREATE TYPE moderation_action_type AS ENUM ('hide', 'unhide', 'lock', 'unlock', 'delete');
CREATE TYPE verification_result AS ENUM ('valid', 'invalid', 'expired', 'not_found');
CREATE TYPE onboarding_question_type AS ENUM ('multiple_choice', 'single_choice', 'text');

-- ===== Utility =====
CREATE
    OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at
        = NOW();
    RETURN NEW;
END;
$$
    LANGUAGE plpgsql;

-- ===== Learning paths, Identity, auth, profile, gamification =====
CREATE TABLE learning_paths
(
    id          UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    slug        VARCHAR(120) NOT NULL UNIQUE,
    title       VARCHAR(180) NOT NULL,
    description TEXT,
    criteria    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE users
(
    id            UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    email         VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    display_name  VARCHAR(120) NOT NULL,
    avatar_s3_key TEXT,
    bio           TEXT,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE user_roles
(
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role        user_role   NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE user_preferences
(
    user_id              UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    learning_path_id     UUID        REFERENCES learning_paths (id) ON DELETE SET NULL,
    dark_mode_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
    preferred_locale     VARCHAR(16) NOT NULL DEFAULT 'id-ID',
    onboarding_completed BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE xp_events
(
    id          UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_type  VARCHAR(80) NOT NULL,
    points      INTEGER     NOT NULL,
    source_type VARCHAR(80),
    source_id   UUID,
    metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE badges
(
    id          UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    code        VARCHAR(80)  NOT NULL UNIQUE,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    icon_s3_key TEXT,
    criteria    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE user_badges
(
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    badge_id   UUID        NOT NULL REFERENCES badges (id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- ===== Onboarding and recommendation inputs =====
CREATE TABLE onboarding_quiz_questions
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      VARCHAR(255)             NOT NULL,
    description   TEXT,
    type          onboarding_question_type NOT NULL,
    options       JSONB            DEFAULT '[]',
    display_order INTEGER                  NOT NULL,
    is_active     BOOLEAN          DEFAULT TRUE,
    created_at    TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE onboarding_quiz_responses
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    question_id UUID  NOT NULL REFERENCES onboarding_quiz_questions (id) ON DELETE CASCADE,
    answer      JSONB NOT NULL,
    created_at  TIMESTAMPTZ      DEFAULT NOW()
);

/* UNUSED (not implemented in current app runtime)
CREATE TABLE interest_tags
(
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(80)  NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL
);

CREATE TABLE user_interest_tags
(
    user_id    UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tag_id     UUID          NOT NULL REFERENCES interest_tags (id) ON DELETE CASCADE,
    score      NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    source     VARCHAR(40)   NOT NULL DEFAULT 'onboarding',
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, tag_id)
);
*/

-- ===== Courses and learning paths relations =====
CREATE TABLE courses
(
    id               UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    slug             VARCHAR(160) NOT NULL UNIQUE,
    title            VARCHAR(200) NOT NULL,
    subtitle         VARCHAR(240),
    description      TEXT,
    level            course_level NOT NULL,
    language         VARCHAR(40)  NOT NULL DEFAULT 'id',
    thumbnail_s3_key TEXT,
    trailer_url      TEXT,
    is_published     BOOLEAN      NOT NULL DEFAULT FALSE,
    price_cents      INTEGER      NOT NULL DEFAULT 0,
    currency_code    CHAR(3)      NOT NULL DEFAULT 'IDR',
    created_by       UUID         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (price_cents >= 0)
);

/* UNUSED (not implemented in current app runtime)
CREATE TABLE course_instructors
(
    course_id     UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    instructor_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    is_primary    BOOLEAN     NOT NULL DEFAULT FALSE,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (course_id, instructor_id)
);

CREATE TABLE course_assets
(
    id           UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    course_id    UUID         NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    asset_type   VARCHAR(40)  NOT NULL,
    display_name VARCHAR(180) NOT NULL,
    s3_key       TEXT         NOT NULL,
    content_type VARCHAR(120),
    size_bytes   BIGINT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
*/

CREATE TABLE learning_path_courses
(
    learning_path_id UUID    NOT NULL REFERENCES learning_paths (id) ON DELETE CASCADE,
    course_id        UUID    NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    position         INTEGER NOT NULL,
    PRIMARY KEY (learning_path_id, course_id),
    UNIQUE (learning_path_id, position)
);

/* UNUSED (not implemented in current app runtime)
CREATE TABLE user_learning_path_recommendations
(
    id               UUID PRIMARY KEY               DEFAULT gen_random_uuid(),
    user_id          UUID                  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    learning_path_id UUID                  NOT NULL REFERENCES learning_paths (id) ON DELETE CASCADE,
    score            NUMERIC(6, 3)         NOT NULL,
    reason           TEXT,
    status           recommendation_status NOT NULL DEFAULT 'proposed',
    created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, learning_path_id)
);
*/

CREATE TABLE course_enrollments
(
    id           UUID PRIMARY KEY           DEFAULT gen_random_uuid(),
    user_id      UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id    UUID              NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    status       enrollment_status NOT NULL DEFAULT 'active',
    enrolled_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE (user_id, course_id)
);

/* UNUSED (not implemented in current app runtime)
CREATE TABLE course_reviews
(
    id          UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    course_id   UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL,
    review_text TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (rating BETWEEN 1 AND 5),
    UNIQUE (course_id, user_id)
);
*/

-- ===== Units (polymorphic) and prerequisite graph =====
CREATE TABLE units
(
    id                UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    course_id         UUID         NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    type              unit_type    NOT NULL,
    title             VARCHAR(220) NOT NULL,
    summary           TEXT,
    position          INTEGER      NOT NULL,
    estimated_minutes INTEGER,
    is_published      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
--     UNIQUE (course_id, position),
    CHECK (position > 0)
);

CREATE TABLE unit_prerequisites
(
    unit_id              UUID NOT NULL REFERENCES units (id) ON DELETE CASCADE,
    prerequisite_unit_id UUID NOT NULL REFERENCES units (id) ON DELETE CASCADE,
    PRIMARY KEY (unit_id, prerequisite_unit_id),
    CHECK (unit_id <> prerequisite_unit_id)
);

CREATE TABLE module_contents
(
    unit_id          UUID PRIMARY KEY REFERENCES units (id) ON DELETE CASCADE,
    content_kind     content_kind NOT NULL,
    video_url        TEXT,
    article_markdown TEXT,
    subtitle_s3_key  TEXT,
    playback_speeds  JSONB        NOT NULL DEFAULT '[
      1.0,
      1.25,
      1.5
    ]'::jsonb,
    supports_pip     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (
        (content_kind = 'video' AND video_url IS NOT NULL)
            OR
        (content_kind = 'article_markdown' AND article_markdown IS NOT NULL)
        )
);

CREATE TABLE module_resources
(
    id            UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    unit_id       UUID         NOT NULL REFERENCES units (id) ON DELETE CASCADE,
    label         VARCHAR(180) NOT NULL,
    resource_type VARCHAR(40)  NOT NULL,
    s3_key        TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ===== Quiz engine (used by module checkpoints, assessments, and final exam) =====
CREATE TABLE quizzes
(
    id                  UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
    unit_id             UUID          REFERENCES units (id) ON DELETE SET NULL,
    title               VARCHAR(200)  NOT NULL,
    instructions        TEXT,
    passing_score       NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
    time_limit_seconds  INTEGER,
    randomize_questions BOOLEAN       NOT NULL DEFAULT FALSE,
    randomize_options   BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CHECK (passing_score BETWEEN 0 AND 100)
);

CREATE TABLE quiz_questions
(
    id            UUID PRIMARY KEY            DEFAULT gen_random_uuid(),
    quiz_id       UUID               NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    question_type quiz_question_type NOT NULL,
    prompt        TEXT               NOT NULL,
    explanation   TEXT,
    points        NUMERIC(6, 2)      NOT NULL DEFAULT 1,
    position      INTEGER            NOT NULL,
    UNIQUE (quiz_id, position)
);

CREATE TABLE quiz_options
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID    NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
    label       TEXT    NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
    position    INTEGER NOT NULL,
    UNIQUE (question_id, position)
);

CREATE TABLE quiz_attempts
(
    id             UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    quiz_id        UUID        NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at   TIMESTAMPTZ,
    score_percent  NUMERIC(5, 2),
    is_passed      BOOLEAN,
    attempt_number INTEGER     NOT NULL,
    UNIQUE (quiz_id, user_id, attempt_number)
);

CREATE TABLE quiz_attempt_answers
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID   NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
    question_id         UUID   NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
    selected_option_ids UUID[] NOT NULL  DEFAULT '{}',
    answer_text         TEXT,
    is_correct          BOOLEAN,
    score_awarded       NUMERIC(6, 2),
    UNIQUE (attempt_id, question_id)
);

-- ===== Exercises, testcases, hints =====
CREATE TABLE exercises
(
    id              UUID PRIMARY KEY              DEFAULT gen_random_uuid(),
    unit_id         UUID                 NOT NULL UNIQUE REFERENCES units (id) ON DELETE CASCADE,
    difficulty      challenge_difficulty NOT NULL,
    title           VARCHAR(220)         NOT NULL,
    prompt_markdown TEXT                 NOT NULL,
    language        VARCHAR(40)          NOT NULL,
    starter_code    TEXT,
    max_cpu_ms      INTEGER,
    max_memory_kb   INTEGER,
    created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TABLE exercise_test_cases
(
    id              UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
    exercise_id     UUID          NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
    input_text      TEXT,
    expected_output TEXT          NOT NULL,
    is_hidden       BOOLEAN       NOT NULL DEFAULT FALSE,
    weight          NUMERIC(6, 2) NOT NULL DEFAULT 1
);

CREATE TABLE exercise_hints
(
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id                  UUID    NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
    hint_text                    TEXT    NOT NULL,
    unlock_after_failed_attempts INTEGER NOT NULL DEFAULT 3,
    position                     INTEGER NOT NULL,
    UNIQUE (exercise_id, position),
    CHECK (unlock_after_failed_attempts >= 0)
);

CREATE TABLE exercise_attempt_counters
(
    user_id         UUID    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    exercise_id     UUID    NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_at  TIMESTAMPTZ,
    last_passed_at  TIMESTAMPTZ,
    PRIMARY KEY (user_id, exercise_id),
    CHECK (failed_attempts >= 0)
);

-- ===== Submissions, Judge0, AI review, polling =====
CREATE TABLE code_submissions
(
    id                  UUID PRIMARY KEY           DEFAULT gen_random_uuid(),
    user_id             UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id           UUID              NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    unit_id             UUID              NOT NULL REFERENCES units (id) ON DELETE CASCADE,
    exercise_id         UUID              REFERENCES exercises (id) ON DELETE SET NULL,
    kind                submission_kind   NOT NULL,
    status              submission_status NOT NULL DEFAULT 'queued',
    language            VARCHAR(40)       NOT NULL,
    source_code         TEXT              NOT NULL,
    attempt_number      INTEGER           NOT NULL,
    queue_name          VARCHAR(60)       NOT NULL DEFAULT 'default',
    ai_code_explanation TEXT,
    judge0_token        VARCHAR(120),
    stdout              TEXT,
    stderr              TEXT,
    compile_output      TEXT,
    ai_summary          TEXT,
    ai_score            NUMERIC(5, 2),
    ai_model            VARCHAR(120),
    queued_at           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ
);

CREATE TABLE submission_test_results
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     UUID NOT NULL REFERENCES code_submissions (id) ON DELETE CASCADE,
    test_case_id      UUID REFERENCES exercise_test_cases (id) ON DELETE SET NULL,
    passed            BOOLEAN,
    actual_output     TEXT,
    expected_output   TEXT,
    execution_time_ms INTEGER,
    memory_kb         INTEGER
);

CREATE TABLE submission_events
(
    id            BIGSERIAL PRIMARY KEY,
    submission_id UUID        NOT NULL REFERENCES code_submissions (id) ON DELETE CASCADE,
    event_type    VARCHAR(60) NOT NULL,
    payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_review_jobs
(
    id                      UUID PRIMARY KEY           DEFAULT gen_random_uuid(),
    submission_id           UUID              NOT NULL UNIQUE REFERENCES code_submissions (id) ON DELETE CASCADE,
    provider                VARCHAR(40)       NOT NULL DEFAULT 'ollama',
    status                  submission_status NOT NULL DEFAULT 'queued',
    prompt_template_version VARCHAR(40),
    request_payload         JSONB,
    response_payload        JSONB,
    created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ===== Final exam =====
CREATE TABLE final_exams
(
    unit_id            UUID PRIMARY KEY REFERENCES units (id) ON DELETE CASCADE,
    title              VARCHAR(220)  NOT NULL,
    passing_score      NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
    max_attempts       INTEGER       NOT NULL DEFAULT 3,
    time_limit_seconds INTEGER,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CHECK (passing_score BETWEEN 0 AND 100),
    CHECK (max_attempts > 0)
);

CREATE TABLE final_exam_components
(
    id                 UUID PRIMARY KEY                   DEFAULT gen_random_uuid(),
    final_exam_unit_id UUID                      NOT NULL REFERENCES final_exams (unit_id) ON DELETE CASCADE,
    component_type     final_exam_component_type NOT NULL,
    quiz_id            UUID REFERENCES quizzes (id) ON DELETE CASCADE,
    exercise_id        UUID REFERENCES exercises (id) ON DELETE CASCADE,
    position           INTEGER                   NOT NULL,
    weight             NUMERIC(6, 2)             NOT NULL DEFAULT 1,
    CHECK (
        (component_type = 'quiz' AND quiz_id IS NOT NULL AND exercise_id IS NULL)
            OR
        (component_type = 'exercise' AND exercise_id IS NOT NULL AND quiz_id IS NULL)
        ),
    UNIQUE (final_exam_unit_id, position)
);

CREATE TABLE final_exam_attempts
(
    id                 UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    final_exam_unit_id UUID        NOT NULL REFERENCES final_exams (unit_id) ON DELETE CASCADE,
    user_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at       TIMESTAMPTZ,
    score_percent      NUMERIC(5, 2),
    is_passed          BOOLEAN,
    attempt_number     INTEGER     NOT NULL,
    UNIQUE (final_exam_unit_id, user_id, attempt_number)
);

-- ===== Progress tracking =====
CREATE TABLE unit_progress
(
    user_id            UUID                 NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    unit_id            UUID                 NOT NULL REFERENCES units (id) ON DELETE CASCADE,
    status             unit_progress_status NOT NULL DEFAULT 'available',
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    last_score_percent NUMERIC(5, 2),
    last_submission_id UUID                 REFERENCES code_submissions (id) ON DELETE SET NULL,
    updated_at         TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, unit_id),
    CHECK (last_score_percent IS NULL OR (last_score_percent BETWEEN 0 AND 100))
);

CREATE TABLE course_progress
(
    user_id          UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id        UUID          NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    completed_units  INTEGER       NOT NULL DEFAULT 0,
    total_units      INTEGER       NOT NULL DEFAULT 0,
    progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    current_unit_id  UUID          REFERENCES units (id) ON DELETE SET NULL,
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id),
    CHECK (completed_units >= 0),
    CHECK (total_units >= 0),
    CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE TABLE user_daily_streaks
(
    user_id             UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    current_streak_days INTEGER     NOT NULL DEFAULT 0,
    longest_streak_days INTEGER     NOT NULL DEFAULT 0,
    last_activity_date  DATE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (current_streak_days >= 0),
    CHECK (longest_streak_days >= 0)
);

-- ===== Certificates and verification =====
CREATE TABLE certificates
(
    id                  UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    certificate_code    VARCHAR(64) NOT NULL UNIQUE,
    user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id           UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completion_snapshot JSONB       NOT NULL,
    qr_payload          TEXT        NOT NULL,
    pdf_s3_key          TEXT,
    verification_code   VARCHAR(96) NOT NULL UNIQUE,
    is_revoked          BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_at          TIMESTAMPTZ,
    UNIQUE (user_id, course_id)
);

CREATE TABLE certificate_signed_urls
(
    id             UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    certificate_id UUID         NOT NULL REFERENCES certificates (id) ON DELETE CASCADE,
    token_hash     VARCHAR(128) NOT NULL UNIQUE,
    expires_at     TIMESTAMPTZ  NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_used_at   TIMESTAMPTZ,
    revoked_at     TIMESTAMPTZ
);

CREATE TABLE certificate_verification_logs
(
    id                BIGSERIAL PRIMARY KEY,
    certificate_id    UUID                REFERENCES certificates (id) ON DELETE SET NULL,
    verification_code VARCHAR(96),
    token_hash        VARCHAR(128),
    requested_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    request_ip        INET,
    user_agent        TEXT,
    signature_valid   BOOLEAN,
    result            verification_result NOT NULL
);

-- ===== Forum (with moderation actions deferred in API, but schema-ready) =====
CREATE TABLE forum_posts
(
    id               UUID PRIMARY KEY             DEFAULT gen_random_uuid(),
    course_id        UUID                NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    author_id        UUID                NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title            VARCHAR(200)        NOT NULL,
    body             TEXT                NOT NULL,
    status           forum_entity_status NOT NULL DEFAULT 'visible',
    is_pinned        BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE forum_replies
(
    id              UUID PRIMARY KEY             DEFAULT gen_random_uuid(),
    post_id         UUID                NOT NULL REFERENCES forum_posts (id) ON DELETE CASCADE,
    author_id       UUID                NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES forum_replies (id) ON DELETE CASCADE,
    body            TEXT                NOT NULL,
    status          forum_entity_status NOT NULL DEFAULT 'visible',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE forum_moderation_actions
(
    id            UUID PRIMARY KEY                DEFAULT gen_random_uuid(),
    actor_user_id UUID                   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    target_type   moderation_target_type NOT NULL,
    target_id     UUID                   NOT NULL,
    action        moderation_action_type NOT NULL,
    reason        TEXT,
    created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

-- ===== Public showcase =====
CREATE TABLE public_showcases
(
    id             UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id      UUID         NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    certificate_id UUID         REFERENCES certificates (id) ON DELETE SET NULL,
    title          VARCHAR(220) NOT NULL,
    description    TEXT,
    project_url    TEXT,
    is_public      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

-- ===== Admin audit =====
/* UNUSED (not implemented in current app runtime)
CREATE TABLE admin_audit_logs
(
    id            BIGSERIAL PRIMARY KEY,
    admin_user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    action_type   VARCHAR(80) NOT NULL,
    target_type   VARCHAR(80) NOT NULL,
    target_id     UUID,
    before_data   JSONB,
    after_data    JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
*/

-- ===== Indexes =====
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_xp_events_user_created_at ON xp_events (user_id, created_at DESC);
CREATE INDEX idx_enrollments_user_status ON course_enrollments (user_id, status);
CREATE INDEX idx_units_course_position ON units (course_id, position);
CREATE INDEX idx_unit_prereq_prereq ON unit_prerequisites (prerequisite_unit_id);
CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts (user_id, quiz_id);
CREATE INDEX idx_submissions_user_status ON code_submissions (user_id, status);
CREATE INDEX idx_submissions_unit ON code_submissions (unit_id);
CREATE INDEX idx_submission_events_submission ON submission_events (submission_id, id);
CREATE INDEX idx_unit_progress_user_status ON unit_progress (user_id, status);
CREATE INDEX idx_course_progress_user ON course_progress (user_id);
CREATE INDEX idx_certificates_user ON certificates (user_id);
CREATE INDEX idx_cert_verify_logs_requested_at ON certificate_verification_logs (requested_at DESC);
CREATE INDEX idx_forum_posts_course_last_activity ON forum_posts (course_id, last_activity_at DESC);
CREATE INDEX idx_forum_replies_post_created_at ON forum_replies (post_id, created_at);

-- ===== Updated-at triggers =====
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE
    ON users
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE
    ON user_preferences
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE
    ON courses
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_units_updated_at
    BEFORE UPDATE
    ON units
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ai_review_jobs_updated_at
    BEFORE UPDATE
    ON ai_review_jobs
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_unit_progress_updated_at
    BEFORE UPDATE
    ON unit_progress
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_course_progress_updated_at
    BEFORE UPDATE
    ON course_progress
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_daily_streaks_updated_at
    BEFORE UPDATE
    ON user_daily_streaks
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_forum_posts_updated_at
    BEFORE UPDATE
    ON forum_posts
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_forum_replies_updated_at
    BEFORE UPDATE
    ON forum_replies
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
