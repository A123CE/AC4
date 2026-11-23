const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const pool = require('../src/db');
const db = require('./helpers/db');
const engine = require('../src/services/achievementEngine');

let dbReady = false;
let userId = null;

async function addCorrectAnswers(count) {
  const [questions] = await pool.query(
    'SELECT id FROM quiz_questions ORDER BY id ASC LIMIT ?',
    [count]
  );
  for (const question of questions) {
    await pool.query(
      `INSERT INTO quiz_records (user_id, question_id, user_answer, is_correct, points_earned)
       VALUES (?, ?, 'A', 1, 20)`,
      [userId, question.id]
    );
    await pool.query(
      `INSERT IGNORE INTO quiz_answer_facts
         (user_id, question_id, is_correct, first_answered_at, first_correct_at, counted, last_answered_at)
       VALUES (?, ?, 1, NOW(), NOW(), 1, NOW())`,
      [userId, question.id]
    );
  }
}

describe('achievementEngine 统一成就引擎', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role, login_count) VALUES (?, ?, ?, ?)',
      [`engine_test_${Date.now()}`, 'test-hash', 'user', 1]
    );
    userId = result.insertId;
  });

  after(async () => {
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('集章幂等，且 palaces_viewed 目标不超过建筑总数', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const first = await engine.grantStamp(userId, 'taihedian');
    const second = await engine.grantStamp(userId, 'taihedian');
    assert.ok(first);
    assert.equal(second, null);

    const snapshot = await engine.snapshot(userId);
    assert.ok(snapshot.counts.palaces_viewed >= 1);
    assert.ok(snapshot.counts.palaces_viewed <= snapshot.counts.palaces_total);

    const badge = snapshot.progress.find(
      (item) => item.condition_type === 'palaces_viewed'
    );
    assert.ok(badge);
    assert.equal(badge.progress.target, 20);
  });

  it('登录徽章可授予且重复判定不重复发放', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const first = await engine.evaluate(userId, { trigger: 'login' });
    assert.ok(first.badges.some((badge) => badge.name === '紫禁城初访'));

    const second = await engine.evaluate(userId, { trigger: 'login' });
    assert.equal(second.badges.length, 0);
  });

  it('答对 10 题授予童生', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    await addCorrectAnswers(10);
    const result = await engine.evaluate(userId, { trigger: 'answer' });
    assert.ok(result.badges.some((badge) => badge.name === '童生'));
  });

  it('连续签到 7 天授予签到勤勉', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO user_signins (user_id, signin_date, points_earned, consecutive_days)
       VALUES (?, ?, 10, 7)`,
      [userId, today]
    );

    const result = await engine.evaluate(userId, { trigger: 'signin' });
    assert.ok(result.badges.some((badge) => badge.name === '签到勤勉'));
  });

  it('收藏 5 座授予营造学徒', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const [palaces] = await pool.query(
      'SELECT id FROM palaces ORDER BY order_num ASC LIMIT 5'
    );
    for (const palace of palaces) {
      await pool.query(
        'INSERT IGNORE INTO user_collections (user_id, palace_id, category) VALUES (?, ?, ?)',
        [userId, palace.id, '默认']
      );
    }

    const result = await engine.evaluate(userId, { trigger: 'collect' });
    assert.ok(result.badges.some((badge) => badge.name === '营造学徒'));
  });

  it('badges_count 二阶段授予古建专家', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    await pool.query('UPDATE users SET points = 1000 WHERE id = ?', [userId]);
    const result = await engine.evaluate(userId, { trigger: 'points' });

    assert.ok(result.badges.some((badge) => badge.name === '翰林学士'));
    assert.ok(result.badges.some((badge) => badge.name === '古建专家'));
  });

  it('快照包含全部 12 枚徽章与合理的下一目标', async (t) => {
    if (!dbReady) return t.skip('ac4_test 数据库不可用');

    const snapshot = await engine.snapshot(userId);
    assert.equal(snapshot.progress.length, 12);
    assert.ok(snapshot.next_targets.length <= 3);
    assert.ok(snapshot.progress.every((badge) => badge.progress.target >= 1));
  });
});