import { useClassroomView } from '../context/ClassroomViewContext';

/**
 * 横向推荐轨道
 * 供路线列表、后续个性化推荐复用。
 */
export default function RecommendationRail({
  title = '推荐',
  items = [],
  renderItem,
  emptyText = '',
}) {
  const { hidden } = useClassroomView();
  if (hidden.recommendation) return null;

  const railClass = 'recommendation-rail glass-panel';

  if (!items.length) {
    return emptyText ? (
      <section className={railClass}>
        <h2>{title}</h2>
        <p className="recommendation-rail-empty">{emptyText}</p>
      </section>
    ) : null;
  }

  return (
    <section className={railClass}>
      <h2>{title}</h2>
      <div className="recommendation-rail-track">
        {items.map((item, index) => (
          <div className="recommendation-rail-item" key={item.id || index}>
            {renderItem ? renderItem(item, index) : <span>{item.name}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}