const express = require('express');
const cors = require('cors');
const path = require('path');
const palaceRoutes = require('./routes/palaces');
const timelineRoutes = require('./routes/timeline');
const authRoutes = require('./routes/auth');
const achievementRoutes = require('./routes/achievements');
const encyclopediaRoutes = require('./routes/encyclopedia');
const quizRoutes = require('./routes/quiz');
const signinRoutes = require('./routes/signin');
const skinRoutes = require('./routes/skins');
const shareRoutes = require('./routes/share');
const sharePageRoutes = require('./routes/sharePage');
const assetsRoutes = require('./routes/assets');
const searchRoutes = require('./routes/search');
const taxonomyRoutes = require('./routes/taxonomy');
const routeRoutes = require('./routes/routes');
const recommendRoutes = require('./routes/recommend');
const contentRoutes = require('./routes/content');
const hotspotRoutes = require('./routes/hotspots');
const metricsRoutes = require('./routes/metrics');
const seoRoutes = require('./routes/seo');

const app = express();


// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 指向项目根目录的图片、模型等资源
const projectRoot = path.resolve(__dirname, '../../');
app.use('/images', express.static(path.join(projectRoot, 'images')));
app.use('/models', express.static(path.join(projectRoot, 'models')));
app.use('/videos', express.static(path.join(projectRoot, 'videos')));

// 生产环境下提供前端构建产物
const clientDist = path.join(projectRoot, 'client', 'dist');
app.use(express.static(clientDist));

// API 路由
app.use('/api/palaces', palaceRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/encyclopedia', encyclopediaRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/signin', signinRoutes);
app.use('/api/skins', skinRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/taxonomy', taxonomyRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/metrics', metricsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SEO 路由 — 必须早于 SPA fallback
app.use(seoRoutes);

// 分享卡片页 — 置于静态与 API 之后、SPA fallback 之前
app.use('/share', sharePageRoutes);

const ENCYCLOPEDIA_FILTER_KEYS = ['building', 'entry_type', 'category', 'dynasty', 'region', 'q'];

function shouldNoindex(pathname, rawQuery = '') {
  if (['/search', '/profile', '/curator'].includes(pathname)) return true;
  if (pathname === '/encyclopedia') {
    const query = String(rawQuery).includes('?')
      ? String(rawQuery).split('?')[1]
      : String(rawQuery);
    const params = new URLSearchParams(query);
    return ENCYCLOPEDIA_FILTER_KEYS.some((key) => params.has(key));
  }
  return false;
}

// SPA fallback：公开深链刷新不 404
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/share') ||
    req.path === '/robots.txt' ||
    req.path.startsWith('/sitemap')
  ) {
    return next();
  }

  if (shouldNoindex(req.path, req.originalUrl)) {
    res.set('X-Robots-Tag', 'noindex, follow');
  }

  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

module.exports = app;
module.exports.shouldNoindex = shouldNoindex;
