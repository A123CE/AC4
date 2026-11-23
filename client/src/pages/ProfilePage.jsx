import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, getHistory, getCollections, getQuizStats, getQuizRecords, getSkins, unlockSkin, activateSkin, updateCollectionNote, getAchievements, getPreferences, updatePreferences, getLearningRecords } from '../api';
import { getHotspots } from '../data/buildingHotspots';
import { useCollections } from '../context/CollectionsContext';
import { useSkin } from '../context/SkinContext';
import { useUiPrefs } from '../context/UiPrefsContext';
import { useClassroomView } from '../context/ClassroomViewContext';
import SigninButton from '../components/SigninButton';
import AchievementBadge from '../components/AchievementBadge';

/**
 * 个人中心页面 — "养心殿"
 * 包含：御览足迹、珍宝阁、徽章成就、虚拟集章
 */
const COLLECTION_FILTERS = ['全部', '默认', '想去', '已研究', '教学素材'];

function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshAuth } = useAuth();
  const { refresh: refreshCollections } = useCollections();
  const { refresh: refreshSkin } = useSkin();
  const { setAnalyticsEnabled, uiPrefs, updatePrefs } = useUiPrefs();
  const { readOnly: classroomReadOnly } = useClassroomView();
  const [prefError, setPrefError] = useState(null);
  const [activeTab, setActiveTab] = useState('stamps'); // stamps | history | collections | badges | quiz | skins
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [collections, setCollections] = useState([]);
  const [quizStats, setQuizStats] = useState(null);
  const [quizRecords, setQuizRecords] = useState([]);
  const [skins, setSkins] = useState([]);
  const [achievements, setAchievements] = useState(null);
  const [stampTotalNotice, setStampTotalNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collectionFilter, setCollectionFilter] = useState('全部');
  const [editingCollection, setEditingCollection] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [learning, setLearning] = useState([]);
  const [analyticsEnabled, setAnalyticsEnabledState] = useState(true);
  const [savingAnalytics, setSavingAnalytics] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [profileRes, historyRes, collectionsRes, quizStatsRes, quizRecordsRes, skinsRes, achievementsRes, preferencesRes, learningRes] = await Promise.all([
        getProfile(),
        getHistory(),
        getCollections(),
        getQuizStats().catch(() => ({ data: { data: null } })),
        getQuizRecords(1, 10).catch(() => ({ data: { data: [] } })),
        getSkins().catch(() => ({ data: { data: { skins: [], current_points: 0 } } })),
        getAchievements().catch(() => ({ data: { success: false } })),
        getPreferences().catch(() => ({ data: { success: false } })),
        getLearningRecords().catch(() => ({ data: { success: false } })),
      ]);
      if (profileRes.data.success) setProfile(profileRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (collectionsRes.data.success) setCollections(collectionsRes.data.data);
      if (quizStatsRes.data.success) setQuizStats(quizStatsRes.data.data);
      if (quizRecordsRes.data.success) setQuizRecords(quizRecordsRes.data.data || []);
      if (skinsRes.data.success) setSkins(skinsRes.data.data.skins || []);
      if (achievementsRes.data.success) setAchievements(achievementsRes.data.data);
      if (preferencesRes.data.success) {
        setPersonalizationEnabled(
          preferencesRes.data.data.personalization_enabled !== false
        );
        setAnalyticsEnabledState(
          preferencesRes.data.data.analytics_enabled !== false
        );
      }
      if (learningRes.data.success) {
        setLearning(learningRes.data.data.items || []);
      }
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
        refreshSkin?.();
      }
    } catch {
      // 静默
    }
  };

  const togglePersonalization = async () => {
    const next = !personalizationEnabled;
    setPersonalizationEnabled(next);
    setSavingPref(true);

    try {
      const res = await updatePreferences({
        personalization_enabled: next,
      });
      if (!res.data?.success) setPersonalizationEnabled(!next);
    } catch {
      setPersonalizationEnabled(!next);
    } finally {
      setSavingPref(false);
    }
  };

  const toggleAnalytics = async () => {
    const next = !analyticsEnabled;
    setAnalyticsEnabledState(next);
    setAnalyticsEnabled(next);
    setSavingAnalytics(true);

    try {
      const res = await updatePreferences({ analytics_enabled: next });
      if (!res.data?.success) {
        setAnalyticsEnabledState(!next);
        setAnalyticsEnabled(!next);
      }
    } catch {
      setAnalyticsEnabledState(!next);
      setAnalyticsEnabled(!next);
    } finally {
      setSavingAnalytics(false);
    }
  };

  const changePref = async (patch) => {
    setPrefError(null);
    setSavingPref(true);
    try {
      await updatePrefs(patch);
    } catch {
      setPrefError('设置未保存，请重试');
    } finally {
      setSavingPref(false);
    }
  };

  const startEditNote = (item) => {
    setEditingCollection(item.palace_id);
    setNoteDraft(item.note || '');
  };

  const cancelEditNote = () => {
    setEditingCollection(null);
    setNoteDraft('');
  };

  const saveNote = async (palaceId, noteOverride) => {
    const note = noteOverride !== undefined ? noteOverride : noteDraft;
    setNoteSaving(true);
    try {
      const res = await updateCollectionNote(palaceId, note);
      if (res.data?.success) {
        setCollections((prev) =>
          prev.map((item) =>
            item.palace_id === palaceId
              ? { ...item, note: res.data.data.note, updated_at: res.data.data.updated_at }
              : item
          )
        );
        setEditingCollection(null);
        setNoteDraft('');
        refreshCollections?.();
      }
    } catch (err) {
      console.error('保存收藏笔记失败:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  const filteredCollections = collections.filter(
    (item) =>
      collectionFilter === '全部' ||
      (item.collection_category || '默认') === collectionFilter
  );

  // 集章与徽章 — 以 /api/achievements 为准
  const stampSummary = achievements?.stamps;
  const stampsEarned = stampSummary?.earned ?? history.filter(h => h.palace_id).length;
  const stampsTotal = stampSummary?.total ?? 20;
  const stampProgress = stampsTotal > 0 ? Math.round((stampsEarned / stampsTotal) * 100) : 0;
  const stampItems = stampSummary?.items || [];
  const badgeList = achievements?.badges || [];
  const nextTargets = achievements?.next_targets || [];
  const displayBadges = badgeList.length > 0
    ? badgeList
    : (profile?.badges || []).map((badge) => ({
        ...badge,
        is_earned: true,
        condition_value: 10,
      }));

  const STAMP_CATEGORY_DESIGN = {
    宫殿: { emoji: '🏯', color: '#c41e3a' },
    关隘: { emoji: '🚪', color: '#b8860b' },
    楼阁: { emoji: '🏛️', color: '#3E6B89' },
    佛塔: { emoji: '🗼', color: '#8b4513' },
    寺庙: { emoji: '⛩️', color: '#8a2418' },
    石窟: { emoji: '🗿', color: '#6b5b4a' },
    军事工程: { emoji: '🧱', color: '#4a3728' },
    坛庙: { emoji: '🛕', color: '#b8860b' },
    民居: { emoji: '🏠', color: '#8B5E3C' },
  };
  const getStampDesign = (item) =>
    STAMP_CATEGORY_DESIGN[item?.category] || { emoji: '📍', color: '#8A7A68' };

  useEffect(() => {
    if (!achievements?.stamps) return;
    try {
      const previous = Number(localStorage.getItem('ac4_stamps_total') || 0);
      if (previous && previous !== achievements.stamps.total) {
        setStampTotalNotice(achievements.stamps.total);
      }
      localStorage.setItem('ac4_stamps_total', String(achievements.stamps.total));
    } catch { /* 忽略存储异常 */ }
  }, [achievements?.stamps?.total]);

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
          <div className="profile-stat-card-value">
            {displayBadges.filter((badge) => badge.is_earned).length || profile?.badges?.length || 0}
          </div>
          <div className="profile-stat-card-label">获得徽章</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-card-value">{profile?.stats?.view_progress || stampProgress}%</div>
          <div className="profile-stat-card-label">探索进度</div>
        </div>
      </div>

      {classroomReadOnly && (
        <div className="profile-pref-row" role="status">
          <div className="profile-pref-copy">
            <strong>课堂视图</strong>
            <span>课堂视图不支持修改设置</span>
          </div>
        </div>
      )}

      {prefError && (
        <div className="profile-pref-row" role="alert" style={{ color: '#8A2418' }}>
          <div className="profile-pref-copy">
            <strong>{prefError}</strong>
          </div>
        </div>
      )}

      <div className="profile-pref-row">
        <div className="profile-pref-copy">
          <strong>课堂模式</strong>
          <span>放大字号并隐藏推荐、分享与社交入口</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={uiPrefs.classroomMode}
          className={`profile-pref-toggle${uiPrefs.classroomMode ? ' on' : ''}`}
          onClick={() => changePref({ classroomMode: !uiPrefs.classroomMode })}
          disabled={savingPref || classroomReadOnly}
        >
          {uiPrefs.classroomMode ? '已开启' : '已关闭'}
        </button>
      </div>

      <div className="profile-pref-row">
        <div className="profile-pref-copy">
          <strong>课堂字号</strong>
          <span>标准 / 大 / 特大，仅课堂模式生效</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: 'standard', label: '标准' },
            { value: 'large', label: '大' },
            { value: 'xlarge', label: '特大' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`profile-pref-toggle${uiPrefs.classroomFontScale === item.value ? ' on' : ''}`}
              aria-pressed={uiPrefs.classroomFontScale === item.value}
              onClick={() => changePref({ classroomFontScale: item.value })}
              disabled={savingPref || classroomReadOnly}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="profile-pref-row">
        <div className="profile-pref-copy">
          <strong>未成年人模式</strong>
          <span>开启后隐藏精确名次，并自动退出公开榜</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={uiPrefs.minorMode === 'minor'}
          className={`profile-pref-toggle${uiPrefs.minorMode === 'minor' ? ' on' : ''}`}
          onClick={() => changePref({ minorMode: uiPrefs.minorMode === 'minor' ? 'unset' : 'minor' })}
          disabled={savingPref || classroomReadOnly}
        >
          {uiPrefs.minorMode === 'minor' ? '已开启' : '已关闭'}
        </button>
      </div>

      <div className="profile-pref-row">
        <div className="profile-pref-copy">
          <strong>退出公开榜</strong>
          <span>不展示精确名次，仍可继续答题</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={uiPrefs.leaderboardOptOut}
          className={`profile-pref-toggle${uiPrefs.leaderboardOptOut ? ' on' : ''}`}
          onClick={() => changePref({ leaderboardOptOut: !uiPrefs.leaderboardOptOut })}
          disabled={savingPref || classroomReadOnly}
        >
          {uiPrefs.leaderboardOptOut ? '已退出' : '参与中'}
        </button>
      </div>

      <div className="profile-pref-row">
        <div className="profile-pref-copy">
          <strong>个性化推荐</strong>
          <span>关闭后首页使用通用热门推荐</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={personalizationEnabled}
          className={`profile-pref-toggle${personalizationEnabled ? ' on' : ''}`}
          onClick={togglePersonalization}
          disabled={savingPref}
        >
          {personalizationEnabled ? '已开启' : '已关闭'}
        </button>
      </div>

      <div className="profile-pref-row">
        <div className="profile-pref-copy">
          <strong>允许匿名统计</strong>
          <span>仅采集匿名事件，不记录账号、IP 或搜索原文</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={analyticsEnabled}
          className={`profile-pref-toggle${analyticsEnabled ? ' on' : ''}`}
          onClick={toggleAnalytics}
          disabled={savingAnalytics}
        >
          {analyticsEnabled ? '已开启' : '已关闭'}
        </button>
      </div>

      {nextTargets.length > 0 && (
        <div className="profile-next-targets">
          <span className="profile-next-label">下一步</span>
          {nextTargets.map((target) => (
            <span className="profile-next-target" key={target.id}>
              <i className={`fas ${target.icon || 'fa-award'}`} />
              {target.name}
              <em>{target.progress.current}/{target.progress.target}</em>
            </span>
          ))}
        </div>
      )}

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
          className={`profile-tab ${activeTab === 'learning' ? 'active' : ''}`}
          onClick={() => setActiveTab('learning')}
        >
          <i className="fas fa-lightbulb" /> 学习记录
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
            {stampTotalNotice && (
              <div className="stamps-total-notice">
                集章总数已更新为 {stampTotalNotice}，已获得的章保留
              </div>
            )}

            <div className="stamps-progress-bar">
              <div className="stamps-progress-fill" style={{ width: `${stampProgress}%` }} />
            </div>
            <p className="stamps-progress-text">
              已收集 {stampsEarned}/{stampsTotal} 枚印章 ({stampProgress}%)
            </p>

            {stampsTotal === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-stamp" />
                <p>暂无集章，去展厅盖章</p>
              </div>
            ) : (
              <div className="stamps-grid">
                {stampItems.map((item) => {
                  const earned = !!item.earned_at;
                  const design = getStampDesign(item);
                  return (
                    <div
                      key={item.palace_id}
                      className={`stamp-card ${earned ? 'earned' : 'locked'}`}
                      title={earned ? item.name : '尚未造访'}
                    >
                      <div className="stamp-card-seal" style={{ borderColor: design.color }}>
                        <div className={`stamp-card-emoji ${earned ? '' : 'grayscale'}`}>
                          {earned ? design.emoji : '❓'}
                        </div>
                        {earned && <div className="stamp-card-ribbon">御览</div>}
                      </div>
                      <div className="stamp-card-name">
                        {item.chinese_seal_text || item.name}
                      </div>
                      <div className="stamp-card-sub">
                        {earned ? (item.category || '已集章') : '???'}
                      </div>
                      {earned && <div className="stamp-card-check">✓</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== 御览足迹 ===== */}
        {activeTab === 'history' && (
          <div className="history-tab">
            {history.length === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-scroll" />
                <p>暂无游览记录</p>
                <span>去首页探索古建筑，足迹将自动记录于此</span>
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
            <div className="collection-filter-tabs">
              {COLLECTION_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`collection-filter${collectionFilter === filter ? ' active' : ''}`}
                  onClick={() => setCollectionFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            {filteredCollections.length === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-bookmark" />
                <p>{collections.length === 0 ? '还没有收藏，去展厅看看' : `「${collectionFilter}」下暂无收藏`}</p>
                <span>浏览建筑时点击收藏按钮，建造你的私人珍宝阁</span>
              </div>
            ) : (
              <div className="collections-grid">
                {filteredCollections.map((item, i) => (
                  <div key={item.id || i} className="collection-card">
                    {item.poster_path ? (
                      <img
                        className="collection-card-poster"
                        src={`/images/${item.poster_path}`}
                        alt={item.palace_name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="collection-card-poster collection-card-poster--placeholder">
                        <i className="fas fa-landmark" />
                      </div>
                    )}

                    <div className="collection-card-header">
                      <i className="fas fa-bookmark" />
                      <span>{item.collection_category || '默认'}</span>
                    </div>
                    <div className="collection-card-name">{item.palace_name}</div>
                    <div className="collection-card-meta">{item.dynasty}</div>

                    {editingCollection === item.palace_id ? (
                      <div className="collection-note-editor">
                        <textarea
                          className="collection-note"
                          value={noteDraft}
                          maxLength={500}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          placeholder="写下令你印象最深的一处细节…"
                        />
                        <div className="collection-note-count">{noteDraft.length}/500</div>
                        <div className="collection-note-editor-actions">
                          <button type="button" onClick={cancelEditNote}>取消</button>
                          <button
                            type="button"
                            onClick={() => saveNote(item.palace_id)}
                            disabled={noteSaving}
                          >
                            {noteSaving ? '保存中…' : '保存'}
                          </button>
                          <button
                            type="button"
                            onClick={() => saveNote(item.palace_id, '')}
                            disabled={noteSaving}
                          >
                            清空
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {item.note && <p className="collection-card-note">{item.note}</p>}
                        <button
                          type="button"
                          className="collection-card-edit"
                          onClick={() => startEditNote(item)}
                        >
                          <i className="fas fa-pen" /> {item.note ? '编辑笔记' : '写笔记'}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 成就徽章 ===== */}
        {activeTab === 'badges' && (
          <div className="badges-tab">
            {displayBadges.length === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-trophy" />
                <p>暂无徽章</p>
                <span>持续探索古建，解锁更多成就</span>
              </div>
            ) : (
              <div className="badges-grid">
                {displayBadges.map((badge, i) => (
                  <AchievementBadge
                    key={badge.id || i}
                    badge={badge}
                    size="medium"
                    showProgress
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 学习记录 ===== */}
        {activeTab === 'learning' && (
          <div className="learning-tab">
            {learning.length === 0 ? (
              <div className="profile-empty">
                <i className="fas fa-lightbulb" />
                <p>暂无学习记录</p>
                <span>在 3D 展厅点击热点并标记已读</span>
              </div>
            ) : (
              <div className="learning-list">
                {learning.map((item, index) => {
                  const label =
                    getHotspots(item.palace_id).find(
                      (hotspot) => hotspot.id === item.hotspot_id
                    )?.label || item.hotspot_id;
                  return (
                    <div
                      className="learning-item"
                      key={`${item.palace_id}-${item.hotspot_id}-${index}`}
                    >
                      <div className="learning-item-main">
                        <strong>{label}</strong>
                        <span>{item.palace_name}</span>
                      </div>
                      <em>
                        {item.read_at
                          ? new Date(item.read_at).toLocaleDateString('zh-CN')
                          : ''}
                      </em>
                    </div>
                  );
                })}
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
