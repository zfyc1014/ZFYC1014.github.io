import express from 'express';
import { now } from '../db.js';
import { verifyAdmin, createAdminSession, verifyAdminSession, deleteAdminSession, adminAuthMiddleware } from '../admin-auth.js';
import { getAnalyticsData } from '../analytics.js';

export function adminRouter(db) {
	const router = express.Router();
	
	// 登录接口
	router.post('/login', (req, res) => {
		const { username, password } = req.body || {};
		
		if (!username || !password) {
			return res.status(400).json({ error: '用户名和密码不能为空' });
		}
		
		if (verifyAdmin(username, password)) {
			const sessionId = createAdminSession(db, username);
			res.cookie('admin_session', sessionId, {
				maxAge: 24 * 60 * 60 * 1000, // 24小时
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax'
			});
			res.json({ success: true });
		} else {
			res.status(401).json({ error: '用户名或密码错误' });
		}
	});
	
	// 登出接口
	router.post('/logout', (req, res) => {
		const sessionId = req.cookies?.admin_session;
		if (sessionId) {
			deleteAdminSession(db, sessionId);
		}
		res.clearCookie('admin_session');
		res.json({ success: true });
	});
	
	// 验证登录状态
	router.get('/status', (req, res) => {
		const sessionId = req.cookies?.admin_session;
		const isLoggedIn = verifyAdminSession(db, sessionId);
		res.json({ loggedIn: isLoggedIn });
	});
	
	// 获取统计数据
	router.get('/analytics', adminAuthMiddleware(db), (req, res) => {
		const timeRange = Number(req.query.timeRange || 24);
		const data = getAnalyticsData(db, timeRange);
		res.json(data);
	});
	
	// 获取实时访问记录
	router.get('/realtime', adminAuthMiddleware(db), (req, res) => {
		const limit = Math.min(100, Number(req.query.limit || 20));
		const recentVisits = db.prepare(`
			SELECT ip_address, device_model, browser_kernel, page_path, created_at
			FROM analytics 
			ORDER BY created_at DESC 
			LIMIT ?
		`).all(limit);
		
		res.json({ visits: recentVisits });
	});
	
	// 需要认证的管理接口
	router.use(adminAuthMiddleware(db));

	router.get('/posts', (req, res) => {
		const status = String(req.query.status || 'pending');
		const page = Math.max(1, Number(req.query.page || 1));
		const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
		const offset = (page - 1) * pageSize;
		const rows = db.prepare(`
			SELECT * FROM posts
			WHERE status = ?
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?
		`).all(status, pageSize, offset);
		res.json({ page, pageSize, list: rows });
	});

	router.post('/approve', (req, res) => {
		const { id } = req.body || {};
		if (!id) return res.status(400).json({ error: '缺少参数' });
		db.prepare('UPDATE posts SET status = ? WHERE id = ?').run('approved', id);
		res.json({ ok: true });
	});

	router.post('/reject', (req, res) => {
		const { id } = req.body || {};
		if (!id) return res.status(400).json({ error: '缺少参数' });
		db.prepare('UPDATE posts SET status = ? WHERE id = ?').run('rejected', id);
		res.json({ ok: true });
	});

	router.post('/delete', (req, res) => {
		const { id } = req.body || {};
		if (!id) return res.status(400).json({ error: '缺少参数' });
		db.prepare('DELETE FROM posts WHERE id = ?').run(id);
		res.json({ ok: true });
	});

	return router;
} 