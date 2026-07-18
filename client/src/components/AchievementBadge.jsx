/**
 * 功名榜徽章组件
 * 展示单个成就徽章，含解锁/未解锁状态和进度条
 *
 * Props:
 *  - badge: { id, name, description, icon, is_earned, earned_at?, progress: { current, target, percentage } }
 *  - size: 'small' | 'medium' | 'large' (默认 'medium')
 *  - showProgress: boolean (默认 true)
 */

// 徽章等级边框样式
const TIER_STYLES = {
  bronze: {
    borderColor: '#B87333',
    glow: 'rgba(184, 115, 51, 0.3)',
    bg: 'linear-gradient(135deg, rgba(184,115,51,0.08), rgba(184,115,51,0.02))',
  },
  silver: {
    borderColor: '#A8A9AD',
    glow: 'rgba(168, 169, 173, 0.4)',
    bg: 'linear-gradient(135deg, rgba(168,169,173,0.08), rgba(168,169,173,0.02))',
  },
  gold: {
    borderColor: '#DAA520',
    glow: 'rgba(218, 165, 32, 0.5)',
    bg: 'linear-gradient(135deg, rgba(218,165,32,0.12), rgba(218,165,32,0.04))',
  },
  ruby: {
    borderColor: '#C41E3A',
    glow: 'rgba(196, 30, 58, 0.5)',
    bg: 'linear-gradient(135deg, rgba(196,30,58,0.12), rgba(196,30,58,0.04))',
  },
  dragon: {
    borderColor: '#C8960C',
    glow: 'rgba(200, 150, 12, 0.6)',
    bg: 'linear-gradient(135deg, rgba(200,150,12,0.15), rgba(196,30,58,0.06))',
  },
};

// 根据分值判断等级
function getTier(conditionValue) {
  if (conditionValue >= 100) return 'dragon';
  if (conditionValue >= 60) return 'ruby';
  if (conditionValue >= 30) return 'gold';
  if (conditionValue >= 10) return 'silver';
  return 'bronze';
}

export default function AchievementBadge({ badge, size = 'medium', showProgress = true }) {
  if (!badge) return null;

  const tier = getTier(badge.condition_value || 10);
  const tierStyle = TIER_STYLES[tier];

  const sizeMap = { small: 'achv-sm', medium: 'achv-md', large: 'achv-lg' };

  const earnedDate = badge.earned_at
    ? new Date(badge.earned_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className={`achievement-badge ${sizeMap[size] || 'achv-md'} ${badge.is_earned ? 'earned' : 'locked'}`}
      style={{
        '--achv-border': badge.is_earned ? tierStyle.borderColor : '#888',
        '--achv-glow': badge.is_earned ? tierStyle.glow : 'rgba(136,136,136,0.1)',
        '--achv-bg': badge.is_earned ? tierStyle.bg : 'linear-gradient(135deg, rgba(136,136,136,0.04), rgba(136,136,136,0.01))',
      }}
    >
      <div className="achv-icon-wrap">
        <div className="achv-icon-ring">
          <i className={`fas ${badge.icon || 'fa-award'} ${badge.is_earned ? '' : 'locked'}`} />
        </div>
        {badge.is_earned && (
          <div className="achv-earned-glow" />
        )}
      </div>

      <div className="achv-info">
        <div className="achv-name">{badge.name}</div>
        <div className="achv-desc">{badge.description}</div>
        {badge.is_earned && earnedDate && (
          <div className="achv-date">获得于 {earnedDate}</div>
        )}
        {!badge.is_earned && showProgress && badge.progress && (
          <div className="achv-progress">
            <div className="achv-progress-bar">
              <div
                className="achv-progress-fill"
                style={{ width: `${badge.progress.percentage}%` }}
              />
            </div>
            <span className="achv-progress-text">
              {badge.progress.current}/{badge.progress.target}
            </span>
          </div>
        )}
      </div>

      {badge.is_earned && (
        <div className="achv-check">
          <i className="fas fa-check-circle" />
        </div>
      )}
    </div>
  );
}
