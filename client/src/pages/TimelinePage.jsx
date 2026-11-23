import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getTimeline } from '../api';

/**
 * 历史沿革时间轴页面 — 横向年表，串联所有建筑的历史事件
 */
function TimelinePage() {
  const navigate = useNavigate();
  const [timelineData, setTimelineData] = useState([]);
  const [allPalaces, setAllPalaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDynasty, setActiveDynasty] = useState('all'); // all | 明 | 清 | 现代
  const [activePalace, setActivePalace] = useState('all');
  const scrollRef = useRef(null);

  // 朝代配色
  const DYNASTY_COLORS = {
    '明': { bg: '#8b2500', text: '#ffd700', gradient: 'from-amber-700 to-red-800' },
    '清': { bg: '#003153', text: '#ffd700', gradient: 'from-blue-900 to-indigo-900' },
    '现代': { bg: '#2d5016', text: '#fff', gradient: 'from-green-800 to-emerald-700' },
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 建筑列表用于筛选下拉与「始建」事件；沿革事件由聚合接口一次返回
      const [palacesRes, timelineRes] = await Promise.all([
        axios.get('/api/palaces'),
        getTimeline(),
      ]);

      const palaces = palacesRes.data?.success ? palacesRes.data.data : [];
      setAllPalaces(palaces);

      const mergedEvents = [];
      const timelineEvents = timelineRes.data?.success
        ? timelineRes.data.data?.events || []
        : [];

      timelineEvents.forEach(event => {
        mergedEvents.push({
          palace_id: event.palace_id,
          palace_name: event.palace_name,
          dynasty: event.dynasty,
          category: event.category,
          year: event.year,
          event: event.event,
          type: 'event',
        });
      });

      // 加入「始建」事件
      palaces.forEach(palace => {
        if (palace.built_year) {
          mergedEvents.push({
            palace_id: palace.id,
            palace_name: palace.name,
            dynasty: palace.dynasty,
            category: palace.category,
            year: palace.built_year,
            event: `${palace.name}始建 — ${palace.dynasty}`,
            type: 'built',
          });
        }
      });

      // 按年份排序
      mergedEvents.sort((a, b) => {
        const yearA = parseInt(String(a.year).replace(/[^0-9]/g, ''), 10) || 0;
        const yearB = parseInt(String(b.year).replace(/[^0-9]/g, ''), 10) || 0;
        return yearA - yearB;
      });

      setTimelineData(mergedEvents);
    } catch (err) {
      console.error('加载时间轴数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 筛选
  const filteredEvents = timelineData.filter(e => {
    if (activePalace !== 'all' && e.palace_id !== activePalace) return false;
    if (activeDynasty !== 'all') {
      const year = parseInt(String(e.year).replace(/[^0-9]/g, ''), 10) || 0;
      if (activeDynasty === '明' && (year < 1368 || year > 1644)) return false;
      if (activeDynasty === '清' && (year < 1644 || year > 1912)) return false;
      if (activeDynasty === '现代' && year < 1912) return false;
    }
    return true;
  });

  // 按世纪分组
  const groupByCentury = (events) => {
    const groups = {};
    events.forEach(e => {
      const year = parseInt(String(e.year).replace(/[^0-9]/g, ''), 10) || 0;
      const century = Math.floor(year / 100) * 100;
      const label = century === 0 ? '不详' : `${century}年代`;
      if (!groups[century]) groups[century] = { century, label, events: [] };
      groups[century].events.push(e);
    });
    return Object.values(groups).sort((a, b) => a.century - b.century);
  };

  const centuryGroups = groupByCentury(filteredEvents);

  // 获取朝代标签
  const getDynastyTag = (yearStr) => {
    const year = parseInt(String(yearStr).replace(/[^0-9]/g, ''), 10) || 0;
    if (year >= 1368 && year <= 1644) return '明';
    if (year >= 1644 && year <= 1912) return '清';
    if (year >= 1912) return '现代';
    return null;
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <p>正在整理史册...</p>
      </div>
    );
  }

  return (
    <div className="timeline-page">
      {/* 顶部栏 */}
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" /> 返回宫城
        </button>
        <h1 className="profile-title">
          <i className="fas fa-hourglass-half" /> 历史沿革
        </h1>
        <p className="profile-title-sub">历代营造 · 岁月留痕</p>
      </div>

      {/* 筛选器 */}
      <div className="timeline-filters">
        <div className="timeline-filter-group">
          <span className="timeline-filter-label">朝代筛选：</span>
          {['all', '明', '清', '现代'].map(d => (
            <button
              key={d}
              className={`timeline-filter-chip ${activeDynasty === d ? 'active' : ''}`}
              onClick={() => setActiveDynasty(d)}
            >
              {d === 'all' ? '全部' : d}
            </button>
          ))}
        </div>
        <div className="timeline-filter-group">
          <span className="timeline-filter-label">建筑筛选：</span>
          <select
            className="timeline-filter-select"
            value={activePalace}
            onChange={e => setActivePalace(e.target.value)}
          >
            <option value="all">全部建筑</option>
            {allPalaces.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 时间轴主体 */}
      <div className="timeline-scroll-container" ref={scrollRef}>
        {centuryGroups.length === 0 ? (
          <div className="profile-empty">
            <i className="fas fa-clock" />
            <p>该筛选项下暂无历史记录</p>
          </div>
        ) : (
          <div className="timeline-track">
            {/* 中轴线 */}
            <div className="timeline-axis" />

            {centuryGroups.map((group, gi) => (
              <div key={gi} className="timeline-century-block">
                {/* 世纪标签 */}
                <div className="timeline-century-marker">
                  <span>{group.label}</span>
                </div>

                <div className="timeline-century-events">
                  {group.events.map((event, ei) => {
                    const dynasty = getDynastyTag(event.year);
                    const color = DYNASTY_COLORS[dynasty] || { bg: '#666', text: '#fff' };

                    return (
                      <div
                        key={ei}
                        className={`timeline-event-card ${event.type}`}
                        onClick={() => navigate('/gallery', { state: { selectPalaceId: event.palace_id } })}
                      >
                        {/* 年份标记 */}
                        <div className="timeline-event-year" style={{ borderColor: color.bg }}>
                          <span className="timeline-event-year-text">
                            {event.year.replace(/[^0-9]/g, '') || '?'}
                          </span>
                          {dynasty && (
                            <span
                              className="timeline-event-dynasty-tag"
                              style={{ background: color.bg, color: color.text }}
                            >
                              {dynasty}
                            </span>
                          )}
                        </div>

                        {/* 事件线连接 */}
                        <div className="timeline-event-connector">
                          <div className="timeline-event-dot" style={{ background: color.bg }} />
                        </div>

                        {/* 事件内容 */}
                        <div className="timeline-event-body">
                          <div className="timeline-event-palace">
                            {event.palace_name}
                          </div>
                          <div className="timeline-event-text">{event.event}</div>
                          <div className="timeline-event-hint">
                            点击查看建筑 <i className="fas fa-arrow-right" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelinePage;
