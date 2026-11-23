const pool = require('../db');

async function getTranslations(entityType, entityId, locale = 'en') {
  const [rows] = await pool.execute(
    `SELECT field, value, status
     FROM content_translations
     WHERE entity_type = ? AND entity_id = ? AND locale = ?`,
    [entityType, entityId, locale]
  );

  const map = {};
  for (const row of rows) {
    map[row.field] = { value: row.value, status: row.status };
  }
  return map;
}

/**
 * 字段回退：content_translations → name_en → 中文原值
 */
async function getPalaceContent(palaceId, locale = 'en') {
  const [rows] = await pool.execute(
    `SELECT id, name, name_en, tagline, description, dynasty, category
     FROM palaces WHERE id = ? AND status = 'published'`,
    [palaceId]
  );
  const palace = rows[0];
  if (!palace) return null;

  const translations = await getTranslations('palace', palaceId, locale);
  const translatedName = translations.name?.value;
  const translatedDescription = translations.description?.value;

  return {
    id: palace.id,
    name: translatedName || palace.name_en || palace.name,
    name_source: translatedName
      ? 'translation'
      : palace.name_en
        ? 'name_en'
        : 'none',
    description:
      translatedDescription || palace.description || palace.tagline || null,
    description_status: translations.description?.status || 'none',
    name_en: palace.name_en,
  };
}

async function getCoverage() {
  const [[palaceRow]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN name_en IS NOT NULL AND name_en <> '' THEN 1 ELSE 0 END) AS name_en,
            SUM(CASE WHEN description IS NOT NULL AND description <> '' THEN 1 ELSE 0 END) AS description
     FROM palaces WHERE status = 'published'`
  );

  const [[translatedRow]] = await pool.query(
    `SELECT COUNT(DISTINCT entity_id) AS translated
     FROM content_translations
     WHERE entity_type = 'palace' AND locale = 'en'`
  );

  const [[termRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM encyclopedia_terms'
  );

  const total = Number(palaceRow.total || 0);
  const translated = Number(translatedRow.translated || 0);

  return {
    palaces: {
      total,
      name_en: Number(palaceRow.name_en || 0),
      translated,
      status: {
        full: translated,
        title: Math.max(0, Number(palaceRow.name_en || 0) - translated),
        none: Math.max(0, total - Number(palaceRow.name_en || 0)),
      },
    },
    encyclopedia: {
      total: Number(termRow.total || 0),
      translated: 0,
    },
    ui: { total: 0, translated: 0 },
  };
}

module.exports = { getTranslations, getPalaceContent, getCoverage };