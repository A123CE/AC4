import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuizQuestions, submitAnswer } from '../api';
import CoinAnimation from './CoinAnimation';

/**
 * 翰林院答题 — 圣旨式弹窗
 *
 * Props:
 *  - open: boolean — 是否显示
 *  - onClose: () => void — 关闭回调
 *  - palaceId: string|null — 关联的宫殿ID (注视触发时传入)
 */

const ANIMATION_PHASES = {
  ENTERING: 'entering',       // 圣旨飘落中
  SHOWING: 'showing',         // 显示题目
  ANSWERING: 'answering',     // 已选择答案
  CORRECT: 'correct',         // 答对了
  WRONG: 'wrong',             // 答错了
  EXITING: 'exiting',         // 圣旨卷起退出
};

export default function QuizModal({ open, onClose, palaceId }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(ANIMATION_PHASES.ENTERING);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coinPos, setCoinPos] = useState(null);
  const [showCoin, setShowCoin] = useState(false);

  // 加载题目
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setPhase(ANIMATION_PHASES.ENTERING);
    try {
      const params = { count: 5 };
      if (palaceId) params.palace_id = palaceId;
      const res = await getQuizQuestions(params);
      if (res.data.success && res.data.data?.length > 0) {
        setQuestions(res.data.data);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setResult(null);
        // 入场动画后进入显示状态
        setTimeout(() => setPhase(ANIMATION_PHASES.SHOWING), 800);
      } else {
        // API 返回成功但无题目 — 显示空状态
        setPhase(ANIMATION_PHASES.SHOWING);
      }
    } catch (err) {
      console.error('加载题目失败:', err);
      // 加载失败时显示空状态而不是直接关闭
      setPhase(ANIMATION_PHASES.SHOWING);
    } finally {
      setLoading(false);
    }
  }, [palaceId, onClose]);

  useEffect(() => {
    if (open) {
      loadQuestions();
    }
  }, [open, loadQuestions]);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (answer) => {
    if (phase !== ANIMATION_PHASES.SHOWING) return;
    setSelectedAnswer(answer);
    setPhase(ANIMATION_PHASES.ANSWERING);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;
    setLoading(true);
    try {
      const res = await submitAnswer(currentQuestion.id, selectedAnswer);
      if (res.data.success) {
        setResult(res.data.data);
        if (res.data.data.is_correct) {
          setPhase(ANIMATION_PHASES.CORRECT);
          // 触发金币动画
          setCoinPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          setShowCoin(true);
          setTimeout(() => setShowCoin(false), 2000);
          // 答对自动跳下一题
          setTimeout(() => {
            if (currentIndex < questions.length - 1) {
              setCurrentIndex(prev => prev + 1);
              setSelectedAnswer(null);
              setResult(null);
              setPhase(ANIMATION_PHASES.SHOWING);
            } else {
              handleClose();
            }
          }, 1500);
        } else {
          setPhase(ANIMATION_PHASES.WRONG);
        }
      }
    } catch {
      setResult({ is_correct: false, explanation: '提交失败，请重试' });
      setPhase(ANIMATION_PHASES.WRONG);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setResult(null);
      setPhase(ANIMATION_PHASES.SHOWING);
    } else {
      handleClose();
    }
  };

  const handleViewExplanation = () => {
    if (result?.related_term_id) {
      handleClose();
      navigate(`/encyclopedia`);
      // 跳转到相关术语
      setTimeout(() => {
        const event = new CustomEvent('encyclopedia:select-term', { detail: { termId: result.related_term_id } });
        window.dispatchEvent(event);
      }, 500);
    }
  };

  const handleClose = () => {
    setPhase(ANIMATION_PHASES.EXITING);
    setTimeout(() => {
      onClose?.();
    }, 500);
  };

  if (!open) return null;

  const difficultyLabels = { 1: '初窥', 2: '中等', 3: '难题' };
  const difficultyColors = { 1: '#3E6B89', 2: '#B8860B', 3: '#C41E3A' };

  return (
    <div className="quiz-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={`quiz-modal ${phase}`}>
        {/* 圣旨卷轴背景 */}
        <div className="quiz-scroll-top">
          <div className="quiz-scroll-rod-top" />
          <div className="quiz-scroll-fabric" />
        </div>

        <div className="quiz-scroll-body">
          {/* 加载中 */}
          {loading && !currentQuestion && (
            <div className="quiz-loading">
              <div className="loading-spinner" />
              <p>翰林院出题中...</p>
            </div>
          )}

          {/* 题目内容 */}
          {currentQuestion && (
            <>
              {/* 题号 + 难度 */}
              <div className="quiz-header">
                <div className="quiz-header-left">
                  <span className="quiz-number">第{currentIndex + 1}题</span>
                  <span className="quiz-total">/共{questions.length}题</span>
                </div>
                <span
                  className="quiz-difficulty"
                  style={{ background: difficultyColors[currentQuestion.difficulty] || '#666' }}
                >
                  {difficultyLabels[currentQuestion.difficulty] || '普通'}
                </span>
              </div>

              {/* 题目文本 */}
              <div className="quiz-question">
                <i className="fas fa-quote-left" />
                <span>{currentQuestion.question}</span>
                <i className="fas fa-quote-right" />
              </div>

              {/* 选项列表 */}
              <div className="quiz-options">
                {currentQuestion.options.map((opt) => {
                  const letter = opt.charAt(0);
                  const text = opt.substring(2).trim();
                  let optClass = '';
                  if (phase === ANIMATION_PHASES.ANSWERING && selectedAnswer === letter) {
                    optClass = 'selected';
                  }
                  if ((phase === ANIMATION_PHASES.CORRECT || phase === ANIMATION_PHASES.WRONG)) {
                    if (letter === result?.correct_answer) optClass = 'correct';
                    else if (letter === selectedAnswer && !result?.is_correct) optClass = 'wrong';
                  }

                  return (
                    <button
                      key={letter}
                      className={`quiz-option ${optClass}`}
                      onClick={() => handleSelectAnswer(letter)}
                      disabled={phase !== ANIMATION_PHASES.SHOWING}
                    >
                      <span className="quiz-option-letter">{letter}</span>
                      <span className="quiz-option-text">{text}</span>
                      {optClass === 'correct' && <i className="fas fa-check-circle" />}
                      {optClass === 'wrong' && <i className="fas fa-times-circle" />}
                    </button>
                  );
                })}
              </div>

              {/* 未选择答案时提示 */}
              {phase === ANIMATION_PHASES.SHOWING && !selectedAnswer && (
                <p className="quiz-hint">请选择你认为正确的答案</p>
              )}

              {/* 提交按钮 */}
              {phase === ANIMATION_PHASES.ANSWERING && (
                <div className="quiz-actions">
                  <button
                    className="quiz-submit-btn"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    <i className="fas fa-check" /> 确认答案
                  </button>
                </div>
              )}

              {/* 正确结果 */}
              {phase === ANIMATION_PHASES.CORRECT && (
                <div className="quiz-result correct">
                  <div className="quiz-result-icon">
                    <i className="fas fa-check-circle" />
                  </div>
                  <div className="quiz-result-title">回答正确！</div>
                  <div className="quiz-result-points">
                    <i className="fas fa-coins" /> +{result?.points_earned || 20} 赏银
                  </div>
                  {result?.explanation && (
                    <div className="quiz-result-explanation">
                      <i className="fas fa-lightbulb" /> {result.explanation}
                    </div>
                  )}
                  {result?.new_badge && (
                    <div className="quiz-result-badge">
                      <i className="fas fa-medal" /> 获得新徽章：{result.new_badge.name}
                    </div>
                  )}
                  <button className="quiz-next-btn" onClick={handleNext}>
                    {currentIndex < questions.length - 1 ? '下一题' : '完成'}
                    <i className="fas fa-arrow-right" />
                  </button>
                </div>
              )}

              {/* 错误结果 */}
              {phase === ANIMATION_PHASES.WRONG && (
                <div className="quiz-result wrong">
                  <div className="quiz-result-icon">
                    <i className="fas fa-times-circle" />
                  </div>
                  <div className="quiz-result-title">答错了</div>
                  <div className="quiz-result-correct-answer">
                    正确答案：{result?.correct_answer}
                  </div>
                  {result?.explanation && (
                    <div className="quiz-result-explanation">
                      <i className="fas fa-lightbulb" /> {result.explanation}
                    </div>
                  )}
                  <div className="quiz-result-actions">
                    <button className="quiz-next-btn" onClick={handleNext}>
                      {currentIndex < questions.length - 1 ? '下一题' : '完成'}
                      <i className="fas fa-arrow-right" />
                    </button>
                    {result?.related_term_id && (
                      <button className="quiz-explanation-btn" onClick={handleViewExplanation}>
                        <i className="fas fa-book" /> 查看解析
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 无题目 */}
          {!loading && !currentQuestion && (
            <div className="quiz-empty">
              <i className="fas fa-scroll" />
              <p>题库中暂无题目</p>
              <button className="quiz-next-btn" onClick={handleClose}>
                关闭
              </button>
            </div>
          )}
        </div>

        <div className="quiz-scroll-bottom">
          <div className="quiz-scroll-fabric" />
          <div className="quiz-scroll-rod-bottom" />
        </div>

        {/* 关闭按钮 */}
        <button
          className="quiz-close-btn"
          onClick={handleClose}
          aria-label="关闭"
        >
          <i className="fas fa-times" />
        </button>
      </div>

      {/* 金币动画 */}
      {showCoin && (
        <CoinAnimation
          amount={result?.points_earned || 20}
          startPos={coinPos}
          targetPos={{ x: window.innerWidth - 80, y: 30 }}
          onComplete={() => setShowCoin(false)}
        />
      )}
    </div>
  );
}
