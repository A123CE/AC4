import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import CardSwap, { Card, CardDeckErrorBoundary } from '../CardSwap';

const FAKE_TIMER_OPTIONS = {
  toFake: ['setTimeout', 'clearTimeout', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'],
};

function setViewport(width) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function makeItems(count = 4) {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${index + 1}`,
    title: `词条${index + 1}`,
    synopsis: `摘要${index + 1}`,
    category: index === 1 ? '名筑档案' : '屋顶',
    entryType: index === 1 ? 'building' : 'craft',
    badgeBuilding: index === 1,
    badge3D: index === 0,
    dynasty: index === 1 ? '明' : '',
    region: index === 1 ? '北京' : '',
  }));
}

function cards(container) {
  return container.querySelectorAll('[data-deck-card]');
}

function currentIndex(container) {
  const node =
    container.querySelector('.enc-deck-card.is-active') ||
    container.querySelector('[aria-current="true"]');
  return node ? node.getAttribute('data-index') : null;
}

function selectedIndex(container) {
  const node = container.querySelector('[aria-current="true"]');
  return node ? node.getAttribute('data-index') : null;
}

function installIntersectionObserver() {
  const instances = [];
  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      instances.push(this);
    }

    observe() {}

    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  return instances;
}

beforeEach(() => {
  vi.stubGlobal('CSS', { supports: () => true });
  setViewport(1440);
  delete globalThis.__acEncyclopediaDeckPrefs;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setViewport(1024);
  delete globalThis.__acEncyclopediaDeckPrefs;
});

describe('CardSwap 组件', () => {
  it('items 与 <Card> 两种用法共用同一卡片结构', () => {
    const first = render(<CardSwap items={makeItems(3)} />);
    expect(cards(first.container)).toHaveLength(3);
    expect(screen.getByText('词条1')).toBeInTheDocument();
    first.unmount();

    const second = render(
      <CardSwap>
        <Card>
          <span>自定义一</span>
        </Card>
        <Card>
          <span>自定义二</span>
        </Card>
      </CardSwap>
    );
    expect(cards(second.container)).toHaveLength(2);
    expect(screen.getByText('自定义一')).toBeInTheDocument();
  });

  it('单张默认卡面 DOM 节点数 ≤12', () => {
    const { container } = render(<CardSwap items={makeItems(4)} />);
    const firstCard = container.querySelector('[data-deck-card]');
    expect(1 + firstCard.querySelectorAll('*').length).toBeLessThanOrEqual(12);
  });

  it('同屏挂载卡数等于可见层 + 2（景深窗口含退场与预进场）', () => {
    const { container } = render(<CardSwap items={makeItems(8)} />);
    expect(cards(container)).toHaveLength(5);
  });

  it('←/→ 只移动焦点，不触发 onSelect', () => {
    const onSelect = vi.fn();
    const { container } = render(<CardSwap items={makeItems(4)} onSelect={onSelect} />);
    const firstCard = container.querySelector('[data-deck-card][data-index="0"]');
    firstCard.focus();

    fireEvent.keyDown(firstCard, { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' });

    expect(onSelect).not.toHaveBeenCalled();
    expect(document.activeElement.getAttribute('data-index')).toBe('0');
  });

  it('Enter 触发 onSelect 且带上词条 id', () => {
    const onSelect = vi.fn();
    const { container } = render(<CardSwap items={makeItems(4)} onSelect={onSelect} />);
    const secondCard = container.querySelector('[data-deck-card][data-index="1"]');
    secondCard.focus();

    fireEvent.keyDown(secondCard, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('t2');
  });

  it('Home / End 把焦点移到首张与末张', () => {
    const { container } = render(<CardSwap items={makeItems(4)} />);
    const firstCard = container.querySelector('[data-deck-card][data-index="0"]');
    firstCard.focus();

    fireEvent.keyDown(firstCard, { key: 'End' });
    expect(document.activeElement.getAttribute('data-index')).toBe('3');

    fireEvent.keyDown(document.activeElement, { key: 'Home' });
    expect(document.activeElement.getAttribute('data-index')).toBe('0');
  });

  it('Esc 不拦截默认行为', () => {
    const { container } = render(<CardSwap items={makeItems(4)} />);
    const card = container.querySelector('[data-deck-card]');
    card.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    card.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('aria-current 始终只有一张卡', () => {
    const { container } = render(<CardSwap items={makeItems(4)} />);
    expect(container.querySelectorAll('[data-deck-card][aria-current="true"]')).toHaveLength(1);
  });

  it('aria-live 只有一条，切换后播报新卡片', () => {
    vi.useFakeTimers(FAKE_TIMER_OPTIONS);
    const { container } = render(<CardSwap items={makeItems(4)} autoplay delay={2000} />);
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(container.querySelector('.enc-deck-status').textContent).toContain('词条2');
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    vi.useRealTimers();
  });

  it('点击角标不触发选择', () => {
    const onSelect = vi.fn();
    const { container } = render(<CardSwap items={makeItems(4)} onSelect={onSelect} />);
    const badge = container.querySelector('.enc-card-badge--3d');
    expect(badge).not.toBeNull();

    fireEvent.click(badge);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('横向拖拽超过 8px 触发切换', () => {
    const onSwap = vi.fn();
    const { container } = render(<CardSwap items={makeItems(4)} onSwap={onSwap} />);
    const stage = container.querySelector('.enc-deck-stage');
    const card = container.querySelector('[data-deck-card][data-index="0"]');

    fireEvent.pointerDown(card, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 180, clientY: 102 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 180, clientY: 102 });

    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onSwap.mock.calls[0][0]).toMatchObject({ id: 't4', trigger: 'drag' });
    expect(currentIndex(container)).toBe('3');
  });

  it('鼠标滚轮向下切换下一张卡片', () => {
    const { container } = render(<CardSwap items={makeItems(4)} autoplay={false} />);
    const stage = container.querySelector('.enc-deck-stage');
    const before = currentIndex(container);

    fireEvent.wheel(stage, { deltaY: 120, deltaX: 0 });

    expect(currentIndex(container)).not.toBe(before);
  });

  it('触屏纵向拖拽交还页面滚动，不切换', () => {
    const onSwap = vi.fn();
    const { container } = render(<CardSwap items={makeItems(4)} onSwap={onSwap} />);
    const stage = container.querySelector('.enc-deck-stage');
    const card = container.querySelector('[data-deck-card][data-index="0"]');

    fireEvent.pointerDown(card, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 104, clientY: 280 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 104, clientY: 280 });

    expect(onSwap).not.toHaveBeenCalled();
    expect(currentIndex(container)).toBe('0');
    expect(parseFloat(card.style.getPropertyValue('--deck-card-dx') || '0')).toBe(0);
  });

  it('未达阈值的拖拽在 300ms 内回弹', () => {
    vi.useFakeTimers(FAKE_TIMER_OPTIONS);
    const { container } = render(<CardSwap items={makeItems(4)} autoplay={false} />);
    const stage = container.querySelector('.enc-deck-stage');
    const card = container.querySelector('[data-deck-card][data-index="0"]');

    fireEvent.pointerDown(card, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 124, clientY: 100 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 124, clientY: 100 });

    expect(parseFloat(card.style.getPropertyValue('--deck-card-dx'))).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(320);
    });

    expect(parseFloat(card.style.getPropertyValue('--deck-card-dx'))).toBe(0);
  });

  it('悬停期间 delay 内不自动切换', () => {
    vi.useFakeTimers(FAKE_TIMER_OPTIONS);
    const { container } = render(<CardSwap items={makeItems(4)} autoplay delay={2000} />);
    const section = container.querySelector('.enc-deck');

    fireEvent.pointerEnter(section);
    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(currentIndex(container)).toBe('0');
  });

  it('卡组不可见时暂停轮播', () => {
    const observers = installIntersectionObserver();
    vi.useFakeTimers(FAKE_TIMER_OPTIONS);
    const { container } = render(<CardSwap items={makeItems(4)} autoplay delay={2000} />);

    act(() => {
      observers[0].callback([{ intersectionRatio: 0 }]);
    });
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(currentIndex(container)).toBe('0');
  });

  it('仅保留卡片动画：不渲染右上角工具区与底部控制条', () => {
    const { container } = render(<CardSwap items={makeItems(4)} />);
    expect(container.querySelector('.enc-deck-tools')).toBeNull();
    expect(container.querySelector('.enc-deck-controls')).toBeNull();
    expect(container.querySelector('.enc-deck-toggle')).toBeNull();
  });

  it('减少动效时关闭自动轮播并进入平面模式', () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: String(query).includes('prefers-reduced-motion'),
      media: String(query),
      addEventListener() {},
      removeEventListener() {},
    }));

    const { container } = render(<CardSwap items={makeItems(4)} autoplay delay={2000} />);

    expect(container.querySelector('.enc-deck').classList.contains('is-flat')).toBe(true);

  });

  it('strength=0 时渲染 is-flat，越界参数不崩溃', () => {
    setViewport(600);
    const { container } = render(
      <CardSwap items={makeItems(4)} depth={999} visibleCards={0} delay={10} />
    );

    expect(container.querySelector('.enc-deck').classList.contains('is-flat')).toBe(true);
    expect(cards(container).length).toBeGreaterThan(0);
  });

  it('items 为空时展示空态并可清除筛选', () => {
    const onClearFilters = vi.fn();
    render(<CardSwap items={[]} onClearFilters={onClearFilters} />);

    const action = screen.getByRole('button', { name: '清除筛选' });
    fireEvent.click(action);

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('错误边界降级不影响兄弟节点', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function Boom() {
      throw new Error('boom');
    }

    render(
      <>
        <CardDeckErrorBoundary fallback={<p>卡组降级</p>}>
          <Boom />
        </CardDeckErrorBoundary>
        <div data-testid="sibling">兄弟内容</div>
      </>
    );

    expect(screen.getByText('卡组降级')).toBeInTheDocument();
    expect(screen.getByTestId('sibling')).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it('T-DECK-04 二次点击同一卡片打开预览，且 aria-current 始终唯一', () => {
    const { container } = render(<CardSwap items={makeItems(4)} />);
    const card = container.querySelector('[data-deck-card][data-index="0"]');
    expect(card.getAttribute('aria-current')).toBe('true');

    fireEvent.click(card);
    expect(document.querySelector('.enc-preview-dialog')).not.toBeNull();
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('.enc-preview-dialog')).toBeNull();
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it('T-DECK-04 首次点击其他卡片只选中、不打开预览', () => {
    const onSelect = vi.fn();
    const { container } = render(<CardSwap items={makeItems(4)} onSelect={onSelect} />);
    const cardB = container.querySelector('[data-deck-card][data-index="1"]');

    fireEvent.click(cardB);

    expect(onSelect).toHaveBeenCalledWith('t2');
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    expect(selectedIndex(container)).toBe('1');
    expect(document.querySelector('.enc-preview-dialog')).toBeNull();
  });

  it('T-DECK-05 预览内上/下一张循环切换', () => {
    const { container } = render(<CardSwap items={makeItems(4)} />);
    fireEvent.click(container.querySelector('[data-deck-card][data-index="0"]'));
    const dialog = document.querySelector('.enc-preview-dialog');
    expect(dialog).not.toBeNull();

    fireEvent.click(screen.getByLabelText('上一张'));
    expect(within(dialog).getByText('词条4')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('下一张'));
    expect(within(dialog).getByText('词条1')).toBeInTheDocument();
  });

  it('T-DECK-06 Esc 关闭后焦点回到发起卡', () => {
    vi.useFakeTimers(FAKE_TIMER_OPTIONS);
    const { container } = render(<CardSwap items={makeItems(4)} autoplay={false} />);
    const card = container.querySelector('[data-deck-card][data-index="0"]');
    card.focus();
    fireEvent.click(card);
    expect(document.querySelector('.enc-preview-dialog')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(40);
    });

    expect(document.querySelector('.enc-preview-dialog')).toBeNull();
    expect(document.activeElement).toBe(card);
    vi.useRealTimers();
  });

  it('T-DECK-09 单条数据禁用换位，但可选中与预览', () => {
    const { container } = render(<CardSwap items={makeItems(1)} autoplay={false} />);
    const stage = container.querySelector('.enc-deck-stage');
    const before = currentIndex(container);

    fireEvent.pointerDown(stage, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 320, clientY: 100 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 320, clientY: 100 });

    expect(currentIndex(container)).toBe(before);
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-deck-card]')).toHaveLength(1);
  });

  it('T-DECK-09 减动效下未提交的拖拽立即归零', () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: String(query).includes('prefers-reduced-motion'),
      media: String(query),
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container } = render(<CardSwap items={makeItems(4)} autoplay={false} />);
    const stage = container.querySelector('.enc-deck-stage');
    const card = container.querySelector('[data-deck-card][data-index="0"]');

    fireEvent.pointerDown(card, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 124, clientY: 101 });
    expect(parseFloat(card.style.getPropertyValue('--deck-card-dx'))).toBeGreaterThan(0);
    expect(stage.style.getPropertyValue('--deck-dx')).toBe('');
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 124, clientY: 101 });

    expect(parseFloat(card.style.getPropertyValue('--deck-card-dx') || '0')).toBe(0);
    vi.unstubAllGlobals();
  });

  it('width / height / theme 适配为卡片尺寸变量与主题属性', () => {
    const { container } = render(
      <CardSwap items={makeItems(3)} width={420} height={300} theme="dark" />
    );
    const deck = container.querySelector('.enc-deck');
    expect(deck.getAttribute('data-card-theme')).toBe('dark');
    expect(deck.style.getPropertyValue('--enc-deck-w')).toBe('420px');
    expect(deck.style.getPropertyValue('--enc-deck-h')).toBe('300px');
    expect(deck.style.getPropertyValue('--swap-tile')).toContain('linear-gradient');
  });

  it('默认浅色主题并暴露 next / prev 命令式接口', () => {
    const ref = createRef();
    const { container } = render(
      <CardSwap ref={ref} items={makeItems(3)} autoplay={false} />
    );
    expect(container.querySelector('.enc-deck').getAttribute('data-card-theme')).toBe('light');
    expect(typeof ref.current?.next).toBe('function');
    expect(typeof ref.current?.prev).toBe('function');
    expect(() => {
      act(() => {
        ref.current.next();
      });
    }).not.toThrow();
  });
});