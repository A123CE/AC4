/**
 * 按服务端返回的区间渲染高亮，禁止 dangerouslySetInnerHTML。
 */
export default function HighlightText({ text = '', matched = [], className = '' }) {
  const source = String(text ?? '');
  if (!Array.isArray(matched) || matched.length === 0) {
    return <span className={className}>{source}</span>;
  }

  const parts = [];
  let cursor = 0;

  matched.forEach((range, index) => {
    const start = Math.max(0, Number(range?.[0]));
    const end = Math.min(source.length, Number(range?.[1]));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    if (start > cursor) parts.push(source.slice(cursor, start));
    parts.push(<mark key={`m-${index}`}>{source.slice(start, end)}</mark>);
    cursor = end;
  });

  if (cursor < source.length) parts.push(source.slice(cursor));

  return <span className={className}>{parts.length ? parts : source}</span>;
}