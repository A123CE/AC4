import { useEffect } from 'react';
import { track } from '../lib/analytics';

/**
 * 3D 不可用时的图文兜底
 * reason: quota | no-webgl | load-timeout | missing-lite | context-lost
 */
const REASON_TEXT = {
  quota: '今日 3D 试看额度已用完，图文档案仍可浏览',
  'no-webgl': '当前设备不支持 3D 渲染，已切换为图文模式',
  'load-timeout': '模型加载超时，可先查看图文或重试',
  'missing-lite': '当前设备暂无轻量模型，已切换为图文模式',
  'context-lost': '3D 渲染上下文已丢失，请重试',
};

export default function PosterFallback({
  palace,
  reason = 'quota',
  onRetry,
  onOpenDetail,
  onLogin,
  onDismiss,
}) {
  const poster = palace?.poster_path ? `/images/${palace.poster_path}` : null;

  useEffect(() => {
    if (reason && reason !== 'quota') {
      track('tier_fallback', { reason });
    }
  }, [reason]);

  return (
    <div className="poster-fallback">
      {poster ? (
        <img className="poster-fallback-image" src={poster} alt={palace?.name || '建筑海报'} loading="lazy" />
      ) : (
        <div className="poster-fallback-image poster-fallback-image--placeholder">
          <i className="fas fa-landmark" />
        </div>
      )}

      <div className="poster-fallback-body">
        <h3>{palace?.name || '建筑档案'}</h3>
        <p>{REASON_TEXT[reason] || REASON_TEXT.quota}</p>

        <div className="poster-fallback-actions">
          {onDismiss && (
            <button type="button" className="hall-quota-btn ghost" onClick={onDismiss}>
              暂不
            </button>
          )}
          {onOpenDetail && (
            <button type="button" className="hall-quota-btn" onClick={onOpenDetail}>
              查看图文详情
            </button>
          )}
          {onRetry && (
            <button type="button" className="hall-quota-btn" onClick={onRetry}>
              尝试 3D
            </button>
          )}
          {onLogin && (
            <button type="button" className="hall-quota-btn primary" onClick={onLogin}>
              注册 / 登录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}