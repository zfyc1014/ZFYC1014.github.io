-- Supabase数据库表结构
-- 在Supabase Dashboard的SQL编辑器中执行以下SQL

-- 创建帖子表
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL CHECK (length(content) <= 1000),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'reported', 'hidden')),
    likes INTEGER NOT NULL DEFAULT 0,
    reports INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    visitor_id TEXT NOT NULL,
    last_updated BIGINT NOT NULL
);

-- 创建点赞表
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE(post_id, visitor_id)
);

-- 创建举报表
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reason TEXT,
    visitor_id TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

-- 创建访问统计表
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    device_model TEXT,
    browser_kernel TEXT,
    page_path TEXT NOT NULL,
    referer TEXT,
    created_at BIGINT NOT NULL
);

-- 创建管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visitor_id ON posts(visitor_id);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_visitor_id ON likes(visitor_id);

CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_visitor_id ON reports(visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_visitor_id ON analytics(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_ip_address ON analytics(ip_address);

-- 启用行级安全性 (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略 - 允许所有人读取已发布的帖子
CREATE POLICY "Allow read published posts" ON posts
    FOR SELECT USING (status = 'published');

-- 允许所有人插入新帖子
CREATE POLICY "Allow insert posts" ON posts
    FOR INSERT WITH CHECK (true);

-- 允许所有人更新帖子的点赞数和举报数
CREATE POLICY "Allow update post stats" ON posts
    FOR UPDATE USING (true);

-- 允许所有人读取点赞记录
CREATE POLICY "Allow read likes" ON likes
    FOR SELECT USING (true);

-- 允许所有人插入点赞记录
CREATE POLICY "Allow insert likes" ON likes
    FOR INSERT WITH CHECK (true);

-- 允许所有人删除自己的点赞记录
CREATE POLICY "Allow delete own likes" ON likes
    FOR DELETE USING (visitor_id = current_setting('app.visitor_id', true));

-- 允许所有人读取举报记录
CREATE POLICY "Allow read reports" ON reports
    FOR SELECT USING (true);

-- 允许所有人插入举报记录
CREATE POLICY "Allow insert reports" ON reports
    FOR INSERT WITH CHECK (true);

-- 允许所有人插入访问统计
CREATE POLICY "Allow insert analytics" ON analytics
    FOR INSERT WITH CHECK (true);

-- 允许所有人读取访问统计
CREATE POLICY "Allow read analytics" ON analytics
    FOR SELECT USING (true);

-- 创建函数：增加帖子点赞数
CREATE OR REPLACE FUNCTION increment_post_likes(post_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE posts SET likes = likes + 1 WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：减少帖子点赞数
CREATE OR REPLACE FUNCTION decrement_post_likes(post_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：增加帖子举报数
CREATE OR REPLACE FUNCTION increment_post_reports(post_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE posts SET reports = reports + 1 WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：自动更新last_updated字段
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = EXTRACT(EPOCH FROM NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_last_updated
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated();

-- 插入一些示例数据（可选）
INSERT INTO posts (id, content, status, likes, reports, created_at, visitor_id, last_updated) VALUES
    (gen_random_uuid(), '欢迎来到留声洞！这是一个匿名交流平台。', 'published', 5, 0, EXTRACT(EPOCH FROM NOW()), 'demo_visitor_1', EXTRACT(EPOCH FROM NOW())),
    (gen_random_uuid(), '今天天气真不错，适合出去走走。', 'published', 3, 0, EXTRACT(EPOCH FROM NOW()), 'demo_visitor_2', EXTRACT(EPOCH FROM NOW())),
    (gen_random_uuid(), '有什么好的电影推荐吗？', 'published', 2, 0, EXTRACT(EPOCH FROM NOW()), 'demo_visitor_3', EXTRACT(EPOCH FROM NOW()));

-- 创建实时订阅的视图（用于实时更新）
CREATE OR REPLACE VIEW posts_realtime AS
SELECT 
    id,
    content,
    status,
    likes,
    reports,
    created_at,
    visitor_id,
    last_updated
FROM posts
WHERE status = 'published'
ORDER BY created_at DESC;

-- 创建被举报帖子的视图
CREATE OR REPLACE VIEW reported_posts AS
SELECT 
    p.*,
    r.reason as report_reason,
    r.created_at as reported_at
FROM posts p
JOIN reports r ON p.id = r.post_id
WHERE p.status = 'reported'
ORDER BY r.created_at DESC;
