import { useState, useEffect } from 'react';

/**
 * 故宫特色加载动画 — 宫门缓缓开启
 * 在应用首次加载时显示，3D资源准备好后自动消失
 */
function LoadingScreen() {
  const [phase, setPhase] = useState('closed'); // closed -> opening -> open -> fadeOut
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 阶段1: 大门保持关闭 0.6s
    const t1 = setTimeout(() => setPhase('opening'), 600);
    // 阶段2: 大门开启动画 1.2s 后完全打开
    const t2 = setTimeout(() => setPhase('open'), 1800);
    // 阶段3: 保持打开 0.5s 后淡出
    const t3 = setTimeout(() => {
      setPhase('fadeOut');
      // 完全移除
      setTimeout(() => setVisible(false), 800);
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (!visible) return null;

  const isOpen = phase === 'opening' || phase === 'open' || phase === 'fadeOut';

  return (
    <div className={`loading-screen${phase === 'fadeOut' ? ' fade-out' : ''}`}>
      <div className={`loading-gate${isOpen ? ' open' : ''}`}>
        {/* 左扇门 */}
        <div className="loading-gate-door left">
          {/* 门钉 — 3行3列 */}
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <div
                key={`left-${row}-${col}`}
                className="loading-gate-stud"
                style={{
                  top: `${20 + row * 45}px`,
                  right: `${10 + col * 16}px`,
                }}
              />
            ))
          )}
          {/* 门环 */}
          <div
            className="loading-gate-ring"
            style={{ top: '70px', right: '8px' }}
          />
        </div>

        {/* 右扇门 */}
        <div className="loading-gate-door right">
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <div
                key={`right-${row}-${col}`}
                className="loading-gate-stud"
                style={{
                  top: `${20 + row * 45}px`,
                  left: `${10 + col * 16}px`,
                }}
              />
            ))
          )}
          <div
            className="loading-gate-ring"
            style={{ top: '70px', left: '8px' }}
          />
        </div>

        {/* 门后光芒 */}
        <div className="loading-glow" />
      </div>

      <div className="loading-text">
        {phase === 'closed' && '正在准备...'}
        {(phase === 'opening' || phase === 'open') && '正在加载模型资源...'}
        {phase === 'fadeOut' && '即将就绪'}
      </div>
    </div>
  );
}

export default LoadingScreen;
