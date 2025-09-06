import { now } from '../db.js';
import { hashIp, checkRateLimit, filterContent } from '../risk.js';
import express from 'express';

export function publicRouter(db) {
	const router = express.Router();
	const salt = process.env.IP_SALT || 'echo-hole-salt';


	router.post('/submit', (req, res) => {
		const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
		const ua = req.headers['user-agent'] || '';
		const ipHash = hashIp(ip, ua, salt);

		const rl = checkRateLimit(`submit:${ipHash}`);
		if (!rl.allowed) return res.status(429).json({ error: '太频繁了，请稍后再试', retryAfter: rl.retryAfter });

		const { content } = req.body || {};

		const { ok, content: sanitized, reason } = filterContent(content);
		if (!ok) return res.status(400).json({ error: reason });

		db.prepare('INSERT INTO posts(content, created_at, ip_hash) VALUES (?, ?, ?)')
			.run(sanitized, now(), ipHash);
		res.json({ ok: true });
	});

	router.get('/list', (req, res) => {
		const page = Math.max(1, Number(req.query.page || 1));
		const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)));
		const offset = (page - 1) * pageSize;
		const rows = db.prepare(`
			SELECT id, content, created_at, likes FROM posts
			WHERE status = 'approved'
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?
		`).all(pageSize, offset);
		res.json({ page, pageSize, list: rows });
	});

	router.post('/like', (req, res) => {
		const { postId } = req.body || {};
		if (!postId) return res.status(400).json({ error: '缺少参数' });
		const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
		const ua = req.headers['user-agent'] || '';
		const ipHash = hashIp(ip, ua, salt);

		try {
			db.prepare('INSERT INTO likes(post_id, ip_hash, created_at) VALUES (?, ?, ?)')
				.run(postId, ipHash, now());
			db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(postId);
		} catch (e) {
			return res.status(400).json({ error: '你已经点过赞了' });
		}
		res.json({ ok: true });
	});

	router.post('/report', (req, res) => {
		const { postId, reason } = req.body || {};
		if (!postId) return res.status(400).json({ error: '缺少参数' });
		const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
		const ua = req.headers['user-agent'] || '';
		const ipHash = hashIp(ip, ua, salt);

		db.prepare('INSERT INTO reports(post_id, reason, ip_hash, created_at) VALUES (?, ?, ?, ?)')
			.run(postId, String(reason || '').slice(0, 200), ipHash, now());
		db.prepare('UPDATE posts SET reports = reports + 1 WHERE id = ?').run(postId);
		res.json({ ok: true });
	});

	return router;
} 