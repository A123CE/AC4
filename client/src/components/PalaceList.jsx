import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * 宫殿分组定义 — 按故宫中轴线区域
 */
const PALACE_GROUPS = [
  {
    key: 'outer-court',
    label: '外朝 · 前朝',
    icon: 'fa-crown',
    ids: ['wumen', 'taihemen', 'taihedian', 'zhonghedian', 'baohedian'],
  },
  {
    key: 'inner-court',
    label: '内廷 · 后宫',
    icon: 'fa-building-columns',
    ids: ['qianqingmen', 'qianqinggong', 'jiaotaidian', 'kunninggong', 'shenwumen'],
  },
];

/**
 * 建筑图标映射 — 使用 Font Awesome 图标代表建筑类型
 */
function getPalaceIcon(palace) {
  if (palace.category === '关隘') return 'fa-archway';
  return 'fa-gopuram';
}

/**
 * 宫殿列表侧边栏组件 — Line Sidebar 丝线串联设计 + 分组折叠 v2
 * 核心视觉：左侧一条纵贯的"朱丝线"，串联起每卷条目，
 * 选中/悬停时线条产生流动动画，如墨迹在宣纸上晕染
 * 新增：键盘导航 (Enter 选择)、无障碍 aria 标签、丝线动画细化
 */
function PalaceList({ palaces, selectedId, onSelect }) {
  // 默认展开所有分组
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // 将所有条目展开为带 groupKey 的平面数组，支持键盘导航
  const flatItems = useMemo(() => {
    const items = [];
    const grouped = {};
    PALACE_GROUPS.forEach(g => {
      const members = g.ids.map(id => palaces.find(p => p.id === id)).filter(Boolean);
      if (members.length > 0) grouped[g.key] = { ...g, members };
    });
    // 未分组
    const assigned = new Set(Object.values(grouped).flatMap(g => g.members.map(m => m.id)));
    const unassigned = palaces.filter(p => !assigned.has(p.id));
    if (unassigned.length > 0) {
      grouped['other'] = { key: 'other', label: '其他建筑', icon: 'fa-map-pin', members: unassigned };
    }
    Object.values(grouped).forEach(g => {
      g.members.forEach(p => items.push({ ...p, _groupKey: g.key, _groupLabel: g.label }));
    });
    return items;
  }, [palaces]);

  // 键盘导航
  const handleKeyDown = useCallback((e, palace) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(palace);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    }
  }, [onSelect, flatItems.length]);

  // 当 focusIndex 改变时聚焦对应元素
  useEffect(() => {
    if (focusedIndex >= 0) {
      const el = document.querySelector(`[data-palace-index="${focusedIndex}"]`);
      el?.focus();
    }
  }, [focusedIndex]);

  if (!palaces || palaces.length === 0) {
    return (
      <div className="sidebar-empty">
        <i className="fas fa-scroll" style={{ fontSize: '2rem', opacity: 0.3, marginBottom: 12, display: 'block' }}></i>
        <p>暂无数据</p>
      </div>
    );
  }

  const toggleGroup = (key) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 按分组整理宫殿
  const unassignedIds = new Set(palaces.map(p => p.id));
  const groupedPalaces = PALACE_GROUPS.map(group => {
    const members = group.ids
      .map(id => palaces.find(p => p.id === id))
      .filter(Boolean);
    members.forEach(p => unassignedIds.delete(p.id));
    return { ...group, members };
  });

  // 未分组的宫殿
  const unassigned = palaces.filter(p => unassignedIds.has(p.id));

  return (
    <div className="museum-sidebar">
      <div className="sidebar-title">
        <h3>卷目</h3>
        <span className="sidebar-count">共 {palaces.length} 卷</span>
      </div>

      {/* 分组列表 */}
      {groupedPalaces.map((group) => {
        if (group.members.length === 0) return null;
        const isCollapsed = collapsedGroups[group.key] || false;

        return (
          <div key={group.key} className="sidebar-group">
            <div
              className={`sidebar-group-header${isCollapsed ? ' collapsed' : ''}`}
              onClick={() => toggleGroup(group.key)}
              role="button"
              tabIndex={0}
              aria-expanded={!isCollapsed}
              aria-label={`${group.label} (${group.members.length})`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleGroup(group.key);
                }
              }}
            >
              <i className={`fas ${group.icon}`}></i>
              <span>{group.label}</span>
              <span className="sidebar-group-count">({group.members.length})</span>
              <i className="fas fa-chevron-down sidebar-group-chevron"></i>
            </div>
            <div
              className={`sidebar-group-items${isCollapsed ? ' collapsed' : ''}`}
              style={{ maxHeight: isCollapsed ? 0 : `${group.members.length * 68}px` }}
            >
              {/* Line Sidebar: 每项通过丝线串联 */}
              <div className="sidebar-list sidebar-list--lined">
                {group.members.map((palace, idx) => {
                  const isActive = selectedId === palace.id;
                  const isLast = idx === group.members.length - 1;
                  return (
                    <div
                      key={palace.id}
                      className={`sidebar-item sidebar-item--lined${isActive ? ' active' : ''}${isLast ? ' last' : ''}`}
                      onClick={() => onSelect(palace)}
                      tabIndex={0}
                      role="option"
                      aria-selected={isActive}
                      aria-label={`${palace.name} — ${palace.dynasty || '明清'} · ${palace.category}`}
                      data-palace-index={flatItems.findIndex(fi => fi.id === palace.id)}
                      onKeyDown={(e) => handleKeyDown(e, palace)}
                    >
                      {/* 丝线节点 */}
                      <div className="sidebar-line-node">
                        <div className="sidebar-line-dot"></div>
                        {!isLast && <div className="sidebar-line-connector"></div>}
                      </div>
                      {/* 缩略图 */}
                      <div className="sidebar-item-thumb">
                        <i className={`fas ${getPalaceIcon(palace)}`}></i>
                      </div>
                      <div className="sidebar-item-info">
                        <div className="sidebar-item-name">{palace.name}</div>
                        <div className="sidebar-item-meta">
                          {palace.dynasty || '明清'}{palace.built_year ? ` · ${palace.built_year}` : ''}
                        </div>
                        <span className="sidebar-item-tag">{palace.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* 未分组的宫殿 */}
      {unassigned.length > 0 && (
        <div className="sidebar-group">
          <div
            className="sidebar-group-header"
            onClick={() => toggleGroup('other')}
          >
            <i className="fas fa-map-pin"></i>
            <span>其他建筑</span>
            <span className="sidebar-group-count">({unassigned.length})</span>
            <i className={`fas fa-chevron-down sidebar-group-chevron${collapsedGroups['other'] ? ' collapsed-icon' : ''}`}></i>
          </div>
          <div
            className={`sidebar-group-items${collapsedGroups['other'] ? ' collapsed' : ''}`}
            style={{ maxHeight: collapsedGroups['other'] ? 0 : `${unassigned.length * 68}px` }}
          >
            <div className="sidebar-list sidebar-list--lined">
              {unassigned.map((palace, idx) => {
                const isActive = selectedId === palace.id;
                const isLast = idx === unassigned.length - 1;
                return (
                  <div
                    key={palace.id}
                    className={`sidebar-item sidebar-item--lined${isActive ? ' active' : ''}${isLast ? ' last' : ''}`}
                    onClick={() => onSelect(palace)}
                  >
                    {/* 丝线节点 */}
                    <div className="sidebar-line-node">
                      <div className="sidebar-line-dot"></div>
                      {!isLast && <div className="sidebar-line-connector"></div>}
                    </div>
                    <div className="sidebar-item-thumb">
                      <i className={`fas ${getPalaceIcon(palace)}`}></i>
                    </div>
                    <div className="sidebar-item-info">
                      <div className="sidebar-item-name">{palace.name}</div>
                      <div className="sidebar-item-meta">
                        {palace.dynasty || '明清'}{palace.built_year ? ` · ${palace.built_year}` : ''}
                      </div>
                      <span className="sidebar-item-tag">{palace.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PalaceList;
