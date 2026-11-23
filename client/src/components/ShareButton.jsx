import { useRef, useState } from 'react';
import ModalShell from './ModalShell';
import { shareContent } from '../lib/share';
import { track } from '../lib/analytics';
import { useClassroomView } from '../context/ClassroomViewContext';

/**
 * 分享入口
 * 系统分享 → 剪贴板 → 手动复制三级降级
 */
export default function ShareButton({
  type = 'palace',
  id,
  title = '华夏古建',
  text = '发现一座有意思的中国古建筑',
  channel = 'copy',
  className = '',
  variant = 'icon',
  showLabel = false,
  query = {},
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [status, setStatus] = useState('');
  const inputRef = useRef(null);
  const { hidden } = useClassroomView();

  if (hidden.share) return null;
  if (!id && type !== 'search') return null;

  const label = type === 'palace' ? '分享此建筑' : '分享此内容';

  const handleShare = async () => {
    track('share_click', {
      channel,
      entity_type: type,
      entity_id: id || '',
    });

    const result = await shareContent({ type, id, channel, title, text, query });

    if (result.method === 'manual') {
      setManualUrl(result.url);
      setManualOpen(true);
      return;
    }
    if (result.method === 'cancel') return;

    setStatus(result.method === 'system' ? '已调起系统分享' : '链接已复制');
    window.setTimeout(() => setStatus(''), 2000);
  };


  const copyManual = async () => {
    try {
      await navigator.clipboard.writeText(manualUrl);
      setStatus('链接已复制');
    } catch {
      inputRef.current?.select?.();
      setStatus('请手动复制已选中的链接');
    }
  };

  return (
    <>
      <button
        type="button"
        className={`share-btn share-btn--${variant}${className ? ` ${className}` : ''}`}
        onClick={handleShare}
        aria-label={label}
        title={label}
      >
        <i className="fas fa-share-nodes" />
        {showLabel && <span>分享</span>}
      </button>

      <span role="status" aria-live="polite" className="share-status">
        {status}
      </span>

      {manualOpen && (
        <ModalShell
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          labelledBy="share-manual-title"
          panelClassName="glass-panel"
        >
          <h2 id="share-manual-title" className="login-prompt-title">
            复制分享链接
          </h2>
          <p className="login-prompt-desc">
            浏览器未允许自动复制，请手动复制下面的链接。
          </p>
          <input
            ref={(node) => {
              inputRef.current = node;
              if (node) {
                window.setTimeout(() => node.select(), 0);
              }
            }}
            className="share-manual-input"
            value={manualUrl}
            readOnly
            onFocus={(event) => event.target.select()}
          />
          <div className="login-prompt-actions">
            <button
              type="button"
              className="login-prompt-btn login-prompt-btn--ghost"
              onClick={() => setManualOpen(false)}
            >
              关闭
            </button>
            <button
              type="button"
              className="login-prompt-btn login-prompt-btn--primary"
              onClick={copyManual}
            >
              复制链接
            </button>
          </div>
        </ModalShell>

      )}
    </>
  );
}