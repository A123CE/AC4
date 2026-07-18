import { useState, useRef, useEffect } from 'react';

/**
 * 搜索栏组件 — 磨砂玻璃效果
 * 输入时展示热门搜索和历史推荐
 */
function SearchBar({ value, onChange, onClear, results, onSelect, palaces = [] }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
    setShowDropdown(true);
  };

  const handleSelect = (result) => {
    onSelect(result);
    setShowDropdown(false);
  };

  const handleFocus = () => {
    setFocused(true);
    setShowDropdown(true);
  };

  // 热门推荐 — 取前5个宫殿
  const hotRecommendations = palaces.slice(0, 5);

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrap">
        <input
          type="text"
          className="search-input"
          placeholder={focused ? '输入建筑名称、朝代、关键词...' : '搜索建筑名称、朝代...'}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => { setFocused(false); setShowDropdown(false); }, 200)}
        />
        <i className="fas fa-search search-icon"></i>
      </div>

      {/* 搜索下拉 */}
      {showDropdown && (
        <div className="search-dropdown">
          {value && value.trim().length > 0 && results.length > 0 && (
            <>
              <div className="search-dropdown-header">搜索结果</div>
              {results.map((r) => (
                <div
                  key={r.id}
                  className="search-result-item"
                  onMouseDown={() => handleSelect(r)}
                >
                  <span className="result-name">
                    {highlightMatch(r.name, value)}
                  </span>
                  <span className="result-meta">{r.category} · {r.dynasty}</span>
                </div>
              ))}
            </>
          )}

          {value && value.trim().length > 0 && results.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
              未找到匹配的建筑
            </div>
          )}

          {(!value || value.trim().length === 0) && (
            <>
              <div className="search-dropdown-header">热门建筑</div>
              {hotRecommendations.map((r) => (
                <div
                  key={r.id}
                  className="search-result-item"
                  onMouseDown={() => handleSelect(r)}
                >
                  <span className="result-name">{r.name}</span>
                  <span className="result-meta">{r.category} · {r.dynasty}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 在文本中高亮匹配关键词
 */
function highlightMatch(text, query) {
  if (!query || query.trim().length === 0) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
}

export default SearchBar;
