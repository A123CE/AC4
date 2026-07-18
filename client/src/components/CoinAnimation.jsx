import { useState, useEffect, useRef, useCallback } from 'react';
import './CoinAnimation.css';

/**
 * 金币飞行动画组件
 * 从起点沿抛物线飞向终点，显示获得的积分数量
 *
 * Props:
 *  - amount: number — 获得的积分数量
 *  - startPos: { x: number, y: number } — 动画起点（相对于视口）
 *  - targetPos: { x: number, y: number } — 动画终点（积分账户位置）
 *  - onComplete: () => void — 动画完成回调
 */
export default function CoinAnimation({ amount, startPos, targetPos, onComplete }) {
  const [coins, setCoins] = useState([]);
  const [showText, setShowText] = useState(false);
  const idRef = useRef(0);

  const spawn = useCallback(() => {
    if (!amount || amount <= 0) {
      onComplete?.();
      return;
    }
    const coinCount = Math.min(amount, 15); // 最多显示15个金币
    const newCoins = [];
    for (let i = 0; i < coinCount; i++) {
      newCoins.push({
        id: idRef.current++,
        delay: i * 60, // 依次飞出的间隔
        offsetX: (Math.random() - 0.5) * 60, // 随机偏移
        offsetY: (Math.random() - 0.5) * 40,
        scale: 0.6 + Math.random() * 0.8,
        rotation: Math.random() * 720 - 360,
      });
    }
    setCoins(newCoins);

    // 延迟显示+N文字
    setTimeout(() => setShowText(true), 300);

    // 动画结束后清理
    const maxDelay = coinCount * 60 + 1200;
    setTimeout(() => {
      onComplete?.();
    }, maxDelay);
  }, [amount, onComplete]);

  useEffect(() => {
    spawn();
  }, [spawn]);

  return (
    <div className="coin-animation-container" aria-hidden="true">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="coin-animation-item"
          style={{
            left: startPos?.x || '50%',
            top: startPos?.y || '50%',
            '--target-x': `${(targetPos?.x || window.innerWidth - 80) - (startPos?.x || 0)}px`,
            '--target-y': `${(targetPos?.y || 30) - (startPos?.y || 0)}px`,
            '--offset-x': `${coin.offsetX}px`,
            '--offset-y': `${coin.offsetY}px`,
            '--delay': `${coin.delay}ms`,
            '--scale': coin.scale,
            '--rotation': `${coin.rotation}deg`,
          }}
        >
          <i className="fas fa-coins" />
        </div>
      ))}
      {showText && (
        <div
          className="coin-animation-text"
          style={{
            left: targetPos?.x || window.innerWidth - 80,
            top: targetPos?.y || 30,
          }}
        >
          +{amount}
        </div>
      )}
    </div>
  );
}
