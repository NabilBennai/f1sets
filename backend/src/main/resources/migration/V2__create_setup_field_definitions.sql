CREATE TABLE setup_field_definitions
(
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id             BIGINT       NOT NULL,
    field_key           VARCHAR(80)  NOT NULL,
    field_label         VARCHAR(120) NOT NULL,
    field_type          VARCHAR(20)  NOT NULL,
    is_required         BOOLEAN      NOT NULL DEFAULT FALSE,
    select_options_json JSON         NULL,
    sort_order          INT          NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_setup_field_definitions_game_key UNIQUE (game_id, field_key),
    CONSTRAINT fk_setup_field_definitions_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_setup_field_definitions_game_sort ON setup_field_definitions (game_id, sort_order, field_label);
