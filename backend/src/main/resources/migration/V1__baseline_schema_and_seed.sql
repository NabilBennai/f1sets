-- ============================================
-- F1 Sets Baseline (Consolidated)
-- ============================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE games
(
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    code         VARCHAR(32) NOT NULL,
    display_name VARCHAR(64),
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP            DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP            DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_games_code UNIQUE (code)
) ENGINE = InnoDB;

CREATE TABLE tracks
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id         BIGINT      NOT NULL,
    slug            VARCHAR(64) NOT NULL,
    grand_prix_name VARCHAR(128),
    circuit_name    VARCHAR(128),
    length_km       DECIMAL(6, 3),
    track_image_url VARCHAR(512),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_tracks_game_slug UNIQUE (game_id, slug),
    CONSTRAINT fk_tracks_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_tracks_game ON tracks (game_id);

CREATE TABLE users
(
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE = InnoDB;

CREATE TABLE password_reset_tokens
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT    NOT NULL,
    token_hash CHAR(64)  NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at    TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_password_reset_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX idx_password_reset_tokens_user_expiry ON password_reset_tokens (user_id, expires_at);

CREATE TABLE user_profiles
(
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT        NOT NULL,
    first_name        VARCHAR(100)  NULL,
    last_name         VARCHAR(100)  NULL,
    date_of_birth     DATE          NULL,
    country           VARCHAR(100)  NULL,
    languages         VARCHAR(255)  NULL,
    visibility        VARCHAR(16)   NOT NULL DEFAULT 'PRIVATE',
    avatar_url        VARCHAR(1024) NULL,
    avatar_object_key VARCHAR(255)  NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_profiles_user UNIQUE (user_id),
    CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE setups
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id    BIGINT       NOT NULL,
    track_id   BIGINT       NOT NULL,
    user_id    BIGINT       NULL,
    title      VARCHAR(120) NULL,
    notes      TEXT         NULL,
    setup_data JSON         NULL,
    deleted_at TIMESTAMP    NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_setups_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE,
    CONSTRAINT fk_setups_track FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE,
    CONSTRAINT fk_setups_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX ix_setups_game_track ON setups (game_id, track_id);
CREATE INDEX ix_setups_not_deleted ON setups (deleted_at);
CREATE INDEX ix_setups_track_created_at ON setups (track_id, created_at);

CREATE TABLE laps
(
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id      BIGINT      NOT NULL,
    track_id     BIGINT      NOT NULL,
    session_type VARCHAR(32) NOT NULL,
    is_valid     BOOLEAN     NOT NULL DEFAULT TRUE,
    visibility   VARCHAR(16) NOT NULL DEFAULT 'PUBLIC',
    deleted_at   TIMESTAMP   NULL,
    created_at   TIMESTAMP            DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP            DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_laps_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE,
    CONSTRAINT fk_laps_track FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_laps_leaderboard ON laps (game_id, track_id, session_type, is_valid, visibility, deleted_at);

CREATE TABLE ai_difficulty_curves
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id    BIGINT NOT NULL,
    track_id   BIGINT NOT NULL,
    version    INT    NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ai_curve_game_track UNIQUE (game_id, track_id),
    CONSTRAINT fk_ai_curve_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_curve_track FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_ai_curves_game_track ON ai_difficulty_curves (game_id, track_id);

INSERT INTO users (email, display_name, password_hash, enabled, role)
SELECT 'admin@f1sets.local',
       'AdminTrack',
       '$2b$12$2WrwosvcWqDEf8HIvjxt5.iivzn3MtGk2CTJKb5ZmrqwmRiV6EGTu',
       TRUE,
       'ADMIN'
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'admin@f1sets.local'
);

-- ============================================================
-- SEED DATA â€” F1 GAMES, TRACKS
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
-- GAMES
-- ============================================================
INSERT INTO games (id, code, display_name, is_active)
VALUES (1, 'f12023', 'F1 23', TRUE),
       (2, 'f12024', 'F1 24', TRUE),
       (3, 'f12025', 'F1 25', TRUE);

-- ============================================================
-- F1 25 TRACKS (game_id = 3)
-- ============================================================
INSERT INTO tracks (game_id, slug, grand_prix_name, circuit_name, length_km, track_image_url)
VALUES (3, 'bahrain', 'Bahrain Grand Prix', 'Bahrain International Circuit', 5.412,
        'https://commons.wikimedia.org/wiki/Category:Bahrain_International_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Bahrain.svg'),
       (3, 'saudi-arabia', 'Saudi Arabian Grand Prix', 'Jeddah Corniche Circuit', 6.174,
        'https://commons.wikimedia.org/wiki/Category:Jeddah_Corniche_Circuit_maps#/media/File:2022_F1_CourseLayout_Saudi_Arabia.svg'),
       (3, 'australia', 'Australian Grand Prix', 'Albert Park Circuit', 5.278,
        'https://commons.wikimedia.org/wiki/Category:Melbourne_Grand_Prix_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Australia.svg'),
       (3, 'japan', 'Japanese Grand Prix', 'Suzuka Circuit', 5.807,
        'https://commons.wikimedia.org/wiki/Category:Suzuka_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Japan.svg'),
       (3, 'china', 'Chinese Grand Prix', 'Shanghai International Circuit', 5.451,
        'https://upload.wikimedia.org/wikipedia/commons/f/f1/ShanghaiLayoutF1.png'),
       (3, 'miami', 'Miami Grand Prix', 'Miami International Autodrome', 5.412,
        'https://commons.wikimedia.org/wiki/Category:Miami_International_Autodrome_circuit_maps#/media/File:2022_F1_CourseLayout_Miami.svg'),
       (3, 'emilia-romagna', 'Emilia Romagna Grand Prix', 'Imola Circuit', 4.909,
        'https://upload.wikimedia.org/wikipedia/commons/4/42/Imola.svg'),
       (3, 'monaco', 'Monaco Grand Prix', 'Circuit de Monaco', 3.337,
        'https://upload.wikimedia.org/wikipedia/commons/5/56/Circuit_Monaco.svg'),
       (3, 'canada', 'Canadian Grand Prix', 'Circuit Gilles Villeneuve', 4.361,
        'https://upload.wikimedia.org/wikipedia/commons/4/45/2022_F1_CourseLayout_Canada.svg'),
       (3, 'spain', 'Spanish Grand Prix', 'Circuit de Barcelona-Catalunya', 4.675,
        'https://commons.wikimedia.org/wiki/Category:Circuit_de_Catalunya_circuit_maps#/media/File:2022_F1_CourseLayout_Spain.svg'),
       (3, 'austria', 'Austrian Grand Prix', 'Red Bull Ring', 4.318,
        'https://commons.wikimedia.org/wiki/Category:Red_Bull_Ring_circuit_maps#/media/File:2022_F1_CourseLayout_Austria.svg'),
       (3, 'great-britain', 'British Grand Prix', 'Silverstone Circuit', 5.891,
        'https://commons.wikimedia.org/wiki/Category:Silverstone_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Britain.svg'),
       (3, 'hungary', 'Hungarian Grand Prix', 'Hungaroring', 4.381,
        'https://commons.wikimedia.org/wiki/Category:Hungaroring_circuit_maps#/media/File:2022_F1_CourseLayout_Hungary.svg'),
       (3, 'belgium', 'Belgian Grand Prix', 'Circuit de Spa-Francorchamps', 7.004,
        'https://commons.wikimedia.org/wiki/Category:Circuit_de_Spa-Francorchamps_circuit_maps#/media/File:2022_F1_CourseLayout_Belgium.svg'),
       (3, 'netherlands', 'Dutch Grand Prix', 'Circuit Zandvoort', 4.259,
        'https://commons.wikimedia.org/wiki/Category:Circuit_Park_Zandvoort_circuit_maps#/media/File:2022_F1_CourseLayout_Netherlands.svg'),
       (3, 'italy', 'Italian Grand Prix', 'Autodromo Nazionale di Monza', 5.793,
        'https://commons.wikimedia.org/wiki/Category:Autodromo_Nazionale_Monza_circuit_maps#/media/File:2022_F1_CourseLayout_Italia.svg'),
       (3, 'azerbaijan', 'Azerbaijan Grand Prix', 'Baku City Circuit', 6.003,
        'https://commons.wikimedia.org/wiki/Category:Baku_Street_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Azerbaijan.svg'),
       (3, 'singapore', 'Singapore Grand Prix', 'Marina Bay Street Circuit', 4.940,
        'https://upload.wikimedia.org/wikipedia/commons/c/cf/Singapore_street_circuit_v3.svg'),
       (3, 'united-states', 'United States Grand Prix', 'Circuit of the Americas', 5.513,
        'https://commons.wikimedia.org/wiki/Category:Circuit_of_the_Americas_circuit_maps#/media/File:2022_F1_CourseLayout_COTA.svg'),
       (3, 'mexico', 'Mexico City Grand Prix', 'AutÃ³dromo Hermanos RodrÃ­guez', 4.304,
        'https://upload.wikimedia.org/wikipedia/commons/2/2e/2022_F1_CourseLayout_Mexico.svg'),
       (3, 'brazil', 'SÃ£o Paulo Grand Prix', 'Interlagos', 4.309,
        'https://upload.wikimedia.org/wikipedia/commons/5/5c/Circuit_Interlagos.svg'),
       (3, 'las-vegas', 'Las Vegas Grand Prix', 'Las Vegas Street Circuit', 6.120,
        'https://commons.wikimedia.org/wiki/Category:Las_Vegas_Street_Circuit_maps#/media/File:Las_Vegas_Street_Circuit_(preliminary_design).png'),
       (3, 'qatar', 'Qatar Grand Prix', 'Losail International Circuit', 5.419,
        'https://commons.wikimedia.org/wiki/Category:Maps_of_Formula_One_racing_circuits#/media/File:2023_F1_CourseLayout_Qatar.svg'),
       (3, 'abu-dhabi', 'Abu Dhabi Grand Prix', 'Yas Marina Circuit', 5.281,
        'https://commons.wikimedia.org/wiki/Category:Yas_Marina_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Abu_Dhabi.svg');

-- ============================================================
-- F1 24 TRACKS (game_id = 2)
-- ============================================================
INSERT INTO tracks (game_id, slug, grand_prix_name, circuit_name, length_km, track_image_url)
VALUES (2, 'bahrain', 'Bahrain Grand Prix', 'Bahrain International Circuit', 5.412,
        'https://commons.wikimedia.org/wiki/Category:Bahrain_International_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Bahrain.svg'),
       (2, 'saudi-arabia', 'Saudi Arabian Grand Prix', 'Jeddah Corniche Circuit', 6.174,
        'https://commons.wikimedia.org/wiki/Category:Jeddah_Corniche_Circuit_maps#/media/File:2022_F1_CourseLayout_Saudi_Arabia.svg'),
       (2, 'australia', 'Australian Grand Prix', 'Albert Park Circuit', 5.278,
        'https://commons.wikimedia.org/wiki/Category:Melbourne_Grand_Prix_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Australia.svg'),
       (2, 'japan', 'Japanese Grand Prix', 'Suzuka Circuit', 5.807,
        'https://commons.wikimedia.org/wiki/Category:Suzuka_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Japan.svg'),
       (2, 'china', 'Chinese Grand Prix', 'Shanghai International Circuit', 5.451,
        'https://upload.wikimedia.org/wikipedia/commons/f/f1/ShanghaiLayoutF1.png'),
       (2, 'miami', 'Miami Grand Prix', 'Miami International Autodrome', 5.412,
        'https://commons.wikimedia.org/wiki/Category:Miami_International_Autodrome_circuit_maps#/media/File:2022_F1_CourseLayout_Miami.svg'),
       (2, 'monaco', 'Monaco Grand Prix', 'Circuit de Monaco', 3.337,
        'https://upload.wikimedia.org/wikipedia/commons/5/56/Circuit_Monaco.svg'),
       (2, 'canada', 'Canadian Grand Prix', 'Circuit Gilles Villeneuve', 4.361,
        'https://upload.wikimedia.org/wikipedia/commons/4/45/2022_F1_CourseLayout_Canada.svg'),
       (2, 'spain', 'Spanish Grand Prix', 'Circuit de Barcelona-Catalunya', 4.675,
        'https://commons.wikimedia.org/wiki/Category:Circuit_de_Catalunya_circuit_maps#/media/File:2022_F1_CourseLayout_Spain.svg'),
       (2, 'great-britain', 'British Grand Prix', 'Silverstone Circuit', 5.891,
        'https://commons.wikimedia.org/wiki/Category:Silverstone_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Britain.svg'),
       (2, 'italy', 'Italian Grand Prix', 'Autodromo Nazionale di Monza', 5.793,
        'https://commons.wikimedia.org/wiki/Category:Autodromo_Nazionale_Monza_circuit_maps#/media/File:2022_F1_CourseLayout_Italia.svg'),
       (2, 'singapore', 'Singapore Grand Prix', 'Marina Bay Street Circuit', 4.940,
        'https://upload.wikimedia.org/wikipedia/commons/c/cf/Singapore_street_circuit_v3.svg'),
       (2, 'united-states', 'United States Grand Prix', 'Circuit of the Americas', 5.513,
        'https://commons.wikimedia.org/wiki/Category:Circuit_of_the_Americas_circuit_maps#/media/File:2022_F1_CourseLayout_COTA.svg'),
       (2, 'mexico', 'Mexico City Grand Prix', 'AutÃ³dromo Hermanos RodrÃ­guez', 4.304,
        'https://upload.wikimedia.org/wikipedia/commons/2/2e/2022_F1_CourseLayout_Mexico.svg'),
       (2, 'brazil', 'SÃ£o Paulo Grand Prix', 'Interlagos', 4.309,
        'https://upload.wikimedia.org/wikipedia/commons/5/5c/Circuit_Interlagos.svg'),
       (2, 'abu-dhabi', 'Abu Dhabi Grand Prix', 'Yas Marina Circuit', 5.281,
        'https://commons.wikimedia.org/wiki/Category:Yas_Marina_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Abu_Dhabi.svg'),
       (2, 'emilia-romagna', 'Emilia Romagna Grand Prix', 'Imola Circuit', 4.909,
        'https://upload.wikimedia.org/wikipedia/commons/4/42/Imola.svg'),
       (2, 'austria', 'Austrian Grand Prix', 'Red Bull Ring', 4.318,
        'https://commons.wikimedia.org/wiki/Category:Red_Bull_Ring_circuit_maps#/media/File:2022_F1_CourseLayout_Austria.svg'),
       (2, 'hungary', 'Hungarian Grand Prix', 'Hungaroring', 4.381,
        'https://commons.wikimedia.org/wiki/Category:Hungaroring_circuit_maps#/media/File:2022_F1_CourseLayout_Hungary.svg'),
       (2, 'belgium', 'Belgian Grand Prix', 'Circuit de Spa-Francorchamps', 7.004,
        'https://commons.wikimedia.org/wiki/Category:Circuit_de_Spa-Francorchamps_circuit_maps#/media/File:2022_F1_CourseLayout_Belgium.svg'),
       (2, 'netherlands', 'Dutch Grand Prix', 'Circuit Zandvoort', 4.259,
        'https://commons.wikimedia.org/wiki/Category:Circuit_Park_Zandvoort_circuit_maps#/media/File:2022_F1_CourseLayout_Netherlands.svg'),
       (2, 'azerbaijan', 'Azerbaijan Grand Prix', 'Baku City Circuit', 6.003,
        'https://commons.wikimedia.org/wiki/Category:Baku_Street_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Azerbaijan.svg'),
       (2, 'qatar', 'Qatar Grand Prix', 'Losail International Circuit', 5.419,
        'https://commons.wikimedia.org/wiki/Category:Maps_of_Formula_One_racing_circuits#/media/File:2023_F1_CourseLayout_Qatar.svg'),
       (2, 'las-vegas', 'Las Vegas Grand Prix', 'Las Vegas Street Circuit', 6.120,
        'https://commons.wikimedia.org/wiki/Category:Las_Vegas_Street_Circuit_maps#/media/File:Las_Vegas_Street_Circuit_(preliminary_design).png');

-- ============================================================
-- F1 23 TRACKS (game_id = 1)
-- ============================================================
INSERT INTO tracks (game_id, slug, grand_prix_name, circuit_name, length_km, track_image_url)
VALUES (1, 'bahrain', 'Bahrain Grand Prix', 'Bahrain International Circuit', 5.412,
        'https://commons.wikimedia.org/wiki/Category:Bahrain_International_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Bahrain.svg'),
       (1, 'saudi-arabia', 'Saudi Arabian Grand Prix', 'Jeddah Corniche Circuit', 6.174,
        'https://commons.wikimedia.org/wiki/Category:Jeddah_Corniche_Circuit_maps#/media/File:2022_F1_CourseLayout_Saudi_Arabia.svg'),
       (1, 'australia', 'Australian Grand Prix', 'Albert Park Circuit', 5.278,
        'https://commons.wikimedia.org/wiki/Category:Melbourne_Grand_Prix_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Australia.svg'),
       (1, 'azerbaijan', 'Azerbaijan Grand Prix', 'Baku City Circuit', 6.003,
        'https://commons.wikimedia.org/wiki/Category:Baku_Street_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Azerbaijan.svg'),
       (1, 'miami', 'Miami Grand Prix', 'Miami International Autodrome', 5.412,
        'https://commons.wikimedia.org/wiki/Category:Miami_International_Autodrome_circuit_maps#/media/File:2022_F1_CourseLayout_Miami.svg'),
       (1, 'monaco', 'Monaco Grand Prix', 'Circuit de Monaco', 3.337,
        'https://upload.wikimedia.org/wikipedia/commons/5/56/Circuit_Monaco.svg'),
       (1, 'spain', 'Spanish Grand Prix', 'Circuit de Barcelona-Catalunya', 4.675,
        'https://commons.wikimedia.org/wiki/Category:Circuit_de_Catalunya_circuit_maps#/media/File:2022_F1_CourseLayout_Spain.svg'),
       (1, 'canada', 'Canadian Grand Prix', 'Circuit Gilles Villeneuve', 4.361,
        'https://upload.wikimedia.org/wikipedia/commons/4/45/2022_F1_CourseLayout_Canada.svg'),
       (1, 'great-britain', 'British Grand Prix', 'Silverstone Circuit', 5.891,
        'https://commons.wikimedia.org/wiki/Category:Silverstone_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Britain.svg'),
       (1, 'austria', 'Austrian Grand Prix', 'Red Bull Ring', 4.318,
        'https://commons.wikimedia.org/wiki/Category:Red_Bull_Ring_circuit_maps#/media/File:2022_F1_CourseLayout_Austria.svg'),
       (1, 'hungary', 'Hungarian Grand Prix', 'Hungaroring', 4.381,
        'https://commons.wikimedia.org/wiki/Category:Hungaroring_circuit_maps#/media/File:2022_F1_CourseLayout_Hungary.svg'),
       (1, 'belgium', 'Belgian Grand Prix', 'Circuit de Spa-Francorchamps', 7.004,
        'https://commons.wikimedia.org/wiki/Category:Circuit_de_Spa-Francorchamps_circuit_maps#/media/File:2022_F1_CourseLayout_Belgium.svg'),
       (1, 'netherlands', 'Dutch Grand Prix', 'Circuit Zandvoort', 4.259,
        'https://commons.wikimedia.org/wiki/Category:Circuit_Park_Zandvoort_circuit_maps#/media/File:2022_F1_CourseLayout_Netherlands.svg'),
       (1, 'italy', 'Italian Grand Prix', 'Autodromo Nazionale di Monza', 5.793,
        'https://commons.wikimedia.org/wiki/Category:Autodromo_Nazionale_Monza_circuit_maps#/media/File:2022_F1_CourseLayout_Italia.svg'),
       (1, 'singapore', 'Singapore Grand Prix', 'Marina Bay Street Circuit', 4.940,
        'https://upload.wikimedia.org/wikipedia/commons/c/cf/Singapore_street_circuit_v3.svg'),
       (1, 'japan', 'Japanese Grand Prix', 'Suzuka Circuit', 5.807,
        'https://commons.wikimedia.org/wiki/Category:Suzuka_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Japan.svg'),
       (1, 'united-states', 'United States Grand Prix', 'Circuit of the Americas', 5.513,
        'https://commons.wikimedia.org/wiki/Category:Circuit_of_the_Americas_circuit_maps#/media/File:2022_F1_CourseLayout_COTA.svg'),
       (1, 'mexico', 'Mexico City Grand Prix', 'AutÃ³dromo Hermanos RodrÃ­guez', 4.304,
        'https://upload.wikimedia.org/wikipedia/commons/2/2e/2022_F1_CourseLayout_Mexico.svg'),
       (1, 'brazil', 'SÃ£o Paulo Grand Prix', 'Interlagos', 4.309,
        'https://upload.wikimedia.org/wikipedia/commons/5/5c/Circuit_Interlagos.svg'),
       (1, 'abu-dhabi', 'Abu Dhabi Grand Prix', 'Yas Marina Circuit', 5.281,
        'https://commons.wikimedia.org/wiki/Category:Yas_Marina_Circuit_circuit_maps#/media/File:2022_F1_CourseLayout_Abu_Dhabi.svg'),
       (1, 'china', 'Chinese Grand Prix', 'Shanghai International Circuit', 5.451,
        'https://upload.wikimedia.org/wikipedia/commons/f/f1/ShanghaiLayoutF1.png'),
       (1, 'emilia-romagna', 'Emilia Romagna Grand Prix', 'Imola Circuit', 4.909,
        'https://upload.wikimedia.org/wikipedia/commons/4/42/Imola.svg');

-- ============================================================
-- END OF MIGRATION
-- ============================================================
