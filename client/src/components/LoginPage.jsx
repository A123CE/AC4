import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import PixelBlast from './PixelBlast';
import '../styles/global.css';

const INTEREST_TAGS = [
  { key: 'tourist', label: '游历者', desc: '走马观花，遍览宫阙', icon: 'fa-compass' },
  { key: 'student', label: '求学者', desc: '钻研古建，考据源流', icon: 'fa-book' },
  { key: 'designer', label: '营造师', desc: '匠心独运，营建之美', icon: 'fa-pen-ruler' },
];

/**
 * 登录/注册全屏页面 —— "入宫通行证"
 * 左侧: 故宫摄影背景 + 山峦装饰 + 诗词
 * 右侧: 令牌样式的表单卡片
 */
function LoginPage() {
  const { login, register, loading } = useAuth();

  const [mode, setMode] = useState('login');
  const [entered, setEntered] = useState(false);

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

  // 页面入场动画
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  // 切换登录/注册时清空表单
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
    if (entered && usernameRef.current) {
      setTimeout(() => usernameRef.current?.focus(), 600);
    }
  }, [entered, mode]);

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
    if (!result.success) setError(result.message);
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
    if (!result.success) setError(result.message);
  };

  return (
    <div className={`auth-page${entered ? ' entered' : ''}`}>
      {/* ======== 左侧: 故宫摄影区 ======== */}
      <div className="auth-hero">
        {/* 遮罩纹理 */}
        <div className="auth-hero-overlay" />

        {/* Pixel Blast — WebGL 像素波纹背景 */}
        <PixelBlast
          variant="circle"
          pixelSize={3}
          color="#FFC840"
          patternScale={4}
          patternDensity={1.5}
          enableRipples={true}
          rippleIntensityScale={1.8}
          rippleSpeed={0.5}
          rippleThickness={0.04}
          edgeFade={0.2}
          speed={0.55}
          transparent={true}
        />

        {/* 抽象山峦 — 千里江山图层叠感 */}
        <div className="auth-hero-mountains">
          <div className="auth-hero-mountain auth-hero-mountain--1" />
          <div className="auth-hero-mountain auth-hero-mountain--2" />
          <div className="auth-hero-mountain auth-hero-mountain--3" />
        </div>

        {/* 浮云装饰 */}
        <div className="auth-hero-clouds">
          <div className="auth-hero-cloud auth-hero-cloud--1" />
          <div className="auth-hero-cloud auth-hero-cloud--2" />
        </div>

        {/* 底部诗词 */}
        <div className="auth-hero-verse">
          <p className="auth-verse-main">红墙黄瓦</p>
          <p className="auth-verse-sub">岁月悠长</p>
          <div className="auth-verse-line" />
          <p className="auth-verse-footnote">
            紫禁城 · 六百年
          </p>
        </div>

        {/* 底部品牌信息 */}
        <div className="auth-hero-brand">
          <div className="auth-hero-seal">
            <span>故</span><span>宫</span>
          </div>
          <span className="auth-hero-brand-text">故宫可视化 · 中国古代建筑数字博物馆</span>
        </div>
      </div>

      {/* ======== 右侧: 表单卡片区 ======== */}
      <div className="auth-panel">
        <div className="auth-card">
          {/* 回纹四角 */}
          <div className="auth-card-corner corner-tl" />
          <div className="auth-card-corner corner-tr" />
          <div className="auth-card-corner corner-bl" />
          <div className="auth-card-corner corner-br" />

          {/* 页面入场动画 */}
          <div className={`auth-card-inner${entered ? ' entered' : ''}`}>
            {/* 印章 */}
            <div className="auth-card-seal">
              <div className="auth-card-seal-box">
                {mode === 'login' ? (
                  <><span>入</span><span>宫</span></>
                ) : (
                  <><span>腰</span><span>牌</span></>
                )}
              </div>
            </div>

            {/* 标题 */}
            <div className="auth-card-header">
              <h2 className="auth-card-title">
                {mode === 'login' ? '验明正身' : '领取腰牌'}
              </h2>
              <p className="auth-card-subtitle">
                {mode === 'login'
                  ? '出示凭证，踏入紫禁城数字之旅'
                  : '加入故宫数字社区，开启您的营造之旅'
                }
              </p>
            </div>

            {/* Tab */}
            <div className="auth-card-tabs">
              <button
                className={`auth-card-tab${mode === 'login' ? ' active' : ''}`}
                onClick={() => setMode('login')}
              >
                账号登录
                <span className={`auth-card-tab-brush${mode === 'login' ? ' active' : ''}`} />
              </button>
              <button
                className={`auth-card-tab${mode === 'register' ? ' active' : ''}`}
                onClick={() => setMode('register')}
              >
                领取腰牌
                <span className={`auth-card-tab-brush${mode === 'register' ? ' active' : ''}`} />
              </button>
            </div>

            {/* 表单 */}
            <form
              className="auth-card-form"
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
            >
              {/* 用户名 */}
              <div className="auth-field">
                <div className="auth-field-wrap">
                  <i className={`fas ${mode === 'login' ? 'fa-user' : 'fa-user-plus'} auth-field-icon`} />
                  <input
                    ref={mode === 'login' ? usernameRef : null}
                    type="text"
                    className="auth-field-input"
                    placeholder={mode === 'login' ? '名号 / 信笺' : '请赐告尊姓大名'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    aria-label={mode === 'login' ? '用户名' : '注册用户名'}
                    aria-required="true"
                  />
                  <span className="auth-field-line" />
                </div>
              </div>

              {/* 邮箱 (仅注册) */}
              {mode === 'register' && (
                <div className="auth-field">
                  <div className="auth-field-wrap">
                    <i className="fas fa-envelope auth-field-icon" />
                    <input
                      type="email"
                      className="auth-field-input"
                      placeholder="信笺地址（选填）"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                    <span className="auth-field-line" />
                  </div>
                </div>
              )}

              {/* 密码 */}
              <div className="auth-field">
                <div className="auth-field-wrap">
                  <i className="fas fa-lock auth-field-icon" />
                  <input
                    ref={mode === 'register' ? usernameRef : null}
                    type={showPassword ? 'text' : 'password'}
                    className="auth-field-input"
                    placeholder={mode === 'login' ? '身份信物（密码）' : '设置身份信物（至少六位）'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    aria-label={mode === 'login' ? '密码' : '注册密码'}
                    aria-required="true"
                  />
                  <button
                    type="button"
                    className={`auth-field-eye${showPassword ? ' on' : ''}`}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
                  </button>
                  <span className="auth-field-line" />
                </div>
              </div>

              {/* 兴趣标签 (仅注册) */}
              {mode === 'register' && (
                <div className="auth-field auth-interest-area">
                  <p className="auth-interest-heading">
                    <i className="fas fa-tag" /> 您的身份 (选填)
                  </p>
                  <div className="auth-interest-options">
                    {INTEREST_TAGS.map((tag) => (
                      <button
                        key={tag.key}
                        type="button"
                        className={`auth-interest-opt${interestTag === tag.key ? ' active' : ''}`}
                        onClick={() => setInterestTag(interestTag === tag.key ? '' : tag.key)}
                      >
                        <i className={`fas ${tag.icon}`} />
                        <span className="opt-label">{tag.label}</span>
                        <span className="opt-desc">{tag.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 辅助链接 (登录模式) */}
              {mode === 'login' && (
                <div className="auth-card-links">
                  <button type="button" className="auth-link" onClick={() => setMode('register')}>
                    尚无凭证？<span>领取腰牌</span>
                  </button>
                  <button type="button" className="auth-link auth-link--dim">
                    寻回信物
                  </button>
                </div>
              )}

              {/* 错误 */}
              {error && (
                <div className="auth-error-msg" role="alert">
                  <i className="fas fa-exclamation-circle" />
                  <span>{error}</span>
                </div>
              )}

              {/* 提交 */}
              <button
                type="submit"
                className={`auth-btn-submit${submitting || loading ? ' is-busy' : ''}`}
                disabled={submitting || loading}
              >
                {submitting || loading ? (
                  <>
                    <span className="auth-btn-spin" />
                    {mode === 'login' ? '验明中...' : '铸造腰牌...'}
                  </>
                ) : (
                  <>
                    <span className="auth-btn-label">
                      {mode === 'login' ? '验明正身' : '领取腰牌'}
                    </span>
                    <i className="fas fa-arrow-right auth-btn-arr" />
                  </>
                )}
              </button>

              {/* 注册模式下切换到登录 */}
              {mode === 'register' && (
                <div className="auth-card-footer-link">
                  <span>已有凭证？</span>
                  <button type="button" onClick={() => setMode('login')}>
                    前往验明正身
                  </button>
                </div>
              )}
            </form>

            {/* 第三方登录 */}
            {mode === 'login' && (
              <div className="auth-card-oauth">
                <div className="auth-oauth-divider">
                  <span />
                  <span className="auth-oauth-text">或 以其他方式入宫</span>
                  <span />
                </div>
                <div className="auth-oauth-btns">
                  <button className="auth-oauth-btn wechat" title="微信登录" disabled>
                    <i className="fab fa-weixin" />
                  </button>
                  <button className="auth-oauth-btn github" title="GitHub" disabled>
                    <i className="fab fa-github" />
                  </button>
                </div>
                <p className="auth-oauth-note">敬请期待</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
