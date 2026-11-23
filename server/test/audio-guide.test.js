const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');

process.env.DB_NAME = process.env.DB_NAME || 'ac4_test';

const app = require('../src/app');
const pool = require('../src/db');
const db = require('./helpers/db');

let dbReady = false;
let palace = null;

function sha1(value) {
  return crypto.createHash('sha1').update(String(value), 'utf8').digest('hex');
}

describe('导览音频联查', () => {
  before(async () => {
    dbReady = await db.canConnect();
    if (!dbReady) return;

    const [rows] = await pool.query(
      "SELECT id, audio_guide FROM palaces WHERE audio_guide IS NOT NULL AND audio_guide <> '' LIMIT 1"
    );
    palace = rows[0] || null;

    if (palace) {
      await pool.query(
        `INSERT INTO audio_guides
           (entity_type, entity_id, audio_url, duration_seconds, transcript, transcript_hash, status, locale)
         VALUES ('palace', ?, '/audio/guides/test.mp3', 30, ?, ?, 'published', 'zh-CN')
         ON DUPLICATE KEY UPDATE audio_url = VALUES(audio_url),
           transcript = VALUES(transcript), transcript_hash = VALUES(transcript_hash),
           status = 'published'`,
        [palace.id, palace.audio_guide, sha1(palace.audio_guide)]
      );
    }
  });

  after(async () => {
    if (palace) {
      await pool
        .query('DELETE FROM audio_guides WHERE entity_type = ? AND entity_id = ?', [
          'palace',
          palace.id,
        ])
        .catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it('详情返回 audio 对象且文字稿哈希一致时 is_current=true', async (t) => {
    if (!dbReady || !palace) return t.skip('缺少带讲解词的建筑');

    const res = await request(app).get(`/api/palaces/${palace.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.audio.url, '/audio/guides/test.mp3');
    assert.equal(res.body.data.audio.duration, 30);
    assert.equal(res.body.data.audio.is_current, true);
  });

  it('文字稿变化时 is_current=false', async (t) => {
    if (!dbReady || !palace) return t.skip('缺少带讲解词的建筑');

    await pool.query(
      "UPDATE audio_guides SET transcript_hash = REPEAT('0', 40) WHERE entity_type = 'palace' AND entity_id = ?",
      [palace.id]
    );

    const res = await request(app).get(`/api/palaces/${palace.id}`);
    assert.equal(res.body.data.audio.is_current, false);
  });

  it('无 published 音频时 audio=null，前端可回退 TTS', async (t) => {
    if (!dbReady || !palace) return t.skip('缺少带讲解词的建筑');

    await pool.query(
      "DELETE FROM audio_guides WHERE entity_type = 'palace' AND entity_id = ?",
      [palace.id]
    );

    const res = await request(app).get(`/api/palaces/${palace.id}`);
    assert.equal(res.body.data.audio, null);
  });
});