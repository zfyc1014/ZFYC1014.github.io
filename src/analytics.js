import { v4 as uuidv4 } from 'uuid';
import { now } from './db.js';

// 解析User-Agent获取设备信息
function parseUserAgent(userAgent) {
	const ua = userAgent.toLowerCase();
	
	// 检测设备型号
	let deviceModel = 'Unknown';
	if (ua.includes('iphone')) {
		const match = ua.match(/iphone os (\d+_\d+)/);
		deviceModel = match ? `iPhone (iOS ${match[1].replace('_', '.')})` : 'iPhone';
	} else if (ua.includes('ipad')) {
		const match = ua.match(/ipad.*os (\d+_\d+)/);
		deviceModel = match ? `iPad (iOS ${match[1].replace('_', '.')})` : 'iPad';
	} else if (ua.includes('android')) {
		const match = ua.match(/android [\d.]+; ([^)]+)/);
		deviceModel = match ? `Android (${match[1]})` : 'Android Device';
	} else if (ua.includes('windows')) {
		deviceModel = 'Windows PC';
	} else if (ua.includes('macintosh') || ua.includes('mac os')) {
		deviceModel = 'Mac';
	} else if (ua.includes('linux')) {
		deviceModel = 'Linux PC';
	}
	
	// 检测浏览器内核
	let browserKernel = 'Unknown';
	if (ua.includes('chrome') && !ua.includes('edg')) {
		browserKernel = 'Chromium';
	} else if (ua.includes('firefox')) {
		browserKernel = 'Gecko (Firefox)';
	} else if (ua.includes('safari') && !ua.includes('chrome')) {
		browserKernel = 'WebKit (Safari)';
	} else if (ua.includes('edg')) {
		browserKernel = 'Chromium (Edge)';
	} else if (ua.includes('opera') || ua.includes('opr')) {
		browserKernel = 'Chromium (Opera)';
	}
	
	return { deviceModel, browserKernel };
}

// 生成或获取Cookie ID
function getCookieId(req, res) {
	let cookieId = req.cookies?.visitor_id;
	if (!cookieId) {
		cookieId = uuidv4();
		res.cookie('visitor_id', cookieId, {
			maxAge: 365 * 24 * 60 * 60 * 1000, // 1年
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax'
		});
	}
	return cookieId;
}

// 访问统计中间件
export function analyticsMiddleware(db) {
	return (req, res, next) => {
		// 跳过静态资源和API请求
		if (req.path.startsWith('/api/') || 
			req.path.includes('.') || 
			req.path === '/favicon.ico') {
			return next();
		}
		
		try {
			const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
			const userAgent = req.headers['user-agent'] || '';
			const referer = req.headers.referer || '';
			const { deviceModel, browserKernel } = parseUserAgent(userAgent);
			const cookieId = getCookieId(req, res);
			const pagePath = req.path;
			
			// 异步记录访问数据，不阻塞请求
			setImmediate(() => {
				try {
					db.prepare(`
						INSERT INTO analytics (ip_address, user_agent, device_model, browser_kernel, cookie_id, referer, page_path, created_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					`).run(ip, userAgent, deviceModel, browserKernel, cookieId, referer, pagePath, now());
				} catch (error) {
					console.error('Analytics recording error:', error);
				}
			});
			
		} catch (error) {
			console.error('Analytics middleware error:', error);
		}
		
		next();
	};
}

// 获取统计数据
export function getAnalyticsData(db, timeRange = 24) {
	const since = now() - (timeRange * 60 * 60); // 默认24小时
	
	// 总访问量
	const totalVisits = db.prepare(`
		SELECT COUNT(*) as count FROM analytics WHERE created_at > ?
	`).get(since).count;
	
	// 独立访客数
	const uniqueVisitors = db.prepare(`
		SELECT COUNT(DISTINCT cookie_id) as count FROM analytics WHERE created_at > ?
	`).get(since).count;
	
	// 独立IP数
	const uniqueIPs = db.prepare(`
		SELECT COUNT(DISTINCT ip_address) as count FROM analytics WHERE created_at > ?
	`).get(since).count;
	
	// 设备型号统计
	const deviceStats = db.prepare(`
		SELECT device_model, COUNT(*) as count 
		FROM analytics 
		WHERE created_at > ? 
		GROUP BY device_model 
		ORDER BY count DESC 
		LIMIT 10
	`).all(since);
	
	// 浏览器内核统计
	const browserStats = db.prepare(`
		SELECT browser_kernel, COUNT(*) as count 
		FROM analytics 
		WHERE created_at > ? 
		GROUP BY browser_kernel 
		ORDER BY count DESC 
		LIMIT 10
	`).all(since);
	
	// 最近访问记录
	const recentVisits = db.prepare(`
		SELECT ip_address, device_model, browser_kernel, page_path, created_at
		FROM analytics 
		WHERE created_at > ? 
		ORDER BY created_at DESC 
		LIMIT 50
	`).all(since);
	
	// 按小时统计访问量
	const hourlyStats = db.prepare(`
		SELECT 
			strftime('%H', datetime(created_at, 'unixepoch')) as hour,
			COUNT(*) as count
		FROM analytics 
		WHERE created_at > ? 
		GROUP BY hour 
		ORDER BY hour
	`).all(since);
	
	return {
		totalVisits,
		uniqueVisitors,
		uniqueIPs,
		deviceStats,
		browserStats,
		recentVisits,
		hourlyStats,
		timeRange
	};
}
