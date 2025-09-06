import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDb } from './db.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { analyticsMiddleware } from './analytics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);

app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('tiny'));

const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin, credentials: false }));

const db = createDb(process.env.DB_PATH || path.join(__dirname, '..', 'data.db'));
app.set('db', db);

// 添加访问统计中间件
app.use(analyticsMiddleware(db));

app.use('/api', publicRouter(db));
app.use('/api/admin', adminRouter(db));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (_req, res) => {
	res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
	console.log(`Echo Hole server listening on http://localhost:${port}`);
}); 