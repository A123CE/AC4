import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getQuizQuestions, getQuizStats, getQuizRecords,
  getQuizAchievements, submitAnswer
} from '../api';

/**
 * 翰林院 — 独立的答题页面
 * 左右分栏布局，与营造法式百科风格一致
 */

const DIFFICULTY = [
  { value: null, label: '全部', icon: 'fa-book' },
  { value: 1, label: '初窥', icon: 'fa-seedling', color: '#3E6B89' },
  { value: 2, label: '中等', icon: 'fa-scroll', color: '#B8860B' },
  { value: 3, label: '难题', icon: 'fa-fire', color: '#C41E3A' },
];

const QUIZ_PHASES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SHOWING: 'showing',
  ANSWERING: 'answering',
  CORRECT: 'correct',
  WRONG: 'wrong',
};

const TABS = [
  { key: 'quiz', label: '翰林答题', icon: 'fa-graduation-cap' },
  { key: 'records', label: '答题记录', icon: 'fa-history' },
  { key: 'badges', label: '功名榜', icon: 'fa-medal' },
];

export default function QuizPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('quiz');
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const [difficulty, setDifficulty] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const [phase, setPhase] = useState(QUIZ_PHASES.IDLE);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [statsRes, recordsRes, badgesRes] = await Promise.all([
        getQuizStats().catch(() => ({ data: { success: false } })),
        getQuizRecords(1, 50).catch(() => ({ data: { success: false } })),
        getQuizAchievements().catch(() => ({ data: { success: false } })),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (recordsRes.data.success) setRecords(recordsRes.data.data || []);
      if (badgesRes.data.success) setBadges(badgesRes.data.data || []);
    } catch (err) {
      console.error('加载翰林院数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = useCallback(async (diffVal) => {
    setErrorMsg(null);
    setDifficulty(diffVal);
    setQuizLoading(true);
    setPhase(QUIZ_PHASES.LOADING);
    setQuestions([]);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setSelectedAnswer(null);
    setResult(null);
    setActiveTab('quiz');

    try {
      const params = { count: 10 };
      if (diffVal) params.difficulty = diffVal;
      const res = await getQuizQuestions(params);
      if (res.data.success && res.data.data?.length > 0) {
        setQuestions(res.data.data);
        setCurrentIndex(0);
        setPhase(QUIZ_PHASES.SHOWING);
      } else {
        setPhase(QUIZ_PHASES.IDLE);
      }
    } catch (err) {
      console.error('加载题目失败:', err);
      setPhase(QUIZ_PHASES.IDLE);
      setErrorMsg(err.response?.data?.error || '网络错误，请稍后重试');
    } finally {
      setQuizLoading(false);
    }
  }, []);

  const handleSelectAnswer = (answer) => {
    if (phase !== QUIZ_PHASES.SHOWING) return;
    setSelectedAnswer(answer);
    setPhase(QUIZ_PHASES.ANSWERING);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;
    setQuizLoading(true);
    try {
      const res = await submitAnswer(currentQuestion.id, selectedAnswer);
      if (res.data.success) {
        setResult(res.data.data);
        if (res.data.data.is_correct) {
          setPhase(QUIZ_PHASES.CORRECT);
          setTimeout(() => {
            const idx = currentIndexRef.current;
            if (idx < questions.length - 1) {
              setCurrentIndex(idx + 1);
              currentIndexRef.current = idx + 1;
              setSelectedAnswer(null);
              setResult(null);
              setPhase(QUIZ_PHASES.SHOWING);
            } else {
              setQuestions([]);
              setPhase(QUIZ_PHASES.IDLE);
            }
          }, 1500);
        } else {
          setPhase(QUIZ_PHASES.WRONG);
        }
        loadPageData();
      }
    } catch {
      setResult({ is_correct: false, explanation: '提交失败，请重试' });
      setPhase(QUIZ_PHASES.WRONG);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setResult(null);
      setPhase(QUIZ_PHASES.SHOWING);
    } else {
      setQuestions([]);
      setPhase(QUIZ_PHASES.IDLE);
      loadPageData();
    }
  };

  const handleRetry = () => {
    setQuestions([]);
    setPhase(QUIZ_PHASES.IDLE);
  };

  const difficultyLabels = { 1: '初窥', 2: '中等', 3: '难题' };
  const difficultyColors = { 1: '#3E6B89', 2: '#B8860B', 3: '#C41E3A' };

  if (loading) {
    return (
      <div className="quiz-page">
        <div className="profile-topbar">
          <button className="profile-back-btn" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left" /> 返回宫城
          </button>
          <h1 className="profile-title"><i className="fas fa-graduation-cap" /> 翰林院</h1>
        </div>
        <div className="profile-loading">
          <div className="loading-spinner" />
          <p>整理卷宗中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      {/* 顶部栏 */}
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" /> 返回宫城
        </button>
        <h1 className="profile-title">
          <i className="fas fa-graduation-cap" /> 翰林院
        </h1>
        <p className="profile-title-sub">
          共答 {stats?.total_answers || 0} 题 · 正确率 {stats?.accuracy || 0}%
        </p>
      </div>

      <div className="quiz-layout">
        {/* 左侧栏：题目列表 / 记录 / 徽章 */}
        <aside className="quiz-sidebar">
          {/* Tab 导航 */}
          <div className="profile-tabs quiz-sidebar-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={`fas ${tab.icon}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== 答题区左侧 ===== */}
          {activeTab === 'quiz' && (
            <div className="quiz-sidebar-body">
              {(phase === QUIZ_PHASES.IDLE || phase === QUIZ_PHASES.LOADING) && (
                <div className="quiz-start-section-v2">
                  <h3>选择难度</h3>
                  {errorMsg && (
                    <div className="quiz-error-msg">
                      <i className="fas fa-exclamation-circle" /> {errorMsg}
                    </div>
                  )}
                  <div className="quiz-difficulty-options-v2">
                    {DIFFICULTY.map(d => (
                      <button
                        key={d.label}
                        className={`quiz-difficulty-btn-v2${difficulty === d.value ? ' active' : ''}`}
                        onClick={() => startQuiz(d.value)}
                        disabled={quizLoading}
                        style={d.color ? { '--diff-color': d.color } : {}}
                      >
                        <i className={`fas ${d.icon}`} />
                        <span>{d.label}</span>
                        {d.value && (
                          <span className="quiz-diff-tag" style={{ background: d.color }}>
                            Lv.{d.value}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {quizLoading && (
                    <div className="quiz-loading-inline">
                      <div className="loading-spinner" />
                      <p>出题中...</p>
                    </div>
                  )}
                </div>
              )}

              {phase !== QUIZ_PHASES.IDLE && phase !== QUIZ_PHASES.LOADING && questions.length > 0 && (
                <div className="quiz-progress-sidebar">
                  {/* 进度 */}
                  <div className="quiz-progress-area-v2">
                    <div className="quiz-progress-header">
                      <span>答题进度</span>
                      <span className="quiz-progress-count">
                        {currentIndex + 1} / {questions.length}
                      </span>
                    </div>
                    <div className="quiz-progress-track-v2">
                      <div
                        className="quiz-progress-fill-v2"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 当前题目信息 */}
                  <div className="quiz-current-info">
                    <span
                      className="quiz-sidebar-diff"
                      style={{ background: difficultyColors[currentQuestion.difficulty] || '#666' }}
                    >
                      {difficultyLabels[currentQuestion.difficulty] || '普通'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== 记录区 ===== */}
          {activeTab === 'records' && (
            <div className="quiz-sidebar-body">
              <div className="quiz-stats-mini">
                <div className="quiz-stats-mini-item">
                  <span className="quiz-stats-mini-val">{stats?.correct_answers || 0}/{stats?.total_answers || 0}</span>
                  <span className="quiz-stats-mini-label">答对/总数</span>
                </div>
                <div className="quiz-stats-mini-item">
                  <span className="quiz-stats-mini-val">{stats?.accuracy || 0}%</span>
                  <span className="quiz-stats-mini-label">正确率</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== 功名榜 ===== */}
          {activeTab === 'badges' && (
            <div className="quiz-sidebar-body">
              <div className="quiz-badges-sidebar-stats">
                已获得 {badges.filter(b => b.is_earned).length}/{badges.length} 枚徽章
              </div>
            </div>
          )}
        </aside>

        {/* 右侧：主内容区 */}
        <main className="quiz-main">
          {/* ===== 答题区 ===== */}
          {activeTab === 'quiz' && (
            <div className="quiz-main-body">
              {(phase === QUIZ_PHASES.IDLE || phase === QUIZ_PHASES.LOADING) && (
                <div className="quiz-welcome">
                  <div className="quiz-welcome-icon">
                    <i className="fas fa-scroll" />
                  </div>
                  <h2>翰林院会试</h2>
                  <p>左侧选择难度开始答题，每答对一题 +20 赏银</p>
                  <div className="quiz-welcome-stats">
                    <div className="quiz-welcome-stat">
                      <span className="quiz-welcome-stat-val">{stats?.correct_answers || 0}</span>
                      <span className="quiz-welcome-stat-lbl">答对</span>
                    </div>
                    <div className="quiz-welcome-stat">
                      <span className="quiz-welcome-stat-val accent">{stats?.accuracy || 0}%</span>
                      <span className="quiz-welcome-stat-lbl">正确率</span>
                    </div>
                    <div className="quiz-welcome-stat">
                      <span className="quiz-welcome-stat-val">{stats?.total_answers || 0}</span>
                      <span className="quiz-welcome-stat-lbl">总答题</span>
                    </div>
                    <div className="quiz-welcome-stat">
                      <span className="quiz-welcome-stat-val">{stats?.streak || 0}天</span>
                      <span className="quiz-welcome-stat-lbl">天数</span>
                    </div>
                  </div>
                </div>
              )}

              {phase !== QUIZ_PHASES.IDLE && phase !== QUIZ_PHASES.LOADING && currentQuestion && (
                <div className="quiz-question-area">
                  {/* 题目卡片 */}
                  <div className="quiz-question-card-v2">
                    <div className="quiz-q-header">
                      <span className="quiz-q-num">第 {currentIndex + 1} 题</span>
                      <span
                        className="quiz-q-diff"
                        style={{ background: difficultyColors[currentQuestion.difficulty] || '#666' }}
                      >
                        {difficultyLabels[currentQuestion.difficulty] || '普通'}
                      </span>
                    </div>

                    <div className="quiz-q-text">
                      <i className="fas fa-quote-left" />
                      <span>{currentQuestion.question}</span>
                      <i className="fas fa-quote-right" />
                    </div>

                    {/* 选项 */}
                    <div className="quiz-options-v2">
                      {currentQuestion.options.map((opt) => {
                        const letter = opt.charAt(0);
                        const text = opt.substring(2).trim();
                        let optClass = '';
                        if (phase === QUIZ_PHASES.ANSWERING && selectedAnswer === letter)
                          optClass = 'selected';
                        if (phase === QUIZ_PHASES.CORRECT || phase === QUIZ_PHASES.WRONG) {
                          if (letter === result?.correct_answer) optClass = 'correct';
                          else if (letter === selectedAnswer && !result?.is_correct) optClass = 'wrong';
                        }

                        return (
                          <button
                            key={letter}
                            className={`quiz-option-v2 ${optClass}`}
                            onClick={() => handleSelectAnswer(letter)}
                            disabled={phase !== QUIZ_PHASES.SHOWING}
                          >
                            <span className="quiz-option-v2-letter">{letter}</span>
                            <span className="quiz-option-v2-text">{text}</span>
                            {optClass === 'correct' && <i className="fas fa-check-circle" />}
                            {optClass === 'wrong' && <i className="fas fa-times-circle" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* 提示 */}
                    {phase === QUIZ_PHASES.SHOWING && (
                      <p className="quiz-hint-v2">请选择答案</p>
                    )}

                    {/* 提交 */}
                    {phase === QUIZ_PHASES.ANSWERING && (
                      <div className="quiz-actions-v2">
                        <button
                          className="quiz-submit-btn-v2"
                          onClick={handleSubmit}
                          disabled={quizLoading}
                        >
                          <i className="fas fa-check" /> 确认答案
                        </button>
                      </div>
                    )}

                    {/* 正确 */}
                    {phase === QUIZ_PHASES.CORRECT && (
                      <div className="quiz-feedback correct">
                        <div className="quiz-feedback-icon">
                          <i className="fas fa-check-circle" />
                        </div>
                        <div className="quiz-feedback-title">回答正确！</div>
                        <div className="quiz-feedback-points">
                          <i className="fas fa-coins" /> +{result?.points_earned || 20} 赏银
                        </div>
                        {result?.explanation && (
                          <div className="quiz-feedback-explain">
                            <i className="fas fa-lightbulb" /> {result.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 错误 */}
                    {phase === QUIZ_PHASES.WRONG && (
                      <div className="quiz-feedback wrong">
                        <div className="quiz-feedback-icon">
                          <i className="fas fa-times-circle" />
                        </div>
                        <div className="quiz-feedback-title">答错了</div>
                        <div className="quiz-feedback-correct">
                          正确答案：<strong>{result?.correct_answer}</strong>
                        </div>
                        {result?.explanation && (
                          <div className="quiz-feedback-explain">
                            <i className="fas fa-lightbulb" /> {result.explanation}
                          </div>
                        )}
                        <div className="quiz-feedback-actions">
                          <button className="quiz-submit-btn-v2" onClick={handleRetry}>
                            <i className="fas fa-redo" /> 再来一轮
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== 答题记录 ===== */}
          {activeTab === 'records' && (
            <div className="quiz-main-body">
              <div className="quiz-records-header">
                <div className="quiz-stats-inline">
                  <div className="quiz-stat-inline-item">
                    <span className="quiz-stat-inline-val">{stats?.total_answers || 0}</span>
                    <span>答题总数</span>
                  </div>
                  <div className="quiz-stat-inline-item">
                    <span className="quiz-stat-inline-val">{stats?.correct_answers || 0}</span>
                    <span>答对题数</span>
                  </div>
                  <div className="quiz-stat-inline-item accent">
                    <span className="quiz-stat-inline-val">{stats?.accuracy || 0}%</span>
                    <span>正确率</span>
                  </div>
                  <div className="quiz-stat-inline-item">
                    <span className="quiz-stat-inline-val">{stats?.streak || 0}天</span>
                    <span>天数</span>
                  </div>
                </div>
              </div>

              {records.length === 0 ? (
                <div className="quiz-empty-main">
                  <i className="fas fa-history" />
                  <p>暂无答题记录</p>
                </div>
              ) : (
                <div className="quiz-records-list-v2">
                  {records.map((rec, i) => (
                    <div
                      key={rec.id || i}
                      className={`quiz-record-card ${rec.is_correct ? 'correct' : 'wrong'}`}
                    >
                      <div className="quiz-record-card-icon">
                        <i className={`fas fa-${rec.is_correct ? 'check' : 'times'}-circle`} />
                      </div>
                      <div className="quiz-record-card-body">
                        <div className="quiz-record-card-q">{rec.question}</div>
                        <div className="quiz-record-card-meta">
                          答案: <strong>{rec.user_answer}</strong>
                          {rec.is_correct ? ' · +20赏银' : ''}
                          <span className="quiz-record-card-time">
                            {new Date(rec.answered_at).toLocaleDateString('zh-CN', {
                              month: 'short', day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== 功名榜 ===== */}
          {activeTab === 'badges' && (
            <div className="quiz-main-body">
              <div className="quiz-badges-header">
                <div className="quiz-badges-overview-v2">
                  <div className="quiz-badges-overview-icon-v2">
                    <i className="fas fa-trophy" />
                  </div>
                  <div>
                    <div className="quiz-badges-overview-title-v2">
                      已获得 {badges.filter(b => b.is_earned).length} / {badges.length} 枚
                    </div>
                    <div className="quiz-badges-overview-sub-v2">
                      答对题目解锁功名
                    </div>
                  </div>
                </div>
              </div>

              {badges.length === 0 ? (
                <div className="quiz-empty-main">
                  <i className="fas fa-medal" />
                  <p>暂无徽章数据</p>
                </div>
              ) : (
                <div className="badges-grid-v2">
                  {badges.map((badge, i) => {
                    const earned = badge.is_earned;
                    const progress = badge.progress?.percentage || 0;
                    return (
                      <div key={badge.id || i} className={`badge-card-v2 ${earned ? 'earned' : ''}`}>
                        <div className="badge-card-icon-v2">
                          <i className={`fas ${badge.icon || 'fa-award'}`} />
                        </div>
                        <div className="badge-card-info-v2">
                          <div className="badge-card-name-v2">{badge.name}</div>
                          <div className="badge-card-desc-v2">{badge.description}</div>
                          {earned ? (
                            <span className="badge-earned-tag"><i className="fas fa-check-circle" /> 已获得</span>
                          ) : badge.progress ? (
                            <div className="badge-progress-v2">
                              <div className="badge-progress-track-v2">
                                <div
                                  className="badge-progress-fill-v2"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span>{badge.progress.current}/{badge.progress.target}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
