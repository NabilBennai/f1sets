CREATE TABLE app_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  level VARCHAR(16) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  path VARCHAR(255) NOT NULL,
  query_string VARCHAR(1024),
  status_code INT NOT NULL,
  duration_ms BIGINT NOT NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(32),
  client_ip VARCHAR(64),
  user_agent VARCHAR(512),
  message VARCHAR(512),
  PRIMARY KEY (id)
);

CREATE INDEX idx_app_logs_created_at ON app_logs (created_at DESC);
CREATE INDEX idx_app_logs_level_created_at ON app_logs (level, created_at DESC);
CREATE INDEX idx_app_logs_status_created_at ON app_logs (status_code, created_at DESC);
CREATE INDEX idx_app_logs_user_email_created_at ON app_logs (user_email, created_at DESC);
