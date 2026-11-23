import { RoofArt, DougongArt, DragonArt, PlanArt } from './EncyclopediaArt';

/**
 * 营造导引看板 — 详情区未选中词条时的首屏
 * 四条导引连成一条索引带，点击进入对应分类并展开首条词条。
 */
const GUIDES = [
  {
    key: '屋顶',
    title: '屋顶等级',
    desc: '了解古代屋顶形制与等级礼制',
    Art: RoofArt,
  },
  {
    key: '斗拱',
    title: '斗拱结构',
    desc: '认识斗拱的构造原理与力学作用',
    Art: DougongArt,
  },
  {
    key: '彩画',
    title: '彩画纹样',
    desc: '解读故宫彩画纹样寓意与等级',
    Art: DragonArt,
  },
  {
    key: '建筑规制',
    title: '建筑规制',
    desc: '学习古代王城规划制度',
    Art: PlanArt,
  },
];

export default function EncyclopediaGuide({ onPick, availableKeys = [] }) {
  return (
    <section className="enc-guide">
      {/* 淡斗拱底纹 — 低透明度, 只做氛围不抢主体 */}
      <div className="enc-guide-watermark" aria-hidden="true">
        <DougongArt />
      </div>
      <div className="enc-guide-watermark enc-guide-watermark--low" aria-hidden="true">
        <DougongArt />
      </div>

      <div className="enc-guide-inner">
        <header className="enc-guide-head">
          <h2 className="enc-guide-heading">营造导引</h2>
          <p className="enc-guide-hint">左侧选择一个条目，查看详细的古建筑知识</p>
        </header>

        <div className="enc-guide-grid">
          {GUIDES.map(({ key, title, desc, Art }) => {
            const disabled = availableKeys.length > 0 && !availableKeys.includes(key);
            return (
              <button
                key={key}
                type="button"
                className="enc-guide-card"
                disabled={disabled}
                onClick={() => onPick?.(key)}
              >
                <span className="enc-guide-art">
                  <Art thumb />
                </span>
                <span className="enc-guide-title">{title}</span>
                <span className="enc-guide-desc">{desc}</span>
              </button>
            );
          })}
        </div>

        <div className="enc-guide-flow" aria-label="使用顺序">
          <span>选择条目</span>
          <i aria-hidden="true">—</i>
          <span>读图解</span>
          <i aria-hidden="true">—</i>
          <span>进三维</span>
        </div>

        <footer className="enc-guide-foot">
          点击卡片进入对应分类，或从左侧列表直接选择词条
        </footer>
      </div>
    </section>
  );
}
