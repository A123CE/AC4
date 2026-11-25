/**
 * 卡片页内放大预览（T-DECK-05 / T-DECK-06）
 *
 * 契约：
 * - 通过 createPortal 挂到 document.body，role="dialog" + aria-modal
 * - Esc（document capture 阶段）优先关闭，阻止页面级 Esc
 * - 遮罩 / 关闭按钮 / Esc 三路关闭，均回调 onClose(reason)
 * - 上/下一张循环切换（44×44），边界由父级 aria-live 播报
 * - 图片 object-fit: contain；缺失或加载失败用站内占位（禁止外链兜底）
 */
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function CardPreviewOverlay({
  open = false,
  entries = [],
  index = 0,
  onStep,
  onClose,
  onRequestArticle,
  reducedMotion = false,
  t = (key, fallback) => fallback ?? key,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const swipeRef = useRef(null);
  const [imageFailed, setImageFailed] = useState(false);

  const total = entries.length;
  const safeIndex = total ? ((index % total) + total) % total : 0;
  const entry = entries[safeIndex] ?? null;

  useEffect(() => {
    setImageFailed(false);
  }, [entry?.id]);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus?.({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose?.('escape');
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        onStep?.(event.key === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose, onStep]);

  if (!open || !entry) return null;

  const meta = [
    entry.category ? [t('encyclopedia.card.meta.category', '类目'), entry.category] : null,
    entry.dynasty ? [t('encyclopedia.card.meta.dynasty', '朝代'), entry.dynasty] : null,
    entry.region ? [t('encyclopedia.card.meta.region', '地区'), entry.region] : null,
    [
      t('encyclopedia.card.meta.type', '类型'),
      entry.entryType === 'building'
        ? t('encyclopedia.card.type.building', '建筑专属')
        : t('encyclopedia.card.type.craft', '通用术语'),
    ],
  ].filter(Boolean);

  const showImage = Boolean(entry.imagePath) && !imageFailed;

  return createPortal(
    <div
      className="enc-preview-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.('scrim');
      }}
    >
      <div
        ref={dialogRef}
        className="enc-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
      >
        <header className="enc-preview-head">
          <h2 id={titleId} className="enc-preview-title">
            {entry.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="enc-preview-close"
            aria-label={t('encyclopedia.card.previewClose', '关闭预览')}
            onClick={() => onClose?.('closeButton')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div
          className="enc-preview-body"
          onTouchStart={(event) => {
            const touch = event.touches?.[0];
            if (!touch) return;
            swipeRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const start = swipeRef.current;
            const touch = event.changedTouches?.[0];
            swipeRef.current = null;
            if (!start || !touch) return;
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
              onStep?.(dx < 0 ? 1 : -1);
            }
          }}
        >
          <div className="enc-preview-art">
            {showImage ? (
              <img
                src={entry.imagePath}
                alt=""
                onError={() => setImageFailed(true)}
                draggable={false}
              />
            ) : (
              <span className="enc-preview-art-mark" aria-hidden="true">
                <span className="enc-preview-art-seal">{(entry.category || '词').slice(0, 1)}</span>
                <span className="enc-preview-art-label">
                  {entry.category || t('encyclopedia.card.previewFallback', '站内示意图')}
                </span>
              </span>
            )}
          </div>
          <div className="enc-preview-info">
            <p className="enc-preview-synopsis">{entry.synopsis || entry.category}</p>
            <ul className="enc-preview-meta">
              {meta.map(([label, value]) => (
                <li key={label}>
                  <span className="enc-preview-meta-label">{label}</span>
                  <span className="enc-preview-meta-value">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="enc-preview-foot">
          <div className="enc-preview-nav">
            <button
              type="button"
              className="enc-preview-btn"
              aria-label={t('encyclopedia.card.previewPrev', '上一张')}
              onClick={() => onStep?.(-1)}
            >
              {t('encyclopedia.card.previewPrev', '上一张')}
            </button>
            <span className="enc-preview-position" aria-live="polite">
              {safeIndex + 1} / {total}
            </span>
            <button
              type="button"
              className="enc-preview-btn"
              aria-label={t('encyclopedia.card.previewNext', '下一张')}
              onClick={() => onStep?.(1)}
            >
              {t('encyclopedia.card.previewNext', '下一张')}
            </button>
          </div>
          {onRequestArticle && (
            <div className="enc-preview-actions">
              <button
                type="button"
                className="enc-preview-btn enc-preview-btn--primary"
                onClick={() => onRequestArticle(entry.id)}
              >
                {t('encyclopedia.card.previewArticle', '查看完整词条')}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}