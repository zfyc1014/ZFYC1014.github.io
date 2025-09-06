import { v4 as uuidv4 } from 'uuid';
import { now } from './db.js';
import crypto from 'crypto';

// 管理员配置
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_DURATION = 24 * 60 * 60; // 24小时

// 生成密码哈希
function hashPassword(password) {
	return crypto.createHash('sha256').update(password + 'echo-hole-salt').digest('hex');
}

// 验证管理员登录
export function verifyAdmin(username, password) {
	const hashedPassword = hashPassword(ADMIN_PASSWORD);
	const inputHashedPassword = hashPassword(password);
	
	return username === ADMIN_USERNAME && inputHashedPassword === hashedPassword;
}

// 创建管理员会话
export function createAdminSession(db, username) {
	const sessionId = uuidv4();
	const expiresAt = now() + SESSION_DURATION;
	
	// 清理过期会话
	cleanupExpiredSessions(db);
	
	// 创建新会话
	db.prepare(`
		INSERT INTO admin_sessions (id, username, created_at, expires_at)
		VALUES (?, ?, ?, ?)
	`).run(sessionId, username, now(), expiresAt);
	
	return sessionId;
}

// 验证管理员会话
export function verifyAdminSession(db, sessionId) {
	if (!sessionId) return false;
	
	const session = db.prepare(`
		SELECT * FROM admin_sessions 
		WHERE id = ? AND expires_at > ?
	`).get(sessionId, now());
	
	return !!session;
}

// 清理过期会话
export function cleanupExpiredSessions(db) {
	db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now());
}

// 删除会话
export function deleteAdminSession(db, sessionId) {
	db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(sessionId);
}

// 管理员认证中间件
export function adminAuthMiddleware(db) {
	return (req, res, next) => {
		const sessionId = req.cookies?.admin_session;
		
		if (!verifyAdminSession(db, sessionId)) {
			return res.status(401).json({ error: '需要管理员权限' });
		}
		
		next();
	};
}
