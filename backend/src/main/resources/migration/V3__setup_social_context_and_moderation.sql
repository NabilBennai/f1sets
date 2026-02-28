ALTER TABLE setups
    ADD COLUMN session_type VARCHAR(32) NULL,
    ADD COLUMN weather_condition VARCHAR(32) NULL,
    ADD COLUMN assists_preset VARCHAR(32) NULL,
    ADD COLUMN input_device VARCHAR(32) NULL,
    ADD COLUMN fuel_load_kg DECIMAL(6, 2) NULL,
    ADD COLUMN tyre_compound VARCHAR(32) NULL,
    ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN hidden_reason VARCHAR(255) NULL,
    ADD COLUMN hidden_at TIMESTAMP NULL,
    ADD COLUMN hidden_by_user_id BIGINT NULL,
    ADD CONSTRAINT fk_setups_hidden_by_user FOREIGN KEY (hidden_by_user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX ix_setups_visibility ON setups (is_hidden, deleted_at, created_at);
CREATE INDEX ix_setups_context ON setups (session_type, weather_condition, input_device);

CREATE TABLE setup_votes
(
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    setup_id    BIGINT    NOT NULL,
    user_id     BIGINT    NOT NULL,
    vote_value  TINYINT   NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_setup_votes_setup_user UNIQUE (setup_id, user_id),
    CONSTRAINT fk_setup_votes_setup FOREIGN KEY (setup_id) REFERENCES setups (id) ON DELETE CASCADE,
    CONSTRAINT fk_setup_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_setup_votes_value CHECK (vote_value IN (-1, 1))
) ENGINE = InnoDB;

CREATE INDEX ix_setup_votes_setup ON setup_votes (setup_id, vote_value);
CREATE INDEX ix_setup_votes_user ON setup_votes (user_id, created_at);

CREATE TABLE setup_reports
(
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    setup_id    BIGINT       NOT NULL,
    reporter_id BIGINT       NOT NULL,
    reason      VARCHAR(255) NOT NULL,
    status      VARCHAR(16)  NOT NULL DEFAULT 'OPEN',
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP    NULL,
    resolved_by BIGINT       NULL,
    CONSTRAINT fk_setup_reports_setup FOREIGN KEY (setup_id) REFERENCES setups (id) ON DELETE CASCADE,
    CONSTRAINT fk_setup_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_setup_reports_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX ix_setup_reports_status_created ON setup_reports (status, created_at);
CREATE INDEX ix_setup_reports_setup ON setup_reports (setup_id, status);

CREATE TABLE setup_moderation_actions
(
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    setup_id     BIGINT       NOT NULL,
    admin_user_id BIGINT      NOT NULL,
    action_type  VARCHAR(24)  NOT NULL,
    reason       VARCHAR(255) NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_setup_moderation_actions_setup FOREIGN KEY (setup_id) REFERENCES setups (id) ON DELETE CASCADE,
    CONSTRAINT fk_setup_moderation_actions_admin FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_setup_moderation_actions_setup_created ON setup_moderation_actions (setup_id, created_at);
