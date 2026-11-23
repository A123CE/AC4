import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPrompt from './LoginPrompt';

/**
 * 能力级登录引导按钮
 *
 * 已登录：直接执行 onClick。
 * 未登录：不改变 URL，弹出登录提示；若提供 onGuestFallback 则优先走游客降级。
 */
export default function RequireCapability({
  capability = 'default',
  onClick,
  onGuestFallback,
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  const { isLoggedIn } = useAuth();
  const [promptOpen, setPromptOpen] = useState(false);

  const handleClick = (event) => {
    if (isLoggedIn) {
      onClick?.(event);
      return;
    }
    if (onGuestFallback) {
      onGuestFallback(event);
      return;
    }
    setPromptOpen(true);
  };

  return (
    <>
      <button type={type} className={className} onClick={handleClick} {...rest}>
        {children}
      </button>
      <LoginPrompt
        open={promptOpen}
        capability={capability}
        onClose={() => setPromptOpen(false)}
      />
    </>
  );
}