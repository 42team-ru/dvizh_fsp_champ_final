-- Блог: гайды без даты и посты с тренировки (привязаны к прошедшей встрече). Текст — Markdown.
CREATE TABLE blog_posts (
    id                     UUID PRIMARY KEY,
    author_id              UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type                   VARCHAR(20)   NOT NULL,
    status                 VARCHAR(20)   NOT NULL,
    event_id               UUID REFERENCES events (id) ON DELETE SET NULL,
    sport_id               UUID REFERENCES sports (id),
    title                  VARCHAR(120)  NOT NULL,
    body                   VARCHAR(20000) NOT NULL,
    widget_organization_id UUID REFERENCES organizations (id) ON DELETE SET NULL,
    widget_user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
    comments_enabled       BOOLEAN       NOT NULL DEFAULT TRUE,
    published_at           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ   NOT NULL,
    updated_at             TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_blog_posts_feed ON blog_posts (status, published_at DESC);
CREATE INDEX ix_blog_posts_author ON blog_posts (author_id, created_at DESC);
CREATE INDEX ix_blog_posts_event ON blog_posts (event_id);

-- Фото поста по порядку: первое — обложка. Сам файл в files (BLOG_PHOTO или фото альбома/мероприятия этой встречи).
CREATE TABLE blog_post_photos (
    id         UUID PRIMARY KEY,
    post_id    UUID         NOT NULL REFERENCES blog_posts (id) ON DELETE CASCADE,
    file_id    UUID         NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    position   INTEGER      NOT NULL,
    caption    VARCHAR(300),
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_blog_post_photos UNIQUE (post_id, file_id)
);
CREATE INDEX ix_blog_post_photos_post ON blog_post_photos (post_id, position);

-- Лайк: связь «пост — человек», счётчик считается запросом.
CREATE TABLE blog_post_likes (
    id         UUID PRIMARY KEY,
    post_id    UUID        NOT NULL REFERENCES blog_posts (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_blog_post_likes UNIQUE (post_id, user_id)
);
CREATE INDEX ix_blog_post_likes_user ON blog_post_likes (user_id);

-- Комментарии под постом: ответ на сообщение, правка и мягкое удаление своего.
CREATE TABLE blog_comments (
    id         UUID PRIMARY KEY,
    post_id    UUID          NOT NULL REFERENCES blog_posts (id) ON DELETE CASCADE,
    author_id  UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    text       VARCHAR(2000) NOT NULL,
    parent_id  UUID REFERENCES blog_comments (id) ON DELETE SET NULL,
    edited_at  TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ   NOT NULL,
    updated_at TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_blog_comments_post ON blog_comments (post_id, created_at);
