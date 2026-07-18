const jwt = require('jsonwebtoken');

// JWT 密钥 — 生产环境需通过环境变量注入
const JWT_SECRET = process.env.JWT_SECRET || 'gu_gong_visual_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * JWT 认证中间件
 * 从 Authorization 头部提取 Bearer Token 并验证
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '请先登录',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // { id, username, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '登录已过期，请重新登录',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      error: '无效的令牌',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * 可选认证中间件 — 不强制要求Token，但如果提供了就解析
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Token无效时忽略，当作未登录处理
    }
  }

  next();
}

/**
 * 生成 JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

module.exports = { authMiddleware, optionalAuth, generateToken, JWT_SECRET, JWT_EXPIRES_IN };
