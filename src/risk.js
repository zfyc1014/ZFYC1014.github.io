import crypto from 'crypto';

const windowSeconds = 60 * 60; // 1 hour
const submitLimit = 5; // submissions per window

export function hashIp(ip, userAgent, salt) {
	const h = crypto.createHash('sha256');
	h.update(String(ip || ''));
	h.update('|');
	h.update(String(userAgent || ''));
	h.update('|');
	h.update(String(salt || 'default_salt'));
	return h.digest('hex').slice(0, 32);
}

const buckets = new Map(); // key -> { count, resetAt }

export function checkRateLimit(key) {
	const now = Math.floor(Date.now() / 1000);
	let b = buckets.get(key);
	if (!b || now >= b.resetAt) {
		b = { count: 0, resetAt: now + windowSeconds };
		buckets.set(key, b);
	}
	if (b.count >= submitLimit) {
		return { allowed: false, retryAfter: b.resetAt - now };
	}
	b.count += 1;
	return { allowed: true, retryAfter: 0 };
}

const sensitiveWords = [
	'暴力',
	'恐怖',
	'黄赌毒',
	'黑产',
	'人身攻击'
];

export function filterContent(content) {
	let sanitized = String(content || '').trim();
	if (sanitized.length === 0) return { ok: false, content: '', reason: '内容为空' };
	if (sanitized.length > 1000) return { ok: false, content: '', reason: '内容过长(≤1000字)' };
	for (const w of sensitiveWords) {
		if (sanitized.includes(w)) {
			sanitized = sanitized.replaceAll(w, '*'.repeat(w.length));
		}
	}
	return { ok: true, content: sanitized };
} 