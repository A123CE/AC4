import { useEffect, useState } from 'react';
import ModalShell from './ModalShell';

export const COLLECTION_CATEGORIES = ['默认', '想去', '已研究', '教学素材'];

/**
 * 收藏分类与笔记弹层
 */
export default function CollectionDialog({
  open,
  initialCategory = '默认',
  initialNote = '',
  onClose,
  onSave,
}) {
  const [category, setCategory] = useState(initialCategory);
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory(initialCategory || '默认');
    setNote(initialNote || '');
  }, [open, initialCategory, initialNote]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({ category, note });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy="collection-dialog-title"
      panelClassName="glass-panel"
    >
      <h2 id="collection-dialog-title" className="collection-dialog-title">
        收藏到珍宝阁
      </h2>
      <p className="collection-dialog-desc">
        分类便于在个人中心筛选，笔记默认仅自己可见。
      </p>

      <div className="collection-cats" role="group" aria-label="收藏分类">
        {COLLECTION_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`collection-cat${category === item ? ' active' : ''}`}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="collection-note-label" htmlFor="collection-note">
        笔记
      </label>
      <textarea
        id="collection-note"
        className="collection-note"
        value={note}
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
        placeholder="写下令你印象最深的一处细节…"
      />
      <div className="collection-note-count">{note.length}/500</div>

      <div className="collection-dialog-actions">
        <button
          type="button"
          className="login-prompt-btn login-prompt-btn--ghost"
          onClick={onClose}
        >
          取消
        </button>
        <button
          type="button"
          className="login-prompt-btn login-prompt-btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中…' : '保存收藏'}
        </button>
      </div>
    </ModalShell>
  );
}