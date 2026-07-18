import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, getHistory, getCollections, getQuizStats, getQuizRecords, getSkins, unlockSkin, activateSkin } from '../api';
import SigninButton from '../components/SigninButton';
import AchievementBadge from '../components/AchievementBadge';

/**
 * 个人中心页面 — "养心殿"
 * 包含：御览足迹、珍宝阁、徽章成就、虚拟集章
 */
function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('stamps'); // stamps | history | collections | badges | quiz | skins
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [collections, setCollections] = useState([]);
  const [quizStats, setQuizStats] = useState(null);
  const [quizRecords, setQuizRecords] = useState([]);
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [profileRes, historyRes, collectionsRes, quizStatsRes, quizRecordsRes, skinsRes] = await Promise.all([
        getProfile(),
        getHistory(),
        getCollections(),
        getQuizStats().catch(() => ({ data: { data: null } })),
        getQuizRecords(1, 10).catch(() => ({ data: { data: [] } })),
        getSkins().catch(() => ({ data: { data: { skins: [], current_points: 0 } } })),
      ]);
      if (profileRes.data.success) setProfile(profileRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (collectionsRes.data.success) setCollections(collectionsRes.data.data);
      if (quizStatsRes.data.success) setQuizStats(quizStatsRes.data.data);
      if (quizRecordsRes.data.success) setQuizRecords(quizRecordsRes.data.data || []);
      if (skinsRes.data.success) setSkins(skinsRes.data.data.skins || []);
    } catch (err) {
      console.error('加载个人数据失败:', err);
      await refreshAuth();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUnlockSkin = async (skinType) => {
    try {
      const res = await unlockSkin(skinType);
      if (res.data.success) {
        // 刷新皮肤列表
        const skinsRes = await getSkins();
        if (skinsRes.data.success) setSkins(skinsRes.data.data.skins || []);
        refreshAuth?.();
        alert(res.data.message);
      } else {
        alert(res.data.error || '解锁失败');
      }
    } catch (err) {
      alert(err.response?.data?.error || '解锁失败');
    }
  };

  const handleActivateSkin = async (skinType) => {
    try {
      const res = await activateSkin(skinType);
      if (res.data.success) {
        const skinsRes = await getSkins();
        if (skinsRes.data.success) setSkins(skinsRes.data.data.skins || []);
        refreshAuth?.();
      }
    } catch {
      // 静默
    }
  };

  // 计算集章进度
  const stampsEarned = history.filter(h => h.palace_id).length;
  const stampsTotal = 10; // 当前共10座宫殿
  const stampProgress = Math.round((stampsEarned / stampsTotal) * 100);

  // 印章设计 — 每座建筑对应不同的印章纹样
  const STAMP_DESIGNS = {
    wumen: { name: '午门', emoji: '🏯', color: '#c41e3a', sub: '正门' },
    taihemen: { name: '太和门', emoji: '🚪', color: '#b8860b', sub: '朝门' },
    taihedian: { name: '太和殿', emoji: '👑', color: '#c41e3a', sub: '金銮' },
    zhonghedian: { name: '中和殿', emoji: '⚖️', color: '#8b4513', sub: '方殿' },
    baohedian: { name: '保和殿', emoji: '🏛️', color: '#a0522d', sub: '殿试' },
    qianqingmen: { name: '乾清门', emoji: '🏮', color: '#b8860b', sub: '内门' },
    qianqinggong: { name: '乾清宫', emoji: '🐉', color: '#c41e3a', sub: '正寝' },
    jiaotaidian: { name: '交泰殿', emoji: '💎', color: '#9b1b30', sub: '交泰' },
    kunninggong: { name: '坤宁宫', emoji: '🦚', color: '#800020', sub: '中宫' },
    shenwumen: { name: '神武门', emoji: '⛩️', color: '#4a3728', sub: '北门' },
  };

  // 已浏览的宫殿ID集合
  const visitedPalaceIds = new Set(history.map(h => h.palace_id).filter(Boolean));

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <p>正在整理卷宗...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* 顶部返回栏 */}
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" /> 返回宫城
        </button>
        <h1 className="profile-title">
          <i className="fas fa-palace" /> 养心殿
        </h1>
      </div>

      {/* 用户信息卡 */}
      <div className="profile-hero">
        <div className="profile-hero-avatar">
          {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="profile-hero-info">
          <h2>{user?.username || '访客'}</h2>
          <div className="profile-hero-meta">
            <span className="profile-hero-points">
              <i className="fas fa-coins" /> 功德 {profile?.points || user?.points || 0}
            </span>
            <span className="profile-hero-role">
              <i className="fas fa-user-tag" /> {
                user?.interest_tag === 'tourist' ? '游历者' :
                user?.interest_tag === 'student' ? '求学者' :
                user?.interest_tag === 'designer' ? '营造师' : '访客'
              }
            </span>
          </div>
        </div>
        <button className="profile-logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" /> 退出宫门
        </button>
        <SigninButton />
      </div>

      {/* 统计卡片 */}
      <div className="profile-stats-row">
        <div className="profile-stat-card">
          <div className="profile-stat-card-value">{stampsEarned}/{stampsTotal}</div>
          <div className="profile-stat-card-label">御览建筑</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-card-value">{collections.length}</div>
          <div className="profile-stat-card-label">珍宝收藏</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-card-value">{profile?.badges?.length || 0}</div>
          <div className="profile-stat-card-label">获得徽章</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-card-value">{profile?.stats?.view_progress || stampProgress}%</div>
          <div className="profile-stat-card-label">探索进度</div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'stamps' ? 'active' : ''}`}
          onClick={() => setActiveTab('stamps')}
        >
          <i className="fas fa-stamp" /> 虚拟集章
        </button>
        <button
          className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fas fa-scroll" /> 御览足迹
        </button>
        <button
          className={`profile-tab ${activeTab === 'collections' ? 'active' : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          <i className="fas fa-bookmark" /> 珍宝阁
        </button>
        <button
          className={`profile-tab ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          <i className="fas fa-trophy" /> 成就徽章
        </button>
        <button
          className={`profile-tab ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <i className="fas fa-graduation-cap" /> 翰林院
        </button>
        <button
          className={`profile-tab ${activeTab === 'skins' ? 'active' : ''}`}
          onClick={() => setActiveTab('skins')}
        >
          <i className="fas fa-paint-brush" /> 3D皮肤
        </button>
      </div>

      {/* Tab 内容 */}
      <div className="profile-tab-content">
        {/* ===== 虚拟集章 ===== */}
        {activeTab === 'stamps' && (
          <div className="stamps-tab">
            <div className="stamps-progress-bar">
              <div className="stamps-progress-fill" style={{ width: `${stampProgress}%` }} />
            </div>
            <p className="stamps-progress-text">
              已收集 {stampsEarned}/{stampsTotal} 枚印章 ({stampProgress}%)
            </p>
            <div className="stamps-grid">
              {Object.entries(STAMP_DESIGNS).map(([id, design]) => {
                const earned = visitedPalaceIds.has(id);
                return (
                  <div
                    key={id}
                    className={`stamp-card ${earned ? 'earned' : 'locked'}`}
                    title={earned ? design.name : '尚未造访'}
                  >
                    <div className="stamp-card-seal" style={{ borderColor: design.color }}>
                      <div className={`stamp-card-emoji ${earned ? '' : 'grayscale'}`}>
                        {earned ? design.emoji : '❓'}
                      </div>
                      {earned && <div className="stamp-card-ribbon">御览</div>}
                    </div>
                    <div className="stamp-card-name">{design.name}</div>
                    <div className="stamp-card-sub">{earned ? design.sub : '???'}</div>
                    {earned && <div className="stamp-card-check">✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== 御览足迹 ===== */}
        {activeTab === 'history' && (
          <div className="history-tab">
            {history.length === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-scroll" />
                <p>暂无游览记录</p>
                <span>去首页探索故宫建筑，足迹将自动记录于此</span>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item, i) => (
                  <div key={item.id || i} className="history-item">
                    <div className="history-item-time">
                      {new Date(item.viewed_at).toLocaleDateString('zh-CN', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    <div className="history-item-dot" />
                    <div className="history-item-info">
                      <div className="history-item-name">{item.palace_name}</div>
                      <div className="history-item-meta">
                        {item.category} · {item.dynasty}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 珍宝阁（收藏） ===== */}
        {activeTab === 'collections' && (
          <div className="collections-tab">
            {collections.length === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-bookmark" />
                <p>暂无收藏</p>
                <span>浏览建筑时点击收藏按钮，建造你的私人珍宝阁</span>
              </div>
            ) : (
              <div className="collections-grid">
                {collections.map((item, i) => (
                  <div key={item.id || i} className="collection-card">
                    <div className="collection-card-header">
                      <i className="fas fa-landmark" />
                      <span>{item.category || '默认'}</span>
                    </div>
                    <div className="collection-card-name">{item.palace_name}</div>
                    <div className="collection-card-meta">{item.dynasty}</div>
                    {item.note && <p className="collection-card-note">{item.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 成就徽章 ===== */}
        {activeTab === 'badges' && (
          <div className="badges-tab">
            {(!profile?.badges || profile.badges.length === 0) ? (
              <div className="profile-empty">
                <i className="fas fa-trophy" />
                <p>暂无徽章</p>
                <span>持续探索故宫，解锁更多成就</span>
              </div>
            ) : (
              <div className="badges-grid">
                {profile.badges.map((badge, i) => (
                  <AchievementBadge
                    key={badge.id || i}
                    badge={{ ...badge, is_earned: true, condition_value: 10 }}
                    size="medium"
                    showProgress={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 翰林院答题 ===== */}
        {activeTab === 'quiz' && (
          <div className="quiz-records-tab">
            {!quizStats ? (
              <div className="profile-empty">
                <i className="fas fa-graduation-cap" />
                <p>暂无答题记录</p>
                <span>前往翰林院挑战趣味答题</span>
                <button
                  className="profile-back-btn"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate('/quiz')}
                >
                  <i className="fas fa-graduation-cap" /> 前往翰林院
                </button>
              </div>
            ) : (
              <>
                {/* 答题统计 */}
                <div className="quiz-stats-row">
                  <div className="quiz-stat-card">
                    <div className="quiz-stat-value">{quizStats.total_answers || 0}</div>
                    <div className="quiz-stat-label">答题总数</div>
                  </div>
                  <div className="quiz-stat-card">
                    <div className="quiz-stat-value">{quizStats.correct_answers || 0}</div>
                    <div className="quiz-stat-label">答对题数</div>
                  </div>
                  <div className="quiz-stat-card">
                    <div className="quiz-stat-value">{quizStats.accuracy || 0}%</div>
                    <div className="quiz-stat-label">正确率</div>
                  </div>
                  <div className="quiz-stat-card">
                    <div className="quiz-stat-value">{(quizStats.streak || 0)}天</div>
                    <div className="quiz-stat-label">答题天数</div>
                  </div>
                </div>

                {/* 前往翰林院按钮 */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <button
                    className="profile-back-btn"
                    onClick={() => navigate('/quiz')}
                  >
                    <i className="fas fa-graduation-cap" /> 前往翰林院答题
                  </button>
                </div>

                {/* 答题记录 */}
                {quizRecords.length > 0 && (
                  <div className="quiz-records-list">
                    <h4><i className="fas fa-history" /> 近期答题</h4>
                    {quizRecords.map((rec, i) => (
                      <div key={rec.id || i} className={`quiz-record-item ${rec.is_correct ? 'correct' : 'wrong'}`}>
                        <div className="quiz-record-icon">
                          <i className={`fas fa-${rec.is_correct ? 'check' : 'times'}-circle`} />
                        </div>
                        <div className="quiz-record-body">
                          <div className="quiz-record-question">{rec.question}</div>
                          <div className="quiz-record-meta">
                            你的答案: <strong>{rec.user_answer}</strong>
                            {rec.is_correct ? ' · +20赏银' : ''}
                          </div>
                        </div>
                        <div className="quiz-record-time">
                          {new Date(rec.answered_at).toLocaleDateString('zh-CN', {
                            month: 'short', day: 'numeric',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== 3D皮肤 ===== */}
        {activeTab === 'skins' && (
          <div className="skins-tab">
            {skins.length === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-paint-brush" />
                <p>暂无皮肤数据</p>
                <span>答题赚取赏银，解锁3D查看器的特殊皮肤</span>
              </div>
            ) : (
              <div className="skins-grid">
                {skins.map(skin => (
                  <div
                    key={skin.skin_type}
                    className={`skin-card ${skin.is_unlocked ? 'unlocked' : 'locked'} ${skin.is_active ? 'active' : ''}`}
                  >
                    <div className="skin-card-preview">
                      <i className={`fas ${skin.icon || 'fa-cube'}`} />
                      {skin.is_active && <span className="skin-card-active-tag">使用中</span>}
                    </div>
                    <div className="skin-card-info">
                      <div className="skin-card-name">{skin.skin_name}</div>
                      <div className="skin-card-desc">{skin.description}</div>
                    </div>
                    <div className="skin-card-actions">
                      {skin.is_default ? (
                        <button
                          className={`skin-card-btn ${skin.is_active ? 'active' : ''}`}
                          onClick={() => handleActivateSkin(skin.skin_type)}
                        >
                          {skin.is_active ? '当前使用' : '启用'}
                        </button>
                      ) : skin.is_unlocked ? (
                        <button
                          className={`skin-card-btn ${skin.is_active ? 'active' : 'unlock'}`}
                          onClick={() => handleActivateSkin(skin.skin_type)}
                        >
                          {skin.is_active ? '当前使用' : '启用'}
                        </button>
                      ) : (
                        <button
                          className="skin-card-btn unlock"
                          onClick={() => handleUnlockSkin(skin.skin_type)}
                        >
                          <i className="fas fa-coins" /> {skin.unlock_cost} 赏银解锁
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
