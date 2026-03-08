CREATE TABLE friend_requests
(
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id   BIGINT       NOT NULL,
    receiver_id BIGINT       NOT NULL,
    status      VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    responded_at TIMESTAMP   NULL,
    CONSTRAINT uk_friend_requests_sender_receiver UNIQUE (sender_id, receiver_id),
    CONSTRAINT ck_friend_requests_sender_receiver CHECK (sender_id <> receiver_id),
    CONSTRAINT ck_friend_requests_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT fk_friend_requests_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_friend_requests_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_friend_requests_receiver_status_created
    ON friend_requests (receiver_id, status, created_at);
CREATE INDEX ix_friend_requests_sender_status_created
    ON friend_requests (sender_id, status, created_at);

CREATE TABLE friendships
(
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_low_id BIGINT      NOT NULL,
    user_high_id BIGINT     NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_friendships_pair UNIQUE (user_low_id, user_high_id),
    CONSTRAINT ck_friendships_pair_order CHECK (user_low_id < user_high_id),
    CONSTRAINT fk_friendships_user_low FOREIGN KEY (user_low_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_friendships_user_high FOREIGN KEY (user_high_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_friendships_user_low ON friendships (user_low_id, created_at);
CREATE INDEX ix_friendships_user_high ON friendships (user_high_id, created_at);

CREATE TABLE chat_messages
(
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id     BIGINT        NOT NULL,
    recipient_id  BIGINT        NOT NULL,
    content       VARCHAR(2000) NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at       TIMESTAMP     NULL,
    CONSTRAINT ck_chat_messages_sender_recipient CHECK (sender_id <> recipient_id),
    CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_chat_messages_sender_recipient_created
    ON chat_messages (sender_id, recipient_id, created_at);
CREATE INDEX ix_chat_messages_recipient_sender_created
    ON chat_messages (recipient_id, sender_id, created_at);
