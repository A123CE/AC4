import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getQuizQuestions, getQuizStats, getQuizRecords,
  getQuizAchievements, getQuizCategories, getQuizLeaderboard, submitAnswer, practiceAnswer
} from '../api';
import MicroSlats from '../components/MicroSlats';
import CircularCarousel from '../components/CircularCarousel';
import { useAuth } from '../context/AuthContext';
import guestSession from '../lib/guestSession';
import { emitAchievements } from '../lib/achievementBus';
import { track } from '../lib/analytics';

/**
 * 筑知问答 — 独立的答题页面
 * 题库按建筑类型分为四类：古建筑 / 传统民居 / 近代经典建筑 / 现代标志性建筑
 * 四类卡面以 3D 环形旋转呈现，点击卡面直接进入对应题库的答题环节。
 */

const DIFFICULTY = [
  { value: null, label: '全部', icon: 'fa-book', desc: '不限难度' },
  { value: 1, label: '初窥', icon: 'fa-seedling', color: '#3E6B89' },
  { value: 2, label: '中等', icon: 'fa-scroll', color: '#B8860B' },
  { value: 3, label: '难题', icon: 'fa-fire', color: '#C41E3A' },
];

const CATEGORY_META = {
  古建筑: { icon: 'fa-landmark', color: '#C41E3A', desc: '宫城 · 坛庙 · 园林' },
  传统民居: { icon: 'fa-house-chimney', color: '#8B5E3C', desc: '聚落 · 乡土 · 生土' },
  近代经典建筑: { icon: 'fa-building-columns', color: '#B8860B', desc: '外滩 · 校园 · 侨乡' },
  现代标志性建筑: { icon: 'fa-city', color: '#3E6B89', desc: '场馆 · 超高层 · 地标' },
};

// 卡面配图 — 放在 client/public/quiz-cats/, 文件名与分类名一致
const CATEGORY_IMAGES = {
  古建筑: '/quiz-cats/古建筑.png',
  传统民居: '/quiz-cats/传统民居.png',
  近代经典建筑: '/quiz-cats/近代经典建筑.png',
  现代标志性建筑: '/quiz-cats/现代标志性建筑.png',
};

const QUIZ_PHASES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SHOWING: 'showing',
  ANSWERING: 'answering',
  CORRECT: 'correct',
  WRONG: 'wrong',
  SUMMARY: 'summary',
};

const TABS = [
  { key: 'quiz', label: '翰林答题', icon: 'fa-graduation-cap' },
  { key: 'records', label: '答题记录', icon: 'fa-history' },
  { key: 'board', label: '筑识榜', icon: 'fa-ranking-star' },
];

const DIFFICULTY_LABELS = { 1: '初窥', 2: '中等', 3: '难题' };
const DIFFICULTY_COLORS = { 1: '#3E6B89', 2: '#B8860B', 3: '#C41E3A' };

const categoryMeta = (name) =>
  CATEGORY_META[name] || { icon: 'fa-bookmark', color: '#8A7A68', desc: '题库' };

/** 隐私模式下的名次提示；正常公开榜返回 null */
function privacyRankHint(mode) {
  if (mode === 'minor') return '名次已隐藏';
  if (mode === 'opted_out') return '未参与公开榜';
  return null;
}

/** 判断当前登录用户在公开榜中是否可见名次 */
function isPublicRank(me) {
  if (!me) return false;
  if (me.rank_no == null) return false;
  if (typeof me.in_public_board === 'boolean') return me.in_public_board;
  return me.privacy_mode === 'normal';
}

/** 题库分类标签 */
function CategoryPill({ category, size = 'md' }) {
  if (!category) return null;
  const meta = categoryMeta(category);
  return (
    <span
      className={`quiz-cat-pill quiz-cat-pill-${size}`}
      style={{ '--cat-color': meta.color }}
    >
      <i className={`fas ${meta.icon}`} />
      {category}
    </span>
  );
}

/** 题库筛选条 */
function CategoryFilter({ value, onChange, categories }) {
  const allCount = categories.reduce((sum, c) => sum + (c.question_total || 0), 0);
  return (
    <div className="quiz-cat-filter">
      <button
        className={`quiz-cat-filter-btn${value === null ? ' active' : ''}`}
        onClick={() => onChange(null)}
      >
        <i className="fas fa-layer-group" />
        全部题库
        <em>{allCount}</em>
      </button>
      {categories.map(cat => {
        const meta = categoryMeta(cat.category);
        return (
          <button
            key={cat.category}
            className={`quiz-cat-filter-btn${value === cat.category ? ' active' : ''}`}
            style={{ '--cat-color': meta.color }}
            onClick={() => onChange(cat.category)}
          >
            <i className={`fas ${meta.icon}`} />
            {cat.category}
            <em>{cat.question_total || 0}</em>
          </button>
        );
      })}
    </div>
  );
}

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const practiceMode = new URLSearchParams(location.search).get('mode') === 'practice';
  const guestMode = !isLoggedIn;

  const [activeTab, setActiveTab] = useState('quiz');
  const [guestAnswers, setGuestAnswers] = useState([]);
  const [guestSummary, setGuestSummary] = useState(null);
  const [guestQuotaLeft, setGuestQuotaLeft] = useState(null);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [records, setRecords] = useState([]);
  const [recordsCategory, setRecordsCategory] = useState(null);
  const [badges, setBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ list: [], me: null });
  const [boardCategory, setBoardCategory] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [ringIndex, setRingIndex] = useState(0);
  // 视口宽度 — 决定环形卡面的圈数与卡面尺寸
  const [viewW, setViewW] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  const quizRingRef = useRef(null);
  // 卡面旋转期间暂停背景光栅动画, 把主线程让给 3D 旋转
  const [bgPaused, setBgPaused] = useState(false);
  const bgTimerRef = useRef(0);

  useEffect(() => () => window.clearTimeout(bgTimerRef.current), []);
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
    if (practiceMode) {
      loadGuestData();
      return;
    }
    if (isLoggedIn) {
      loadPageData();
    } else {
      loadGuestData();
      const saved = guestSession.read().quiz;
      if (saved && Number.isFinite(saved.score)) {
        setGuestSummary({
          score: saved.score,
          total: saved.answers?.length || 5,
          answers: [],
        });
      }
    }
  }, [isLoggedIn, practiceMode]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const updateWidth = () => setViewW(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // silent = true 时只刷新数据, 不切换到整页 Loading 界面
  // (整页 Loading 会卸载答题区, 导致环形卡面回到第一题)
  const loadPageData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, recordsRes, badgesRes, categoriesRes, boardRes] = await Promise.all([
        getQuizStats().catch(() => ({ data: { success: false } })),
        getQuizRecords(1, 50).catch(() => ({ data: { success: false } })),
        getQuizAchievements().catch(() => ({ data: { success: false } })),
        getQuizCategories().catch(() => ({ data: { success: false } })),
        getQuizLeaderboard({ limit: 20 }).catch(() => ({ data: { success: false } })),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (recordsRes.data.success) setRecords(recordsRes.data.data || []);
      if (badgesRes.data.success) setBadges(badgesRes.data.data || []);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data || []);
      if (boardRes.data.success) {
        setLeaderboard({
          list: boardRes.data.data.list || [],
          me: boardRes.data.data.me || null,
        });
      }
    } catch (err) {
      console.error('加载翰林院数据失败:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 游客只加载题库分类，不请求个人统计 / 记录 / 排行 / 徽章
  const loadGuestData = async () => {
    setLoading(true);
    try {
      const categoriesRes = await getQuizCategories().catch(() => ({
        data: { success: false },
      }));
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.data || []);
      }
    } catch (err) {
      console.error('加载游客题库失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async (cat) => {
    setRecordsCategory(cat);
    try {
      const res = await getQuizRecords(1, 50, cat || undefined);
      if (res.data.success) setRecords(res.data.data || []);
    } catch (err) {
      console.error('加载答题记录失败:', err);
    }
  };

  const loadLeaderboard = async (cat) => {
    setBoardCategory(cat);
    setBoardLoading(true);
    try {
      const res = await getQuizLeaderboard({ limit: 20, ...(cat ? { category: cat } : {}) });
      if (res.data.success) {
        setLeaderboard({
          list: res.data.data.list || [],
          me: res.data.data.me || null,
        });
        track('leaderboard_view', { category: cat || 'all', stage: 'board' });
      }
    } catch (err) {
      console.error('加载筑识榜失败:', err);
    } finally {
      setBoardLoading(false);
    }
  };

  const startQuiz = useCallback(async (diffVal, catOverride) => {
    const targetCategory = catOverride === undefined ? category : catOverride;
    setErrorMsg(null);
    setDifficulty(diffVal);
    setCategory(targetCategory);
    setQuizLoading(true);
    setPhase(QUIZ_PHASES.LOADING);
    setQuestions([]);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setSelectedAnswer(null);
    setResult(null);
    setActiveTab('quiz');
    setGuestAnswers([]);
    setGuestSummary(null);

    // 游客每日 3 轮体验；每轮 5 题，结果只存本机（练习模式不消耗额度）
    if (guestMode && !practiceMode) {
      const gate = guestSession.tryStartQuiz();
      if (!gate.allowed) {
        setQuizLoading(false);
        setPhase(QUIZ_PHASES.IDLE);
        setErrorMsg('今日游客体验次数已用完，登录后可继续答题');
        return;
      }
      setGuestQuotaLeft(gate.remaining);
    }

    try {
      const params = { count: guestMode && !practiceMode ? 5 : 10 };
      if (diffVal) params.difficulty = diffVal;
      if (targetCategory) params.category = targetCategory;
      const res = await getQuizQuestions(params);
      if (res.data.success && res.data.data?.length > 0) {
        setQuestions(res.data.data);
        setCurrentIndex(0);
        setPhase(QUIZ_PHASES.SHOWING);
      } else {
        setPhase(QUIZ_PHASES.IDLE);
        setErrorMsg('该题库暂无符合条件的题目，试试其他分类');
      }
    } catch (err) {
      console.error('加载题目失败:', err);
      setPhase(QUIZ_PHASES.IDLE);
      setErrorMsg(err.response?.data?.error || '网络错误，请稍后重试');
    } finally {
      setQuizLoading(false);
    }
  }, [category, guestMode]);

  const finalizeGuestQuiz = useCallback((answers) => {
    const score = answers.filter((item) => item.is_correct).length;
    setGuestSummary({ score, total: answers.length, answers });
    setPhase(QUIZ_PHASES.SUMMARY);
    setQuestions([]);

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    guestSession.update({
      quiz: {
        date,
        score,
        answers: answers.map((item) => ({ qid: item.qid, correct: item.is_correct })),
      },
    });
  }, []);

  const handleSelectAnswer = (answer) => {
    if (phase !== QUIZ_PHASES.SHOWING) return;
    setSelectedAnswer(answer);
    setPhase(QUIZ_PHASES.ANSWERING);
  };

  // 环形卡面转到指定题目
  // 状态切换与起转放在同一帧完成: 先把新题内容渲染好, 再让卡面旋转,
  // 旋转过程中不再触发 React 重排, 避免转到一半卡顿
  const rotateToQuestion = useCallback((index) => {
    setBgPaused(true);
    setCurrentIndex(index);
    currentIndexRef.current = index;
    setSelectedAnswer(null);
    setResult(null);
    setPhase(QUIZ_PHASES.SHOWING);
    quizRingRef.current?.goTo(index);
    window.clearTimeout(bgTimerRef.current);
    bgTimerRef.current = window.setTimeout(() => setBgPaused(false), 1100);
  }, []);

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;
    setQuizLoading(true);
    try {
      if (practiceMode) {
        const res = await practiceAnswer(currentQuestion.id, selectedAnswer);
        if (res.data.success) {
          setResult(res.data.data);
          setPhase(res.data.data.is_correct ? QUIZ_PHASES.CORRECT : QUIZ_PHASES.WRONG);
        }
        return;
      }

      const res = await submitAnswer(currentQuestion.id, selectedAnswer);
      if (res.data.success) {
        setResult(res.data.data);
        emitAchievements(res.data.data.achievements);
        const isGuestAttempt = guestMode || res.data.data.scope === 'guest';
        let nextAnswers = guestAnswers;
        if (isGuestAttempt) {
          nextAnswers = [
            ...guestAnswers,
            {
              qid: currentQuestion.id,
              question: currentQuestion.question,
              is_correct: res.data.data.is_correct,
              correct_answer: res.data.data.correct_answer,
              explanation: res.data.data.explanation || '',
            },
          ];
          setGuestAnswers(nextAnswers);
        }

        if (res.data.data.is_correct) {
          setPhase(QUIZ_PHASES.CORRECT);
          setTimeout(() => {
            const idx = currentIndexRef.current;
            if (idx < questions.length - 1) {
              rotateToQuestion(idx + 1);
            } else if (isGuestAttempt) {
              finalizeGuestQuiz(nextAnswers);
            } else {
              setQuestions([]);
              setPhase(QUIZ_PHASES.IDLE);
            }
          }, 1500);
        } else {
          setPhase(QUIZ_PHASES.WRONG);
        }

        if (!isGuestAttempt) loadPageData({ silent: true });
      }
    } catch (err) {
      if (err?.response?.status === 429) {
        setErrorMsg('操作过快，稍后可继续');
        track('leaderboard_rate_limited', {
          category: currentQuestion?.category || 'all',
          stage: 'answer',
        });
        setPhase(QUIZ_PHASES.SHOWING);
        return;
      }
      setResult({ is_correct: false, explanation: '提交失败，请重试' });
      setPhase(QUIZ_PHASES.WRONG);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      rotateToQuestion(currentIndex + 1);
    } else if (guestMode) {
      finalizeGuestQuiz(guestAnswers);
    } else {
      setQuestions([]);
      setPhase(QUIZ_PHASES.IDLE);
      loadPageData({ silent: true });
    }
  };

  const handleRetry = () => {
    setQuestions([]);
    setPhase(QUIZ_PHASES.IDLE);
    setGuestAnswers([]);
    setGuestSummary(null);
  };

  const earnedBadgeCount = badges.filter(b => b.is_earned).length;

  // 卡面尺寸随视口自适应(侧栏 320px, 页面左右留白约 96px)
  const sidebarW = viewW > 1180 ? 320 : 0;
  const availW = Math.max(280, viewW - sidebarW - 96);
  const ringLaps = viewW >= 1200 ? 2 : 1;
  const catCardW = Math.round(Math.min(380, Math.max(200, availW * 0.28)));
  const qCardW = Math.round(Math.min(680, Math.max(300, availW * 0.62)));
  // 题目卡面高度按内容给定(题干 + 4 个选项 + 反馈区), 再由宽度反推宽高比
  const qCardH = viewW >= 900 ? 620 : 575;
  const qAspect = qCardW / qCardH;

  // 环形卡面数据 — 「全部题库」+ 四类建筑题库(顺序固定: 古建 / 民居 / 近代 / 现代)
  // 宽屏下绕两圈(10 张), 让环上的卡片不至于只剩侧边; 窄屏单圈(5 张)避免卡片过小
  const ringItems = useMemo(() => {
    const totalAll = categories.reduce((sum, c) => sum + (c.question_total || 0), 0);
    const base = [
      {
        key: '__all__',
        category: null,
        label: '全部题库',
        color: '#8A7A68',
        icon: 'fa-layer-group',
        desc: '四类通答 · 随机出题',
        image: '/quiz-cats/全部题库.png',
        total: totalAll,
        answered: stats?.total_answers || 0,
        accuracy: stats?.accuracy || 0,
      },
      ...categories.map(cat => {
        const meta = categoryMeta(cat.category);
        return {
          key: cat.category,
          category: cat.category,
          label: cat.category,
          color: meta.color,
          icon: meta.icon,
          desc: meta.desc,
          image: CATEGORY_IMAGES[cat.category] || null,
          total: cat.question_total || 0,
          answered: cat.answered || 0,
          accuracy: cat.accuracy || 0,
        };
      }),
    ];

    const deck = base.length
      ? (ringLaps > 1 ? [...base, ...base] : base)
      : [];

    return deck.map((item, index) => {
      const percent = item.total ? Math.round((item.answered / item.total) * 100) : 0;
      const num = (index % base.length) + 1;
      return {
        ...item,
        key: `${item.key}-${index}`,
        content: (
          <div
            className="quiz-ring-card"
            style={{
              '--cat-color': item.color,
              '--card-image': item.image ? `url("${item.image}")` : 'none',
            }}
          >
            <span className="quiz-ring-card-top">
              <span className="quiz-ring-card-icon">
                <i className={`fas ${item.icon}`} />
              </span>
              <span className="quiz-ring-card-num">{String(num).padStart(2, '0')}</span>
            </span>
            <span className="quiz-ring-card-name">{item.label}</span>
            <span className="quiz-ring-card-desc">{item.desc}</span>
            <span className="quiz-ring-card-track">
              <i style={{ width: `${Math.min(percent, 100)}%` }} />
            </span>
            <span className="quiz-ring-card-meta">
              {item.answered}/{item.total} 题 · 正确率 {item.accuracy}%
            </span>
            <span className="quiz-ring-card-cta">
              <i className="fas fa-play" /> 开始答题
            </span>
          </div>
        ),
      };
    });
  }, [categories, stats, ringLaps]);

  const ringCurrent = ringItems[ringIndex] || ringItems[0];

  // 答题环节 — 每道题是一张环形卡面, 答完自动转到下一张
  const questionItems = questions.map((q, index) => {
    const isActive = index === currentIndex;
    const curPhase = isActive ? phase : QUIZ_PHASES.SHOWING;
    const answer = isActive ? selectedAnswer : null;
    const res = isActive ? result : null;
    // 正确答案: 答对时就是所选选项, 答错时由接口返回字母
    const correctLetter =
      curPhase === QUIZ_PHASES.CORRECT ? answer : curPhase === QUIZ_PHASES.WRONG ? res?.correct_answer : null;
    const correctOption = correctLetter ? q.options.find((opt) => opt.charAt(0) === correctLetter) : null;
    const correctText = correctOption ? correctOption.substring(2).trim() : '';

    return {
      key: `q-${q.id ?? index}`,
      content: (
        <div className={`quiz-qcard${isActive ? ' quiz-qcard--active' : ''}`}>
          <div className="quiz-qcard-head">
            <span className="quiz-qcard-num">
              第 {index + 1} / {questions.length} 题
            </span>
            <span className="quiz-qcard-tags">
              <CategoryPill category={q.category} size="sm" />
              <span
                className="quiz-q-diff"
                style={{ background: DIFFICULTY_COLORS[q.difficulty] || '#666' }}
              >
                {DIFFICULTY_LABELS[q.difficulty] || '普通'}
              </span>
            </span>
          </div>

          <div className="quiz-qcard-question">{q.question}</div>

          <div className="quiz-qcard-body">
            <div className="quiz-options-v2">
              {q.options.map((opt) => {
                const letter = opt.charAt(0);
                const text = opt.substring(2).trim();
                let optClass = '';
                if (curPhase === QUIZ_PHASES.ANSWERING && answer === letter) optClass = 'selected';
                if (curPhase === QUIZ_PHASES.CORRECT) {
                  if (letter === answer) optClass = 'correct';
                } else if (curPhase === QUIZ_PHASES.WRONG) {
                  if (letter === res?.correct_answer) optClass = 'correct';
                  else if (letter === answer) optClass = 'wrong';
                }
                return (
                  <button
                    key={`${index}-${letter}`}
                    className={`quiz-option-v2 ${optClass}`}
                    onClick={() => handleSelectAnswer(letter)}
                    disabled={!isActive || curPhase !== QUIZ_PHASES.SHOWING}
                  >
                    <span className="quiz-option-v2-letter">{letter}</span>
                    <span className="quiz-option-v2-text">{text}</span>
                    {optClass === 'correct' && <i className="fas fa-check-circle" />}
                    {optClass === 'wrong' && <i className="fas fa-times-circle" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="quiz-qcard-foot">
            {curPhase === QUIZ_PHASES.SHOWING && <p className="quiz-hint-v2">请选择答案</p>}

            {curPhase === QUIZ_PHASES.ANSWERING && (
              <div className="quiz-actions-v2">
                <button className="quiz-submit-btn-v2" onClick={handleSubmit} disabled={quizLoading}>
                  <i className="fas fa-check" /> 确认答案
                </button>
              </div>
            )}

            {curPhase === QUIZ_PHASES.CORRECT && (
              <div className="quiz-qcard-feedback correct">
                <i className="fas fa-check-circle" />
                <strong>回答正确</strong>
                {!guestMode && !practiceMode && (
                  <span className="quiz-qcard-points">+{res?.points_earned || 20} 赏银</span>
                )}
                <span className="quiz-qcard-next-tip">
                  {practiceMode ? '点击“下一题”继续练习' : '自动旋转到下一题…'}
                </span>
                {correctLetter && (
                  <p className="quiz-qcard-answer">
                    <i className="fas fa-circle-check" /> 正确答案
                    <b>{correctLetter}</b>
                    {correctText && <em>· {correctText}</em>}
                  </p>
                )}
                {res?.explanation && <p className="quiz-qcard-explain">{res.explanation}</p>}
              </div>
            )}

            {curPhase === QUIZ_PHASES.WRONG && (
              <div className="quiz-qcard-feedback wrong">
                <i className="fas fa-times-circle" />
                <strong>答错了</strong>
                <span className="quiz-qcard-feedback-actions">
                  <button className="quiz-submit-btn-v2 ghost" onClick={handleNext}>
                    下一题 <i className="fas fa-arrow-right" />
                  </button>
                  <button className="quiz-submit-btn-v2 ghost" onClick={handleRetry}>
                    <i className="fas fa-redo" /> 重来
                  </button>
                </span>
                {correctLetter && (
                  <p className="quiz-qcard-answer">
                    <i className="fas fa-circle-check" /> 正确答案
                    <b>{correctLetter}</b>
                    {correctText && <em>· {correctText}</em>}
                  </p>
                )}
                {res?.explanation && <p className="quiz-qcard-explain">{res.explanation}</p>}
              </div>
            )}
          </div>
        </div>
      ),
    };
  });

  if (loading) {
    return (
      <div className="quiz-page">
        <MicroSlats
          className="quiz-page-bg"
          preset="swell"
          color="#C0392B"
          glintColor="#D9A441"
          backgroundColor="#FAF5EF"
          slatWidth={4}
          slatHeight={30}
          gap={10}
          roundness={0.75}
          interactive={false}
          swirl={0}
          trail={1.4}
          lean={0}
          intro
          scale={1}
          speed={0.45}
          direction={250}
          chop={0.55}
          stretch={0}
          glint={0.5}
          contrast={1.05}
          perspective={0.5}
          fog={0.5}
          introDuration={1.8}
        />
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
      {/* 页面背景：微光栅 */}
      <MicroSlats
        className="quiz-page-bg"
        preset="swell"
        color="#C0392B"
        glintColor="#D9A441"
        backgroundColor="#FAF5EF"
        slatWidth={4}
        slatHeight={30}
        gap={10}
        roundness={0.75}
        interactive
        cursorStrength={0.7}
        cursorSize={40}
        swirl={0}
        trail={1.6}
        lean={0}
        intro
        scale={1}
        speed={0.45}
        direction={250}
        chop={0.55}
        stretch={0}
        glint={0.5}
        contrast={1.05}
        perspective={0.5}
        fog={0.5}
        introDuration={1.8}
        paused={bgPaused}
      />

      {/* 顶部栏 */}
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" /> 返回宫城
        </button>
        <h1 className="profile-title">
          <i className="fas fa-graduation-cap" /> {practiceMode ? '随堂练习 · 不计分' : '翰林院'}
        </h1>
        <p className="profile-title-sub">
          {practiceMode
            ? '练习结果不计入统计与排行'
            : `共答 ${stats?.total_answers || 0} 题 · 正确率 ${stats?.accuracy || 0}%`}
        </p>
      </div>

      <div className="quiz-layout">
        {/* 左侧栏：题库 / 记录 / 筑识榜 */}
        <aside className="quiz-sidebar">
          {/* Tab 导航 */}
          <div className="profile-tabs quiz-sidebar-tabs">
            {(practiceMode ? TABS.filter((tab) => tab.key === 'quiz') : TABS).map(tab => (
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
                  {errorMsg && (
                    <div className="quiz-error-msg">
                      <i className="fas fa-exclamation-circle" /> {errorMsg}
                    </div>
                  )}

                  <h3>答题难度</h3>
                  <div className="quiz-difficulty-options-v2">
                    {DIFFICULTY.map(d => (
                      <button
                        key={d.label}
                        className={`quiz-difficulty-btn-v2${difficulty === d.value ? ' active' : ''}`}
                        onClick={() => setDifficulty(d.value)}
                        disabled={quizLoading}
                        style={d.color ? { '--diff-color': d.color } : {}}
                      >
                        <i className={`fas ${d.icon}`} />
                        <span>{d.label}</span>
                        {d.value ? (
                          <span className="quiz-diff-tag" style={{ background: d.color }}>
                            Lv.{d.value}
                          </span>
                        ) : (
                          <span className="quiz-diff-tag quiz-diff-tag--muted">不限</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <p className="quiz-stage-tip">
                    <i className="fas fa-circle-info" />
                    难度只决定出题范围，选好后在右侧旋转卡面中点击建筑分类即可开答。
                  </p>

                  {guestMode && guestQuotaLeft !== null && (
                    <p className="quiz-guest-quota">
                      今日剩余体验 {guestQuotaLeft} 轮 · 每轮 5 题
                    </p>
                  )}

                  <div className="quiz-side-cats">
                    <h3 className="quiz-start-sub-title">题库速览</h3>
                    {categories.map(cat => {
                      const meta = categoryMeta(cat.category);
                      return (
                        <button
                          key={cat.category}
                          className="quiz-side-cat"
                          style={{ '--cat-color': meta.color }}
                          onClick={() => startQuiz(difficulty, cat.category)}
                          disabled={quizLoading}
                        >
                          <i className={`fas ${meta.icon}`} />
                          <span className="quiz-side-cat-name">{cat.category}</span>
                          <span className="quiz-side-cat-num">{cat.question_total || 0}</span>
                        </button>
                      );
                    })}
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
                    <CategoryPill category={currentQuestion?.category} size="sm" />
                    <span
                      className="quiz-sidebar-diff"
                      style={{ background: DIFFICULTY_COLORS[currentQuestion?.difficulty] || '#666' }}
                    >
                      {DIFFICULTY_LABELS[currentQuestion?.difficulty] || '普通'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== 记录区 ===== */}
          {activeTab === 'records' && (
            <div className="quiz-sidebar-body">
              {guestMode && (
                <div className="quiz-guest-lock-hint">登录后查看答题记录</div>
              )}
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

              <h3 className="quiz-sidebar-sub-title">题库分布</h3>
              <div className="quiz-cat-bars">
                {(stats?.category_stats || []).map(cat => {
                  const meta = categoryMeta(cat.category);
                  const percent = cat.question_total
                    ? Math.round((cat.total / cat.question_total) * 100)
                    : 0;
                  return (
                    <div key={cat.category} className="quiz-cat-bar" style={{ '--cat-color': meta.color }}>
                      <div className="quiz-cat-bar-head">
                        <span>{cat.category}</span>
                        <em>{cat.total}/{cat.question_total}</em>
                      </div>
                      <div className="quiz-cat-bar-track">
                        <span style={{ width: `${Math.min(percent, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== 筑识榜 ===== */}
          {activeTab === 'board' && (
            <div className="quiz-sidebar-body">
              {guestMode && (
                <div className="quiz-guest-lock-hint">登录后可参与排行</div>
              )}
              <div className="quiz-badges-sidebar-stats">
                我的答对题数{' '}
                {stats?.distinct_correct ?? leaderboard.me?.correct_answers ?? 0} 题
              </div>
              <div className="quiz-stats-mini quiz-board-mini">
                <div className="quiz-stats-mini-item">
                  <span className="quiz-stats-mini-val">
                    {isPublicRank(leaderboard.me)
                      ? `#${leaderboard.me.rank_no}`
                      : (privacyRankHint(leaderboard.me?.privacy_mode) || '—')}
                  </span>
                  <span className="quiz-stats-mini-label">当前名次</span>
                </div>
                <div className="quiz-stats-mini-item">
                  <span className="quiz-stats-mini-val">
                    {leaderboard.me?.privacy_mode === 'minor'
                      ? '已隐藏'
                      : leaderboard.me?.privacy_mode === 'opted_out'
                        ? '未参与'
                        : (leaderboard.me ? '公开' : '—')}
                  </span>
                  <span className="quiz-stats-mini-label">榜单状态</span>
                </div>
              </div>
              <div className="quiz-badges-sidebar-stats quiz-board-badge-stat">
                已获得 {earnedBadgeCount}/{badges.length} 枚徽章
              </div>
            </div>
          )}
        </aside>

        {/* 右侧：主内容区 */}
        <main className="quiz-main">
          {/* ===== 答题区 ===== */}
          {activeTab === 'quiz' && (
            <div
              className={`quiz-main-body${
                phase === QUIZ_PHASES.IDLE || phase === QUIZ_PHASES.LOADING
                  ? ' quiz-main-body--stage'
                  : ' quiz-main-body--quiz'
              }`}
            >
              {(phase === QUIZ_PHASES.IDLE || phase === QUIZ_PHASES.LOADING) && (
                <div className="quiz-hero quiz-hero--stage">
                  <div className="quiz-hero-content quiz-hero-content--stage">
                    <header className="quiz-stage-head">
                      <span className="quiz-hero-eyebrow">知识问答 · 四大题库</span>
                      <h2 className="quiz-hero-title">筑知问答</h2>
                      <p className="quiz-hero-sub">
                        {guestMode
                          ? '拖动或点击旋转卡面选题，即刻开始体验 · 游客每轮 5 题，成绩只存本机'
                          : '拖动或点击旋转卡面选题，即刻进入对应题库的答题环节 · 每答对一题 +20 赏银'}
                      </p>
                    </header>

                    <div className="quiz-stage-stats">
                      <span className="quiz-stage-stat">
                        <em>{stats?.correct_answers || 0}</em>答对
                      </span>
                      <span className="quiz-stage-stat accent">
                        <em>{stats?.accuracy || 0}%</em>正确率
                      </span>
                      <span className="quiz-stage-stat">
                        <em>{stats?.total_answers || 0}</em>总答题
                      </span>
                      <span className="quiz-stage-stat">
                        <em>{stats?.streak || 0}天</em>连续
                      </span>
                      {guestMode && guestSummary && (
                        <span className="quiz-stage-stat">
                          <em>{guestSummary.score}/{guestSummary.total}</em>上次成绩
                        </span>
                      )}
                    </div>

                    {/* 3D 环形旋转卡面 — 点击卡面直接开答 */}
                    <div className="quiz-ring">
                      {ringItems.length > 1 ? (
                        <CircularCarousel
                          items={ringItems}
                          cardWidth={catCardW}
                          aspectRatio={0.92}
                          gap={46}
                          curve={1}
                          tilt={-3}
                          perspective={2400}
                          speed={9}
                          direction="left"
                          autoplay="drift"
                          momentum={0.6}
                          snap
                          pauseOnHover
                          focusOnClick={false}
                          draggable
                          parallax={0.3}
                          stretch={0.4}
                          depthFade={0.5}
                          fadeColor="#3c2415"
                          cornerRadius={16}
                          onChange={setRingIndex}
                          onItemClick={(item) => startQuiz(difficulty, item.category)}
                        />
                      ) : (
                        <div className="quiz-ring-empty">
                          <div className="loading-spinner" />
                          <p>整理题库中...</p>
                        </div>
                      )}
                    </div>

                    <div className="quiz-stage-foot">
                      <span className="quiz-stage-foot-diff">
                        当前难度
                        <strong>{difficulty ? DIFFICULTY_LABELS[difficulty] : '全部'}</strong>
                      </span>
                      <button
                        className="quiz-stage-start"
                        onClick={() => startQuiz(difficulty, ringCurrent?.category ?? null)}
                        disabled={quizLoading || !ringItems.length}
                      >
                        <i className="fas fa-play" /> 开始答题
                        <em>{ringCurrent?.label || ''}</em>
                      </button>
                      <span className="quiz-stage-foot-hint">或直接点击任意卡面</span>
                    </div>

                    {errorMsg && (
                      <div className="quiz-error-msg">
                        <i className="fas fa-exclamation-circle" /> {errorMsg}
                      </div>
                    )}

                    {quizLoading && (
                      <div className="quiz-loading-inline">
                        <div className="loading-spinner" />
                        <p>出题中...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {phase !== QUIZ_PHASES.IDLE && phase !== QUIZ_PHASES.LOADING && currentQuestion && (
                <div className="quiz-quiz-stage">
                  {/* 顶部进度条 */}
                  <div className="quiz-quiz-head">
                    <span className="quiz-quiz-count">
                      第 <em>{currentIndex + 1}</em> / {questions.length} 题
                    </span>
                    <span className="quiz-quiz-track">
                      <i
                        style={{
                          width: `${((currentIndex + 1) / Math.max(questions.length, 1)) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="quiz-quiz-cat">{category || '全部题库'}</span>
                  </div>

                  {/* 题目环形卡面 — 与选题同一套旋转卡面, 答完自动旋转到下一题 */}
                  <div className="quiz-ring quiz-ring--quiz">
                    <CircularCarousel
                      ref={quizRingRef}
                      items={questionItems}
                      fit="focus"
                      autoplay="off"
                      draggable={false}
                      focusOnClick={false}
                      cardWidth={qCardW}
                      aspectRatio={qAspect}
                      gap={70}
                      stepAngle={46}
                      initialIndex={currentIndex}
                      spring={190}
                      curve={1}
                      tilt={-2}
                      perspective={2600}
                      parallax={0}
                      stretch={0}
                      depthFade={0.5}
                      fadeColor="#3c2415"
                      cornerRadius={20}
                      intro="none"
                    />
                  </div>

                  <p className="quiz-quiz-tip">
                    <i className="fas fa-rotate" />
                    答对后卡面自动旋转到下一题 · 左右相邻卡面为待答题
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===== 答题记录 ===== */}
          {activeTab === 'records' && (
            <div className="quiz-main-body">
              {guestMode && (
                <div className="quiz-guest-lock-banner">
                  <i className="fas fa-lock" />
                  <span>游客不保存答题记录，登录后可长期积累成绩与徽章</span>
                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: { from: '/quiz' } })}
                  >
                    登录
                  </button>
                </div>
              )}
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

              <CategoryFilter
                value={recordsCategory}
                onChange={loadRecords}
                categories={categories}
              />

              {records.length === 0 ? (
                <div className="quiz-empty-main">
                  <i className="fas fa-history" />
                  <p>{recordsCategory ? `「${recordsCategory}」暂无答题记录` : '暂无答题记录'}</p>
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
                          <CategoryPill category={rec.category} size="xs" />
                          <span>
                            答案: <strong>{rec.user_answer}</strong>
                            {rec.is_correct ? ' · +20赏银' : ''}
                          </span>
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

          {/* ===== 筑识榜 ===== */}
          {activeTab === 'board' && (
            <div className="quiz-main-body">
              {guestMode && (
                <div className="quiz-guest-lock-banner">
                  <i className="fas fa-lock" />
                  <span>登录后可参与筑识榜排行，并保存徽章进度</span>
                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: { from: '/quiz' } })}
                  >
                    登录
                  </button>
                </div>
              )}
              <div className="quiz-badges-header">
                <div className="quiz-badges-overview-v2">
                  <div className="quiz-badges-overview-icon-v2">
                    <i className="fas fa-ranking-star" />
                  </div>
                  <div className="quiz-board-overview-body">
                    <div className="quiz-badges-overview-title-v2">
                      筑识榜 · {boardCategory || '全榜'}
                    </div>
                    <div className="quiz-badges-overview-sub-v2">
                      按去重答对题数排名 · 答对越多名次越高
                    </div>
                  </div>
                  {isPublicRank(leaderboard.me) ? (
                    <div className="quiz-board-my-rank">
                      <span className="quiz-board-my-rank-num">#{leaderboard.me.rank_no}</span>
                      <span className="quiz-board-my-rank-label">我的名次</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <CategoryFilter
                value={boardCategory}
                onChange={loadLeaderboard}
                categories={categories}
              />

              {boardLoading ? (
                <div className="quiz-loading-inline">
                  <div className="loading-spinner" />
                  <p>排榜中...</p>
                </div>
              ) : leaderboard.list.length === 0 ? (
                <div className="quiz-empty-main">
                  <i className="fas fa-ranking-star" />
                  <p>暂无成绩</p>
                  <button
                    type="button"
                    className="quiz-submit-btn-v2 ghost"
                    onClick={() => setActiveTab('quiz')}
                  >
                    <i className="fas fa-pen-nib" /> 去答题
                  </button>
                </div>
              ) : (
                <div className="quiz-rank-list">
                  {leaderboard.list.map((row, i) => {
                    const isMe =
                      isPublicRank(leaderboard.me) &&
                      row.privacy_mode === 'normal' &&
                      row.rank_no != null &&
                      row.rank_no === leaderboard.me.rank_no;
                    const topClass = row.rank_no != null && row.rank_no <= 3
                      ? ` top-${row.rank_no}`
                      : '';
                    const privacyHint = privacyRankHint(row.privacy_mode);
                    return (
                      <div key={`${row.display_name}-${i}`} className={`quiz-rank-row${topClass}${isMe ? ' me' : ''}`}>
                        <span className="quiz-rank-no">
                          {row.rank_no != null
                            ? (row.rank_no <= 3
                              ? <i className="fas fa-crown" />
                              : row.rank_no)
                            : <i className="fas fa-minus" />}
                        </span>
                        <span className="quiz-rank-avatar">筑</span>
                        <span className="quiz-rank-info">
                          <span className="quiz-rank-name">
                            {row.display_name}
                            {isMe && <em className="quiz-rank-me-tag">我</em>}
                          </span>
                          <span className="quiz-rank-sub">
                            {privacyHint ? `${privacyHint} · ` : ''}
                            答对 {row.correct_answers} 题
                          </span>
                        </span>
                        <span className="quiz-rank-score">
                          {row.correct_answers}
                          <em>题</em>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 徽章 */}
              <div className="quiz-board-badges">
                <div className="quiz-board-section-title">
                  <i className="fas fa-medal" /> 功名徽章
                  <span className="quiz-board-section-count">
                    {earnedBadgeCount}/{badges.length}
                  </span>
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
            </div>
          )}
        </main>
      </div>

      {guestMode && guestSummary && phase === QUIZ_PHASES.SUMMARY && (
        <div className="quiz-guest-summary-overlay">
          <div className="quiz-guest-summary" role="dialog" aria-labelledby="guest-summary-title">
            <h2 id="guest-summary-title">本轮体验完成</h2>
            <p className="quiz-guest-score">
              答对 <em>{guestSummary.score}</em> / {guestSummary.total} 题
            </p>

            <div className="quiz-guest-answers">
              {guestSummary.answers.map((item, index) => (
                <div
                  key={`${item.qid}-${index}`}
                  className={`quiz-guest-answer ${item.is_correct ? 'correct' : 'wrong'}`}
                >
                  <div className="quiz-guest-answer-head">
                    <span>第 {index + 1} 题</span>
                    <strong>{item.is_correct ? '答对' : '答错'}</strong>
                  </div>
                  <p className="quiz-guest-answer-question">{item.question}</p>
                  {!item.is_correct && item.correct_answer && (
                    <p className="quiz-guest-answer-correct">
                      正确答案：{item.correct_answer}
                    </p>
                  )}
                  {item.explanation && (
                    <p className="quiz-guest-answer-explain">{item.explanation}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="quiz-guest-summary-actions">
              <button type="button" className="quiz-submit-btn-v2 ghost" onClick={handleRetry}>
                <i className="fas fa-redo" /> 再答一轮
              </button>
              <button
                type="button"
                className="quiz-submit-btn-v2"
                onClick={() => navigate('/login', { state: { from: '/quiz' } })}
              >
                登录保存成绩
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
