import { useState } from 'react';

/**
 * 右侧详情面板组件
 */
function DetailPanel({ palace }) {
  const [activeTab, setActiveTab] = useState('intro');

  return (
    <div className="museum-detail">
      <div className="detail-title">
        <h3><i className="fas fa-scroll"></i> 卷宗详情</h3>
      </div>

      {/* 标签切换 */}
      <div className="detail-tabs">
        {['intro', 'info', 'timeline', 'facts'].map((tab) => (
          <button
            key={tab}
            className={`detail-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'intro' && '简介'}
            {tab === 'info' && '信息'}
            {tab === 'timeline' && '沿革'}
            {tab === 'facts' && '典故'}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="detail-content">
        {activeTab === 'intro' && (
          <div className="detail-section">
            <p className="detail-description-text">{palace.description || '暂无简介'}</p>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="detail-section">
            <div className="detail-info-grid">
              <div className="detail-info-row">
                <span className="detail-info-label">年代</span>
                <span className="detail-info-value">{palace.dynasty} · {palace.built_year}年</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">地点</span>
                <span className="detail-info-value">北京</span>
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
                <span className="detail-info-label">意义</span>
                <span className="detail-info-value">{palace.significance || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && palace.timeline && palace.timeline.length > 0 ? (
          <div className="detail-section">
            <div className="detail-timeline">
              {palace.timeline.map((item, i) => (
                <div key={i} className="detail-timeline-item">
                  <div className="timeline-dot"></div>
                  <span className="timeline-year">{item.year}</span>
                  <span className="timeline-event">{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'timeline' && (
          <p style={{ fontSize: 12, color: '#999', padding: 10 }}>暂无历史记录</p>
        )}

        {activeTab === 'facts' && palace.funFacts && palace.funFacts.length > 0 ? (
          <div className="detail-section">
            <div className="detail-facts">
              {palace.funFacts.map((fact, i) => (
                <div key={i} className="fact-item">{fact}</div>
              ))}
            </div>
          </div>
        ) : activeTab === 'facts' && (
          <p style={{ fontSize: 12, color: '#999', padding: 10 }}>暂无趣味典故</p>
        )}
      </div>
    </div>
  );
}

export default DetailPanel;
