import { RoofArt, DougongArt, DragonArt, PlanArt } from './EncyclopediaArt';

/**
 * 营造导引看板 — 详情区未选中词条时的首屏
 * 4 张卡由 taxonomy.categories 按 count 生成；无数据时回退通用文案。
 */
const ART_BY_KEY = {
  名筑档案: PlanArt,
  屋顶: RoofArt,
  斗拱: DougongArt,
  彩画: DragonArt,
  纹饰: DragonArt,
  建筑规制: PlanArt,
};

const HINTS = {
  名筑档案: '读懂每座建筑的独有做法与沿革',
  屋顶: '从庑殿到攒尖的等级秩序',
  斗拱: '构造原理与力学作用',
  彩画: '纹样寓意与用色等级',
  纹饰: '纹样题材与装饰规律',
  建筑规制: '古代城市规划与礼制布局',
  建筑装饰: '装饰构件与空间氛围',
  琉璃: '琉璃瓦与构件的等级与工艺',
  脊兽: '屋脊上的走兽与仙人',
  台基: '台基制度与须弥座',
  柱础: '柱础形制与防潮做法',
  门窗: '宫门与门窗的等级制式',
};

const FALLBACK = [
  { key: '名筑档案', title: '名筑档案', desc: '读懂每座建筑的独有做法', Art: PlanArt },
  { key: '屋顶', title: '屋顶等级', desc: '从庑殿到攒尖的等级秩序', Art: RoofArt },
  { key: '斗拱', title: '斗拱结构', desc: '构造原理与力学作用', Art: DougongArt },
  { key: '建筑规制', title: '建筑规制', desc: '古代城市规划与礼制布局', Art: PlanArt },
];

function cardFromCategory(category) {
  const key = category.key || category.category;
  const label = category.label || key;
  return {
    key,
    title: key === '名筑档案' ? '名筑档案' : label,
    desc: HINTS[key] || `从${label}开始认识古建筑`,
    Art: ART_BY_KEY[key] || PlanArt,
  };
}

export default function EncyclopediaGuide({
  onPick,
  availableKeys = [],
  categories = [],
  heading,
  hint,
  flow,
  foot,
  cardDesc,
  cardTitle,
}) {
  const cards = (() => {
    const usable = (categories || []).filter((item) => {
      const key = item.key || item.category;
      return key && key !== 'all';
    });
    if (usable.length === 0) return FALLBACK;

    const sorted = [...usable].sort((a, b) => {
      if ((a.key || a.category) === '名筑档案') return -1;
      if ((b.key || b.category) === '名筑档案') return 1;
      return (Number(b.count) || 0) - (Number(a.count) || 0);
    });

    const picked = [];
    for (const category of sorted) {
      if (picked.length >= 4) break;
      picked.push(cardFromCategory(category));
    }
    return picked;
  })();

  return (
    <section className="enc-guide">
      <div className="enc-guide-watermark" aria-hidden="true">
        <DougongArt />
      </div>
      <div className="enc-guide-watermark enc-guide-watermark--low" aria-hidden="true">
        <DougongArt />
      </div>

      <div className="enc-guide-inner">
        <header className="enc-guide-head">
          <h2 className="enc-guide-heading">{heading ?? '营造导引'}</h2>
          <p className="enc-guide-hint">{hint ?? '从建筑或构件进入，查看对应的古建筑知识'}</p>
        </header>

        <div className="enc-guide-grid">
          {cards.map(({ key, title: defaultTitle, desc: defaultDesc, Art }) => {
            const disabled = availableKeys.length > 0 && !availableKeys.includes(key);
            const title =
              typeof cardTitle === 'function'
                ? cardTitle({ key, title: defaultTitle })
                : cardTitle && typeof cardTitle === 'object'
                  ? cardTitle[key] ?? defaultTitle
                  : defaultTitle;
            const desc =
              typeof cardDesc === 'function'
                ? cardDesc({ key, desc: defaultDesc })
                : typeof cardDesc === 'string'
                  ? cardDesc.replace('{label}', key)
                  : defaultDesc;
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
          <span>{flow?.pick ?? '选择条目'}</span>
          <i aria-hidden="true">—</i>
          <span>{flow?.diagram ?? '读图解'}</span>
          <i aria-hidden="true">—</i>
          <span>{flow?.model ?? '进三维'}</span>
        </div>

        <footer className="enc-guide-foot">
          {foot ?? '点击卡片进入对应分类，或从左侧列表直接选择词条'}
        </footer>
      </div>
    </section>
  );
}