import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalShell from './ModalShell';

/**
 * 全站搜索弹层 — Ctrl/⌘ + K 打开
 */
export default function GlobalSearchDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    setQuery('');
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <ModalShell
      open={open}
      onClose={() => setOpen(false)}
      labelledBy="global-search-title"
      panelClassName="glass-panel"
    >
      <h2 id="global-search-title" className="login-prompt-title">
        全站搜索
      </h2>
      <p className="login-prompt-desc">
        搜索建筑、术语、题目与时间轴，回车查看结果。
      </p>
      <form onSubmit={submit}>
        <input
          autoFocus
          className="share-manual-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="全站搜索关键词"
          placeholder="例如：斗拱、太和殿、庑殿顶"
        />
        <div className="login-prompt-actions">
          <button
            type="button"
            className="login-prompt-btn login-prompt-btn--ghost"
            onClick={() => setOpen(false)}
          >
            取消
          </button>
          <button type="submit" className="login-prompt-btn login-prompt-btn--primary">
            搜索
          </button>
        </div>
      </form>
    </ModalShell>
  );
}