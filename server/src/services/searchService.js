const pool = require('../db');

/**
 * 跨类型搜索服务
 * 返回纯文本结果 + highlight 区间，不生成任何 HTML。
 */

const CHAR_ALIASES = {
  栱: '拱',
  樑: '梁',
  臺: '台',
  閣: '阁',
  門: '门',
  樓: '楼',
  壇: '坛',
  廟: '庙',
  宮: '宫',
};

const GROUP_LABELS = {
  palace: '建筑',
  term: '术语',
  question: '题目',
  timeline: '时间轴',
};

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[栱樑臺閣門樓壇廟宮]/g, (char) => CHAR_ALIASES[char] || char)
    .toLowerCase();
}

function findMatches(text, query, maxMatches = 20) {
  const haystack = normalizeText(text);
  const needle = normalizeText(query);
  if (!needle) return [];

  const matches = [];
  let from = 0;
  while (matches.length < maxMatches) {
    const index = haystack.indexOf(needle, from);
    if (index < 0) break;
    matches.push([index, index + needle.length]);
    from = index + needle.length;
  }
  return matches;
}

function truncate(value, length = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function scoreRow(row, query, weights) {
  const needle = normalizeText(query);
  let score = 0;
  for (const [field, weight] of Object.entries(weights)) {
    if (normalizeText(row[field]).includes(needle)) {
      score = Math.max(score, weight);
    }
  }
  return score;
}

function buildItem({ id, title, snippet, href, meta, query }) {
  const combined = `${title} ${snippet}`.trim();
  return {
    id,
    title,
    snippet,
    matched: findMatches(combined, query),
    href,
    meta: meta || {},
  };
}

async function searchPalaces(query, limit, lang, filters = {}) {
  const like = `%${query}%`;
  const conditions = [
    `(name LIKE ? OR name_en LIKE ? OR tagline LIKE ?
      OR quote LIKE ? OR description LIKE ? OR city LIKE ?
      OR region LIKE ? OR tags LIKE ? OR dynasty LIKE ?)`,
    "status = 'published'",
  ];
  const params = Array(9).fill(like);

  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.dynasty) {
    conditions.push('dynasty LIKE ?');
    params.push(`%${filters.dynasty}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM palaces ${where}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT id, name, name_en, tagline, quote, description, city, region, tags,
            category, dynasty, poster_path
     FROM palaces ${where}`,
    params
  );

  const items = rows
    .map((row) => ({
      row,
      score: scoreRow(row, query, {
        name: 4,
        name_en: 3,
        tagline: 2,
        quote: 2,
        description: 1,
        city: 1,
        region: 1,
        tags: 1,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) =>
      buildItem({
        id: row.id,
        title: row.name,
        snippet: truncate(row.tagline || row.description),
        href: `/exhibition/${encodeURIComponent(row.id)}`,
        meta: { category: row.category, dynasty: row.dynasty },
        query,
      })
    );

  return { type: 'palace', label: GROUP_LABELS.palace, total: Number(total), items };
}

async function searchTerms(query, limit, lang, filters = {}) {
  const like = `%${query}%`;
  const conditions = ["status = 'published'", '(term LIKE ? OR synopsis LIKE ? OR content LIKE ?)'];
  const params = [like, like, like];

  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM encyclopedia_terms ${where}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT id, term, synopsis, content, category FROM encyclopedia_terms ${where}`,
    params
  );

  const items = rows
    .map((row) => ({
      row,
      score: scoreRow(row, query, { term: 4, synopsis: 2, content: 1 }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) =>
      buildItem({
        id: row.id,
        title: row.term,
        snippet: truncate(row.synopsis || row.content),
        href: `/encyclopedia?term=${encodeURIComponent(row.id)}`,
        meta: { category: row.category },
        query,
      })
    );

  return { type: 'term', label: GROUP_LABELS.term, total: Number(total), items };
}

async function searchQuestions(query, limit, lang, filters = {}) {
  const like = `%${query}%`;
  const conditions = ['(question LIKE ? OR explanation LIKE ? OR tags LIKE ?)'];
  const params = [like, like, like];

  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM quiz_questions ${where}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT id, question, explanation, category, difficulty, tags
     FROM quiz_questions ${where}`,
    params
  );

  const items = rows
    .map((row) => ({
      row,
      score: scoreRow(row, query, { question: 3, explanation: 1, tags: 1 }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) =>
      buildItem({
        id: row.id,
        title: row.question,
        snippet: truncate(row.explanation),
        href: `/quiz${row.category ? `?category=${encodeURIComponent(row.category)}` : ''}`,
        meta: { category: row.category, difficulty: row.difficulty },
        query,
      })
    );

  return { type: 'question', label: GROUP_LABELS.question, total: Number(total), items };
}

async function searchTimeline(query, limit, lang, filters = {}) {
  const like = `%${query}%`;
  const conditions = ['(t.year LIKE ? OR t.event LIKE ?)'];
  const params = [like, like];

  if (filters.category) {
    conditions.push('p.category = ?');
    params.push(filters.category);
  }
  if (filters.dynasty) {
    conditions.push('p.dynasty LIKE ?');
    params.push(`%${filters.dynasty}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM palace_timeline t ${where}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT t.palace_id, p.name AS palace_name, t.year, t.event
     FROM palace_timeline t
     JOIN palaces p ON p.id = t.palace_id
     ${where}`,
    params
  );

  const items = rows
    .map((row) => ({
      row,
      score: scoreRow(row, query, { year: 3, event: 2 }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) =>
      buildItem({
        id: `${row.palace_id}:${row.year}`,
        title: `${row.palace_name} · ${row.year}`,
        snippet: truncate(row.event),
        href: '/timeline',
        meta: { palace_id: row.palace_id, year: row.year },
        query,
      })
    );

  return { type: 'timeline', label: GROUP_LABELS.timeline, total: Number(total), items };
}

const SEARCHERS = {
  palace: searchPalaces,
  term: searchTerms,
  question: searchQuestions,
  timeline: searchTimeline,
};

async function search(
  query,
  { type = 'all', limit = 8, lang = 'zh-CN', category = '', dynasty = '' } = {}
) {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  const safeType = SEARCHERS[type] ? type : 'all';
  const types = safeType === 'all' ? Object.keys(SEARCHERS) : [safeType];

  const normalizedQuery = normalizeText(query);
  const groups = await Promise.all(
    types.map((itemType) =>
      SEARCHERS[itemType](normalizedQuery, safeLimit, lang, {
        category,
        dynasty,
      })
    )
  );

  return {
    q: query,
    total: groups.reduce((sum, group) => sum + group.total, 0),
    groups,
  };
}

function levenshtein(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    let last = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const temp = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        last + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
      last = temp;
    }
  }
  return previous[right.length];
}

async function suggest(query = '') {
  try {
    const [hotRows] = await pool.execute(
      `SELECT term FROM search_hot_terms
       WHERE is_active = 1 AND locale = 'zh-CN'
       ORDER BY weight DESC, id ASC LIMIT 8`
    );

    const [nameRows] = await pool.execute(
      "SELECT name AS term FROM palaces WHERE status = 'published' ORDER BY order_num ASC LIMIT 50"
    );
    const [termRows] = await pool.execute(
      'SELECT term FROM encyclopedia_terms ORDER BY sort_order ASC LIMIT 50'
    );

    const q = normalizeText(query);
    const candidates = [...nameRows, ...termRows]
      .map((row) => row.term)
      .filter((term) => normalizeText(term) !== q);

    const corrections = q
      ? [...new Set(candidates)]
          .map((term) => ({ term, distance: levenshtein(term, query) }))
          .filter((item) => item.distance > 0 && item.distance <= 2)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5)
          .map((item) => item.term)
      : [];

    const [categoryRows] = await pool.execute(
      "SELECT DISTINCT category FROM palaces WHERE status = 'published' AND category IS NOT NULL ORDER BY category ASC"
    );

    const [recommended] = await pool.execute(
      "SELECT id, name, poster_path FROM palaces WHERE status = 'published' ORDER BY order_num ASC LIMIT 3"
    );

    return {
      hot: hotRows.map((row) => row.term),
      corrections,
      categories: categoryRows.map((row) => row.category),
      recommended: recommended.map((row) => ({
        id: row.id,
        name: row.name,
        poster_path: row.poster_path,
      })),
    };
  } catch (err) {
    console.error('搜索建议失败:', err);
    return { hot: [], corrections: [], categories: [], recommended: [] };
  }
}

module.exports = {
  search,
  suggest,
  normalizeText,
  findMatches,
  GROUP_LABELS,
};