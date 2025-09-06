import Database from 'better-sqlite3';

export function createDb(dbPath) {
	const db = new Database(dbPath);
	// Enable FK
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	// Create tables
	db.exec(`
		CREATE TABLE IF NOT EXISTS posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			content TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			likes INTEGER NOT NULL DEFAULT 0,
			reports INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'pending',
			ip_hash TEXT NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_posts_ip_hash ON posts(ip_hash);

		CREATE TABLE IF NOT EXISTS likes (
			post_id INTEGER NOT NULL,
			ip_hash TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			PRIMARY KEY (post_id, ip_hash),
			FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS reports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			post_id INTEGER NOT NULL,
			reason TEXT,
			ip_hash TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS analytics (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ip_address TEXT NOT NULL,
			user_agent TEXT,
			device_model TEXT,
			browser_kernel TEXT,
			cookie_id TEXT,
			referer TEXT,
			page_path TEXT,
			created_at INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_analytics_ip ON analytics(ip_address);
		CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_analytics_cookie ON analytics(cookie_id);

		CREATE TABLE IF NOT EXISTS admin_sessions (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			expires_at INTEGER NOT NULL
		);

	`);

	return db;
}

export function now() {
	return Math.floor(Date.now() / 1000);
} 