import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const INTEREST_TAGS = [
  { key: 'tourist', label: '游历者', desc: '走马观花，遍览宫阙', icon: 'fa-compass' },
  { key: 'student', label: '求学者', desc: '钻研古建，考据源流', icon: 'fa-book' },
  { key: 'designer', label: '营造师', desc: '匠心独运，营建之美', icon: 'fa-pen-ruler' },
];

/**
 * 登录/注册模态框 — "入宫通行证" 宫廷美学设计
 * 设计灵感: 奏折/令牌样式, 回纹边框, 朱红配金
 */
function LoginModal({ open, onClose }) {
  const { login, register, loading } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [phase, setPhase] = useState('hidden'); // hidden -> entering -> visible

  // 表单
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [interestTag, setInterestTag] = useState('');

  // UI 状态
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usernameRef = useRef(null);
  const modalRef = useRef(null);

  // 入场/出场动画
  useEffect(() => {
    if (open) {
      setPhase('entering');
      const timer = setTimeout(() => setPhase('visible'), 50);
      return () => clearTimeout(timer);
    } else {
      setPhase('hidden');
      // 延迟清空表单让关闭动画播放
    }
  }, [open]);

  // 切换登录/注册时清空错误
  useEffect(() => {
    setError('');
    setUsername('');
    setPassword('');
    setEmail('');
    setInterestTag('');
    setShowPassword(false);
  }, [mode]);

  // 自动聚焦
  useEffect(() => {
    if (phase === 'visible' && usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [phase, mode]);

  // 点击遮罩关闭
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // 退出动画
  const handleClose = () => {
    setPhase('entering'); // 触发退出动画
    setTimeout(() => {
      onClose();
      // 重置表单
      setError('');
      setUsername('');
      setPassword('');
      setEmail('');
      setInterestTag('');
    }, 350);
  };

  // 提交登录
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('请输入完整的入宫凭证');
      return;
    }

    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);

    if (result.success) {
      handleClose();
    } else {
      setError(result.message);
    }
  };

  // 提交注册
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请赐告尊姓大名');
      return;
    }
    if (username.trim().length < 2) {
      setError('名号至少两字');
      return;
    }
    if (password.length < 6) {
      setError('身份信物至少六位，方保无虞');
      return;
    }

    setSubmitting(true);
    const result = await register(username.trim(), password, email.trim() || undefined, interestTag || undefined);
    setSubmitting(false);

    if (result.success) {
      handleClose();
    } else {
      setError(result.message);
    }
  };

  // ESC 关闭
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && open) handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!open && phase === 'hidden') return null;

  const isEntering = phase === 'entering' && !open;
  const isVisible = phase === 'visible' && open;

  return (
    <div
      className={`auth-overlay${isVisible ? ' visible' : ''}${isEntering ? ' exiting' : ''}`}
      onClick={handleOverlayClick}
    >
      {/* 背景装饰 — 四季更换的摄影背景 */}
      <div className="auth-background">
        <div className="auth-bg-layer" />
        <div className="auth-bg-scroll">
          {/* 抽象山峦轮廓 */}
          <div className="auth-bg-mountain auth-bg-mountain--1" />
          <div className="auth-bg-mountain auth-bg-mountain--2" />
          <div className="auth-bg-mountain auth-bg-mountain--3" />
        </div>
        {/* 诗词 */}
        <div className="auth-bg-verse">
          <p className="verse-line">红墙黄瓦</p>
          <p className="verse-line verse-line--sub">岁月悠长</p>
        </div>
      </div>

      {/* 模态框主体："令牌"样式 */}
      <div
        ref={modalRef}
        className={`auth-modal${isVisible ? ' visible' : ''}${isEntering ? ' exiting' : ''}`}
      >
        {/* 回纹边框装饰 */}
        <div className="auth-modal-meander top-left" />
        <div className="auth-modal-meander top-right" />
        <div className="auth-modal-meander bottom-left" />
        <div className="auth-modal-meander bottom-right" />

        {/* 顶部印章 */}
        <div className="auth-modal-seal">
          <div className="auth-modal-seal-inner">
            {mode === 'login' ? (
              <><span>入</span><span>宫</span></>
            ) : (
              <><span>腰</span><span>牌</span></>
            )}
          </div>
        </div>

        {/* 标题 */}
        <div className="auth-modal-header">
          <h2 className="auth-modal-title">
            {mode === 'login' ? '验明正身' : '领取腰牌'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'login'
              ? '出示凭证，踏入紫禁城数字之旅'
              : '加入故宫数字社区，开启您的营造之旅'
            }
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="auth-modal-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => setMode('login')}
          >
            账号登录
            <span className={`auth-tab-brush${mode === 'login' ? ' active' : ''}`} />
          </button>
          <button
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => setMode('register')}
          >
            用户注册
            <span className={`auth-tab-brush${mode === 'register' ? ' active' : ''}`} />
          </button>
        </div>

        {/* 表单 */}
        <form
          className="auth-modal-form"
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
        >
          {/* 用户名 */}
          <div className="auth-form-field">
            <div className="auth-input-wrap">
              <i className={`fas ${mode === 'login' ? 'fa-user' : 'fa-user-plus'} auth-input-icon`} />
              <input
                ref={mode === 'login' ? usernameRef : null}
                type="text"
                className="auth-input"
                placeholder={mode === 'login' ? '名号 / 信笺' : '请赐告尊姓大名'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              <span className="auth-input-line" />
            </div>
          </div>

          {/* 邮箱 (仅注册) */}
          {mode === 'register' && (
            <div className="auth-form-field">
              <div className="auth-input-wrap">
                <i className="fas fa-envelope auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="信笺地址（选填）"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <span className="auth-input-line" />
              </div>
            </div>
          )}

          {/* 密码 */}
          <div className="auth-form-field">
            <div className="auth-input-wrap">
              <i className="fas fa-lock auth-input-icon" />
              <input
                ref={mode === 'register' ? usernameRef : null}
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder={mode === 'login' ? '身份信物（密码）' : '设置身份信物（至少六位）'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className={`auth-password-toggle${showPassword ? ' visible' : ''}`}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
              </button>
              <span className="auth-input-line" />
            </div>
          </div>

          {/* 兴趣标签 (仅注册) */}
          {mode === 'register' && (
            <div className="auth-form-field auth-interest-field">
              <p className="auth-interest-label">
                <i className="fas fa-tag" /> 您的身份 (选填)
              </p>
              <div className="auth-interest-tags">
                {INTEREST_TAGS.map((tag) => (
                  <button
                    key={tag.key}
                    type="button"
                    className={`auth-interest-tag${interestTag === tag.key ? ' active' : ''}`}
                    onClick={() => setInterestTag(interestTag === tag.key ? '' : tag.key)}
                  >
                    <i className={`fas ${tag.icon}`} />
                    <span className="tag-label">{tag.label}</span>
                    <span className="tag-desc">{tag.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 登录模式下的辅助链接 */}
          {mode === 'login' && (
            <div className="auth-modal-actions">
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => setMode('register')}
              >
                尚无凭证？<span>领取腰牌</span>
              </button>
              <button type="button" className="auth-link-btn auth-link-btn--muted">
                寻回信物
              </button>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="auth-error">
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            className={`auth-submit-btn${submitting || loading ? ' loading' : ''}`}
            disabled={submitting || loading}
          >
            {submitting || loading ? (
              <>
                <span className="auth-btn-spinner" />
                {mode === 'login' ? '验明中...' : '铸造腰牌...'}
              </>
            ) : (
              <>
                <span className="auth-btn-text">
                  {mode === 'login' ? '验明正身' : '领取腰牌'}
                </span>
                <i className="fas fa-arrow-right auth-btn-arrow" />
              </>
            )}
          </button>

          {/* 注册模式下的登录链接 */}
          {mode === 'register' && (
            <div className="auth-modal-footer-link">
              <span>已有凭证？</span>
              <button type="button" onClick={() => setMode('login')}>
                前往验明正身
              </button>
            </div>
          )}
        </form>

        {/* 第三方登录 (仅在登录模式) */}
        {mode === 'login' && (
          <div className="auth-modal-social">
            <div className="auth-divider">
              <span className="auth-divider-line" />
              <span className="auth-divider-text">或 以其他方式入宫</span>
              <span className="auth-divider-line" />
            </div>
            <div className="auth-social-btns">
              <button className="auth-social-btn wechat" title="微信登录" disabled>
                <i className="fab fa-weixin" />
              </button>
              <button className="auth-social-btn github" title="GitHub" disabled>
                <i className="fab fa-github" />
              </button>
            </div>
            <p className="auth-social-note">敬请期待</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginModal;
