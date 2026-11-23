import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { track } from '../lib/analytics';
import ModalShell from './ModalShell';

const CAPABILITY_TEXT = {
  collect: '收藏建筑与写笔记',
  quiz: '参与答题并记录成绩',
  history: '记录御览足迹',
  profile: '查看个人中心',
  share: '生成分享卡片',
  default: '使用这项功能',
};

/**
 * 能力级登录引导弹层
 * 未登录时不改变当前 URL，只提示登录并保留继续浏览的出口
 */
export default function LoginPrompt({
  open,
  capability = 'default',
  onClose,
  onGuestFallback,
  guestFallbackLabel = '先逛逛',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const capabilityText = CAPABILITY_TEXT[capability] || CAPABILITY_TEXT.default;

  useEffect(() => {
    if (open) track('register_prompt_show', { capability });
  }, [open, capability]);

  const goLogin = () => {
    track('register_prompt_click', { capability });
    onClose?.();
    navigate('/login', {
      state: { from: location.pathname + location.search },
    });
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="login-prompt-title">
      <h2 id="login-prompt-title" className="login-prompt-title">
        需要入馆凭证
      </h2>
      <p className="login-prompt-desc">
        {capabilityText}需要登录后使用；当前页面浏览不受影响。
      </p>
      <div className="login-prompt-actions">
        {onGuestFallback && (
          <button
            type="button"
            className="login-prompt-btn login-prompt-btn--ghost"
            onClick={() => {
              onClose?.();
              onGuestFallback();
            }}
          >
            {guestFallbackLabel}
          </button>
        )}
        <button
          type="button"
          className="login-prompt-btn login-prompt-btn--ghost"
          onClick={onClose}
        >
          继续浏览
        </button>
        <button
          type="button"
          className="login-prompt-btn login-prompt-btn--primary"
          onClick={goLogin}
        >
          前往登录
        </button>
      </div>
    </ModalShell>
  );
}