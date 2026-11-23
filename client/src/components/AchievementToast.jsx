import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalShell from './ModalShell';
import { onAchievements } from '../lib/achievementBus';
import { track } from '../lib/analytics';
import { useClassroomView } from '../context/ClassroomViewContext';

const MERGE_WINDOW_MS = 150;

/**
 * 成就结算弹层
 * - 150ms 内的多条成就合并为一层
 * - 同一会话同一徽章不重复弹
 * - prefers-reduced-motion 下无动画
 */
export default function AchievementToast() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState({ stamps: [], badges: [] });
  const seenBadgesRef = useRef(new Set());
  const pendingRef = useRef({ stamps: [], badges: [] });
  const { hidden } = useClassroomView();
  const timerRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (event) => setReduceMotion(event.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    return onAchievements((detail) => {
      const badges = (detail.badges || []).filter(
        (badge) => badge?.id && !seenBadgesRef.current.has(badge.id)
      );
      const stamps = (detail.stamps || []).filter((stamp) => stamp?.palace_id);

      if (badges.length === 0 && stamps.length === 0) return;

      pendingRef.current = {
        stamps: [...pendingRef.current.stamps, ...stamps],
        badges: [...pendingRef.current.badges, ...badges],
      };

      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const merged = pendingRef.current;
        pendingRef.current = { stamps: [], badges: [] };
        merged.badges.forEach((badge) => seenBadgesRef.current.add(badge.id));
        merged.stamps.forEach((stamp) =>
          track('stamp_earned', {
            entity_type: 'palace',
            entity_id: stamp.palace_id,
          })
        );
        merged.badges.forEach((badge) =>
          track('badge_earned', {
            entity_type: 'badge',
            entity_id: String(badge.id),
          })
        );
        setPayload(merged);
        setOpen(true);
      }, MERGE_WINDOW_MS);
    });
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleClose = () => setOpen(false);

  const goProfile = () => {
    setOpen(false);
    navigate('/profile');
  };

  const hasContent = payload.stamps.length > 0 || payload.badges.length > 0;

  if (hidden.achievementToast) return null;

  return (
    <ModalShell
      open={open && hasContent}
      onClose={handleClose}
      labelledBy="achievement-toast-title"
      panelClassName="glass-panel"
    >
      <div
        className={`achievement-toast${reduceMotion ? ' achievement-toast--reduce-motion' : ''}`}
        role="status"
        aria-live="polite"
      >
        <h2 id="achievement-toast-title" className="achievement-toast-title">
          <i className="fas fa-sparkles" /> 新成就解锁
        </h2>

        {payload.stamps.length > 0 && (
          <div className="achievement-toast-stamps">
            {payload.stamps.map((stamp, index) => (
              <span
                key={`${stamp.palace_id}-${index}`}
                className="achievement-toast-stamp"
                title={`集章：${stamp.chinese_seal_text || stamp.palace_name}`}
              >
                <i className="fas fa-stamp" />
                {stamp.chinese_seal_text || stamp.palace_name}
              </span>
            ))}
          </div>
        )}

        {payload.badges.length > 0 && (
          <div className="achievement-toast-badges">
            {payload.badges.map((badge, index) => (
              <div className="achievement-toast-badge" key={badge.id || index}>
                <span className="achievement-toast-badge-icon">
                  <i className={`fas ${badge.icon || 'fa-award'}`} />
                </span>
                <span className="achievement-toast-badge-body">
                  <strong>{badge.name}</strong>
                  <span>{badge.description}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="achievement-toast-next">
          <i className="fas fa-compass" /> 下一步：继续探索建筑，解锁更多集章与徽章。
        </p>

        <div className="achievement-toast-actions">
          <button
            type="button"
            className="login-prompt-btn login-prompt-btn--ghost"
            onClick={handleClose}
          >
            知道了
          </button>
          <button
            type="button"
            className="login-prompt-btn login-prompt-btn--primary"
            onClick={goProfile}
          >
            去成就页
          </button>
        </div>
      </div>
    </ModalShell>
  );
}