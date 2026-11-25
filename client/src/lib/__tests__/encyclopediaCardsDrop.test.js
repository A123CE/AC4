import { describe, it, expect } from 'vitest';
import {
  CARDS_CONFIG,
  resolveDrop,
  clampDragOffset,
  cardRectFor,
} from '../encyclopediaCards';

describe('卡片落位与拖拽边界（T-DECK-01）', () => {
  it('AC-DECK-03 resolveDrop(150,22,700) → steps=2、commit=true', () => {
    const drop = resolveDrop(150, 22, 700);
    expect(drop.steps).toBe(2);
    expect(drop.commit).toBe(true);
    expect(drop.stageWidth).toBe(700);
  });

  it('负向位移产生负步数并同样可提交', () => {
    const drop = resolveDrop(-150, 0, 700);
    expect(drop.steps).toBe(-2);
    expect(drop.commit).toBe(true);
  });

  it('小位移不提交且步数为 0', () => {
    const drop = resolveDrop(20, 0, 700);
    expect(drop.steps).toBe(0);
    expect(drop.commit).toBe(false);
  });

  it('步数不超过 maxSteps=3', () => {
    expect(resolveDrop(9999, 0, 700).steps).toBe(CARDS_CONFIG.DRAG.maxSteps);
    expect(resolveDrop(-9999, 0, 700).steps).toBe(-CARDS_CONFIG.DRAG.maxSteps);
  });

  it('快速同向甩动即使位移小也提交', () => {
    const drop = resolveDrop(10, 0, 700, 0.9);
    expect(drop.commit).toBe(true);
    const opposite = resolveDrop(10, 0, 700, -0.9);
    expect(opposite.commit).toBe(false);
  });

  it('stageWidth ≤ 0 回退 widthMax', () => {
    expect(resolveDrop(0, 0, 0).stageWidth).toBe(CARDS_CONFIG.CARD_SIZE.widthMax);
    expect(resolveDrop(0, 0, -10).stageWidth).toBe(CARDS_CONFIG.CARD_SIZE.widthMax);
    expect(resolveDrop(0, 0, Number.NaN).stageWidth).toBe(CARDS_CONFIG.CARD_SIZE.widthMax);
  });

  it('clampDragOffset 夹紧在 ±0.9×舞台/2 内', () => {
    const clamped = clampDragOffset(10000, -10000, { width: 400, height: 300 });
    expect(clamped.x).toBe(180);
    expect(clamped.y).toBe(-135);
    expect(clampDragOffset(20, -20, { width: 400, height: 300 })).toEqual({ x: 20, y: -20 });
  });

  it('cardRectFor 居中且宽度不超过上限', () => {
    const rect = cardRectFor({ stageWidth: 1200, stageHeight: 600, cardWidth: 999 });
    expect(rect.width).toBe(CARDS_CONFIG.CARD_SIZE.widthMax);
    expect(rect.height).toBe(CARDS_CONFIG.CARD_SIZE.height);
    expect(rect.x).toBe((1200 - rect.width) / 2);
  });

  it('CARD_SIZE 配置单源与 68vh 上限', () => {
    const size = CARDS_CONFIG.CARD_SIZE;
    expect(size.height).toBe(500);
    expect(size.widthMin).toBe(360);
    expect(size.widthMax).toBe(700);
    expect(size.viewportCapVh).toBe(0.68);
    expect(size.titleLines).toBe(2);
    expect(size.synopsisLines).toBe(3);
    expect(CARDS_CONFIG.MOTION.settleMs).toBe(300);
    expect(CARDS_CONFIG.PRESET.wide.visibleCards).toBe(4);
  });
});