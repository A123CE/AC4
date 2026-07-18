import { useState, useMemo } from 'react';

/**
 * 从 palace 数据中提取仪表盘指标
 */
function extractDashboardData(palace) {
  const stats = [];

  if (palace.built_year) {
    stats.push({ value: palace.built_year, label: '建成年份', icon: 'fa-calendar' });
  }
  if (palace.height) {
    const h = palace.height.replace(/[^0-9.]/g, '');
    if (h) stats.push({ value: h + 'm', label: '建筑高度', icon: 'fa-ruler-vertical' });
  }
  if (palace.area) {
    const a = palace.area.replace(/[^0-9]/g, '');
    if (a) stats.push({ value: a + '㎡', label: '占地面积', icon: 'fa-up-right-and-down-left-from-center' });
  }
  if (palace.style) {
    stats.push({ value: palace.style.length > 6 ? palace.style.slice(0, 6) + '…' : palace.style, label: '建筑风格', icon: 'fa-brush' });
  }

  return stats.slice(0, 4);
}

/**
 * 解析年代用于摘要
 */
function getSummary(palace) {
  if (palace.category === '关隘') {
    return `紫禁城重要门户，${palace.dynasty || '明清'}时期建造`;
  }
  return `${palace.dynasty || '明清皇家'}${palace.category || '建筑'}，庄严宏伟的主体殿宇`;
}

/**
 * 获取相关建筑推荐
 */
function getRelatedPalaces(palace, allPalaces) {
  if (!allPalaces || allPalaces.length <= 1) return [];

  const currentIndex = allPalaces.findIndex(p => p.id === palace.id);
  const related = [];

  // 相邻建筑优先
  if (currentIndex > 0) related.push(allPalaces[currentIndex - 1]);
  if (currentIndex < allPalaces.length - 1) related.push(allPalaces[currentIndex + 1]);

  // 同类型建筑
  const sameCategory = allPalaces.filter(
    p => p.id !== palace.id && p.category === palace.category && !related.find(r => r.id === p.id)
  );
  related.push(...sameCategory.slice(0, 2));

  return related.slice(0, 4);
}

/**
 * 右侧详情面板组件 — 下拉折叠式内容区
 * 所有区块默认展开，点击标题栏折叠/展开，
 * 避免典故等长文字溢出遮挡
 */
function DetailPanel({ palace, palaces = [], onNavigate, loading = false }) {
  // 默认全部展开
  const [collapsed, setCollapsed] = useState({});

  const dashboardData = useMemo(() => extractDashboardData(palace), [palace]);
  const relatedPalaces = useMemo(() => getRelatedPalaces(palace, palaces), [palace, palaces]);

  const toggleSection = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 加载骨架屏
  if (loading) {
    return (
      <div className="museum-detail" aria-busy="true" aria-label="正在加载详情">
        <div className="detail-skeleton">
          <div className="detail-skeleton-header">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="detail-skeleton-section">
              <div className="skeleton-line skeleton-line--heading" />
              <div className="skeleton-line skeleton-line--full" />
              <div className="skeleton-line skeleton-line--full" />
              <div className="skeleton-line skeleton-line--medium" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="museum-detail">
      {/* 面板头部 */}
      <div className="detail-header">
        <h3>
          <i className="fas fa-scroll"></i>
          卷宗详情
        </h3>
        <p className="detail-summary">
          {getSummary(palace)}
        </p>
      </div>

      {/* ====== 折叠式内容区块 ====== */}
      <div className="detail-accordion">
        {/* ---- 简介 ---- */}
        <div className={`detail-accordion-section${collapsed['intro'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('intro')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-book-open"></i>
              <span>简介</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            {/* 数据仪表盘 */}
            {dashboardData.length > 0 && (
              <div className="detail-dashboard">
                {dashboardData.map((stat, i) => (
                  <div key={i} className="detail-stat">
                    <div className="detail-stat-value">{stat.value}</div>
                    <div className="detail-stat-label">
                      <i className={`fas ${stat.icon}`} style={{ marginRight: 4 }}></i>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="detail-description-text">
              {palace.description || '暂无简介'}
            </div>

            {/* 音频导览入口 */}
            {palace.audio_guide && (
              <div className="detail-audio-entry">
                <i className="fas fa-headphones"></i>
                <div>
                  <div className="detail-audio-title">语音讲解</div>
                  <div className="detail-audio-hint">点击播放</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- 信息 ---- */}
        <div className={`detail-accordion-section${collapsed['info'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('info')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-circle-info"></i>
              <span>信息</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            <div className="detail-info-grid">
              <div className="detail-info-row">
                <span className="detail-info-label">名称</span>
                <span className="detail-info-value">{palace.name}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">英文名</span>
                <span className="detail-info-value" style={{ fontStyle: 'italic' }}>
                  {palace.name_en || '-'}
                </span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">年代</span>
                <span className="detail-info-value">{palace.dynasty} · {palace.built_year}年</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">类别</span>
                <span className="detail-info-value">{palace.category}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">地点</span>
                <span className="detail-info-value">北京 · 故宫</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">占地</span>
                <span className="detail-info-value">{palace.area || '-'}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">高度</span>
                <span className="detail-info-value">{palace.height || '-'}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">风格</span>
                <span className="detail-info-value">{palace.style || '-'}</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">历史意义</span>
                <span className="detail-info-value" style={{ maxWidth: '55%', lineHeight: 1.5 }}>
                  {palace.significance || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- 沿革 ---- */}
        <div className={`detail-accordion-section${collapsed['timeline'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('timeline')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-timeline"></i>
              <span>沿革</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            {palace.timeline && palace.timeline.length > 0 ? (
              <div className="detail-timeline">
                {palace.timeline.map((item, i) => (
                  <div key={i} className="detail-timeline-item">
                    <div className="timeline-dot"></div>
                    <span className="timeline-year">{item.year}</span>
                    <span className="timeline-event">{item.event}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty-state">
                <i className="fas fa-clock"></i>
                暂无历史记录
              </div>
            )}
          </div>
        </div>

        {/* ---- 典故 ---- */}
        <div className={`detail-accordion-section${collapsed['facts'] ? ' collapsed' : ''}`}>
          <div
            className="detail-accordion-header"
            onClick={() => toggleSection('facts')}
          >
            <div className="detail-accordion-header-left">
              <i className="fas fa-feather"></i>
              <span>典故</span>
            </div>
            <i className="fas fa-chevron-down detail-accordion-chevron"></i>
          </div>
          <div className="detail-accordion-body">
            {palace.funFacts && palace.funFacts.length > 0 ? (
              <div className="detail-facts">
                {palace.funFacts.map((fact, i) => (
                  <div key={i} className="fact-item">
                    <i className="fas fa-quote-right fact-quote-icon"></i>
                    {fact}
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty-state">
                <i className="fas fa-feather"></i>
                暂无趣味典故
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 相关建筑推荐 */}
      {relatedPalaces.length > 0 && (
        <div className="related-section">
          <h4>相关建筑</h4>
          <div className="related-list">
            {relatedPalaces.map(p => (
              <button
                key={p.id}
                className="related-item"
                onClick={() => onNavigate(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DetailPanel;
