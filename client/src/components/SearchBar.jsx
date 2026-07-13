import { useState } from 'react';

/**
 * 搜索栏组件
 */
function SearchBar({ value, onChange, onClear, results, onSelect }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleChange = (e) => {
    onChange(e.target.value);
    setShowDropdown(true);
  };

  const handleSelect = (result) => {
    onSelect(result);
    setShowDropdown(false);
    onChange('');
  };

  return (
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder="搜索建筑名称、朝代..."
        value={value}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      <button className="btn-search" onClick={() => setShowDropdown(!showDropdown)}>
        <i className="fas fa-search"></i>
      </button>

      {/* 搜索结果下拉 */}
      {showDropdown && results.length > 0 && (
        <div className="search-dropdown">
          {results.map((r) => (
            <div
              key={r.id}
              className="search-result-item"
              onClick={() => handleSelect(r)}
            >
              <span className="result-name">{r.name}</span>
              <span className="result-meta">{r.category} · {r.dynasty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
