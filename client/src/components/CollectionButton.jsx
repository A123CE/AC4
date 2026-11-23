import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCollections } from '../context/CollectionsContext';
import LoginPrompt from './LoginPrompt';
import CollectionDialog from './CollectionDialog';
import { track } from '../lib/analytics';

/**
 * 收藏入口按钮
 * - 未登录：登录引导 + 「暂存到本机」
 * - 已登录：打开分类 / 笔记弹层
 */
export default function CollectionButton({
  palaceId,
  variant = 'icon',
  showLabel = false,
  className = '',
}) {
  const { isLoggedIn } = useAuth();
  const { isCollected, isStaged, getCollection, toggle, save } = useCollections();
  const [promptOpen, setPromptOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState('');

  if (!palaceId) return null;

  const collected = isCollected(palaceId);
  const staged = isStaged(palaceId);
  const detail = getCollection(palaceId);
  const label = staged ? '待合并' : collected ? '已收藏' : '收藏';

  const handleClick = () => {
    track('favorite_click', { entity_type: 'palace', entity_id: palaceId });

    if (!isLoggedIn) {
      setPromptOpen(true);
      return;
    }
    setDialogOpen(true);
  };

  const handleGuestFallback = async () => {
    await toggle(palaceId);
    setStatus('已暂存到本机，登录后可合并');
  };

  const handleSave = async ({ category, note }) => {
    const result = await save(palaceId, { category, note });
    if (result.success) {
      setDialogOpen(false);
      setStatus('已收藏');
    }
    return result;
  };

  return (
    <>
      <button
        type="button"
        className={`collection-btn collection-btn--${variant}${
          collected ? ' is-collected' : ''
        }${staged ? ' is-staged' : ''}${className ? ` ${className}` : ''}`}
        onClick={handleClick}
        aria-pressed={collected || staged}
        aria-label={label}
        title={label}
      >
        <i className={collected ? 'fas fa-bookmark' : 'far fa-bookmark'} />
        {showLabel && <span>{label}</span>}
      </button>

      <span role="status" aria-live="polite" className="collection-status">
        {status}
      </span>

      <LoginPrompt
        open={promptOpen}
        capability="collect"
        onClose={() => setPromptOpen(false)}
        onGuestFallback={handleGuestFallback}
        guestFallbackLabel="暂存到本机"
      />

      <CollectionDialog
        open={dialogOpen}
        initialCategory={detail?.collection_category || '默认'}
        initialNote={detail?.note || ''}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}