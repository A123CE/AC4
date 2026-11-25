import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('排版契约（静态守门）', () => {
  it('checkTypography 守门脚本退出码为 0', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/checkTypography.mjs'], {
        cwd: ROOT,
        stdio: 'pipe',
      })
    ).not.toThrow();
  });

  it(':root 提供三档字重、三角色字体族与九档字号令牌', () => {
    const css = read('src/styles/global.css');
    expect(css).toMatch(/--fw-title:\s*700;/);
    expect(css).toMatch(/--fw-body:\s*500;/);
    expect(css).toMatch(/--fw-aux:\s*400;/);
    expect(css).toMatch(/--font-sans:/);
    expect(css).toMatch(/--font-serif-display:/);
    expect(css).toMatch(/--font-mono:/);
    for (const token of [
      '--fs-caption',
      '--fs-meta',
      '--fs-note',
      '--fs-body',
      '--fs-body-lg',
      '--fs-card-title',
      '--fs-section',
      '--fs-page-title',
      '--fs-display',
    ]) {
      expect(css).toContain(`${token}:`);
    }
  });

  it('body 正文使用 --font-sans，标题保留 --font-serif-display', () => {
    const css = read('src/styles/global.css');
    const body = css.match(/body \{[\s\S]*?\}/);
    expect(body?.[0]).toContain('font-family: var(--font-sans);');
    expect(css).toContain('--font-serif-display:');
  });

  it('任何 CSS 字重都只来自三档令牌', () => {
    const css = read('src/styles/global.css') + read('src/styles/encyclopedia.css');
    const values = [...css.matchAll(/font-weight\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect([
        'var(--fw-title)',
        'var(--fw-body)',
        'var(--fw-aux)',
      ]).toContain(value);
    }
  });

  it('无内联 fontWeight / fontFamily 声明', () => {
    const files = ['src/pages/EighteenDouPage.jsx', 'src/pages/ExhibitionPage.jsx'];
    for (const file of files) {
      const src = read(file);
      expect(src).not.toMatch(/\bfontWeight\s*:/);
      expect(src).not.toMatch(/\bfontFamily\s*:/);
    }
  });
});