import { useState, useEffect } from 'react';
import { dailySignin, getSigninStatus } from '../api';
import { useAuth } from '../context/AuthContext';

/**
 * 签到按钮组件
 * 展示签到日历卡，支持每日签到
 */
export default function SigninButton() {
  const { user, refreshAuth } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await getSigninStatus();
      setStatus(res.data.data);
    } catch {
      // 静默失败
    }
  };

  const handleSignin = async () => {
    if (loading || status?.signed_today) return;
    setLoading(true);
    try {
      const res = await dailySignin();
      if (res.data.success) {
        setAnimating(true);
        setStatus(prev => ({
          ...prev,
          signed_today: true,
          consecutive_days: res.data.data.consecutive_days,
        }));
        refreshAuth?.();
        setTimeout(() => setAnimating(false), 1500);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  const getConsecutiveLabel = (days) => {
    if (days >= 30) return '🔥 满月';
    if (days >= 7) return '⭐ 一周';
    if (days >= 3) return '💪 三日';
    return '🆕 首日';
  };

  // 生成本月日历
  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const signedDates = new Set(status?.month_dates || []);

    const weeks = [];
    let week = [];

    for (let i = 0; i < firstDay; i++) {
      week.push(<div key={`empty-${i}`} className="signin-cal-day empty" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = d === now.getDate();
      const isSigned = signedDates.has(dateStr);

      week.push(
        <div
          key={d}
          className={`signin-cal-day ${isToday ? 'today' : ''} ${isSigned ? 'signed' : ''}`}
        >
          <span>{d}</span>
          {isSigned && <i className="fas fa-check" />}
        </div>
      );

      if (week.length === 7) {
        weeks.push(<div key={`w-${weeks.length}`} className="signin-cal-week">{week}</div>);
        week = [];
      }
    }
    if (week.length > 0) {
      weeks.push(<div key={`w-${weeks.length}`} className="signin-cal-week">{week}</div>);
    }

    return weeks;
  };

  return (
    <div className="signin-container">
      <button
        className={`signin-btn ${status?.signed_today ? 'signed' : ''} ${animating ? 'animating' : ''}`}
        onClick={() => status?.signed_today ? setShowCalendar(!showCalendar) : handleSignin()}
        disabled={loading}
      >
        <i className={`fas ${status?.signed_today ? 'fa-calendar-check' : 'fa-gift'}`} />
        <span>{status?.signed_today ? '已签到' : '每日签到'}</span>
        {status?.consecutive_days > 0 && (
          <span className="signin-consecutive">{getConsecutiveLabel(status.consecutive_days)}</span>
        )}
      </button>

      {animating && (
        <div className="signin-toast">
          <i className="fas fa-coins" /> 签到成功！+10赏银
        </div>
      )}

      {showCalendar && (
        <div className="signin-calendar">
          <div className="signin-cal-header">
            <h4>
              {new Date().getFullYear()}年{new Date().getMonth() + 1}月
            </h4>
            <span className="signin-cal-stats">
              本月签到 {status?.month_count || 0} 天
            </span>
          </div>
          <div className="signin-cal-weekdays">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>
          {renderCalendar()}
        </div>
      )}
    </div>
  );
}
