/**
 * 宫殿列表侧边栏组件
 */
function PalaceList({ palaces, selectedId, onSelect }) {
  if (!palaces || palaces.length === 0) {
    return (
      <div className="sidebar-empty">
        <p>暂无数据</p>
      </div>
    );
  }

  return (
    <div className="museum-sidebar">
      <div className="sidebar-title">
        <h3>卷目</h3>
        <span className="sidebar-count">共 {palaces.length} 卷</span>
      </div>
      <div className="sidebar-list">
        {palaces.map((palace, index) => (
          <div
            key={palace.id}
            className={`sidebar-item${selectedId === palace.id ? ' active' : ''}`}
            onClick={() => onSelect(palace)}
          >
            <div className="sidebar-item-info">
              <div className="sidebar-item-name">{palace.name}</div>
              <div className="sidebar-item-meta">{palace.dynasty || '明清'}</div>
              <span className="sidebar-item-tag">{palace.category}</span>
            </div>
            <span className="sidebar-item-order">{String(index + 1).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PalaceList;
