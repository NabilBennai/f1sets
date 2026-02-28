ALTER TABLE app_logs
  ADD COLUMN request_payload_json LONGTEXT NULL AFTER message,
  ADD COLUMN response_body_json LONGTEXT NULL AFTER request_payload_json;
