/**
 * CircularCarousel — 3D 环形(圆柱)旋转卡面
 * 卡片沿圆柱排布, 支持匀速巡航、拖拽带惯性、吸附对齐、点击聚焦、指针视差。
 * 与官方版不同的是: 每张卡支持任意 React 内容(item.content), 而不只是图片,
 * 因而可以直接放置带文字的「题库卡」。
 */
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './CircularCarousel.css';

const TO_RAD = Math.PI / 180;
const DRAG_THRESHOLD = 5;
const SETTLE_SPEED = 9;
const CAPTION_SPACE = 76;
const INTRO_LENGTH = { assemble: 1500, rise: 1400, spin: 1800, none: 0 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = (degrees) => ((((degrees + 180) % 360) + 360) % 360) - 180;
const easeOut = (t) => 1 - Math.pow(1 - t, 4);
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

const rotateX = (p, degrees) => {
  const r = degrees * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};

const rotateY = (p, degrees) => {
  const r = degrees * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
};

export default function CircularCarousel({
  items = [],
  cardWidth = 220,
  aspectRatio = 1,
  gap = 40,
  curve = 1,
  tilt = -4,
  perspective = 2200,
  autoplay = 'drift',
  speed = 10,
  direction = 'left',
  draggable = true,
  momentum = 0.6,
  snap = true,
  pauseOnHover = true,
  focusOnClick = true,
  parallax = 0.3,
  stretch = 0.5,
  depthFade = 0.55,
  fadeColor = '#2a1a12',
  cornerRadius = 16,
  captions = false,
  intro = 'rise',
  fit = 'ring',
  stepAngle = null,
  initialIndex = 0,
  spring = 118,
  onChange,
  onItemClick,
  className = '',
  style,
  ref,
}) {
  const list = items || [];
  const count = list.length;
  const reduced = usePrefersReducedMotion();

  const cardW = Math.max(40, cardWidth);
  const cardH = cardW / clamp(aspectRatio, 0.2, 5);
  // 默认整圈均分; 传 stepAngle 可做「弧面」布局(卡片不必绕满 360°)
  // 关键约束: 相邻夹角 × 卡数不能超过 360°, 否则首尾卡面会在正前方重叠
  // (例如 10 张卡按 46° 排布时, 第 9 张落在 368°, 会盖住并挡住第 1 张)
  const ringStep = count ? 360 / count : 360;
  const step = stepAngle ? Math.min(clamp(stepAngle, 8, 180), ringStep) : ringStep;

  const radius = useMemo(() => {
    const pitch = cardW + gap;
    const chord = pitch / (2 * Math.sin(Math.min(step, 180) * Math.PI / 360));
    const arc = ((360 / step) * pitch) / (2 * Math.PI);
    return Math.max(chord + (arc - chord) * clamp(curve, 0, 1), cardW * 0.6);
  }, [step, cardW, gap, curve]);

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const cameraRef = useRef(null);
  const ringRef = useRef(null);
  const cardRefs = useRef([]);
  const wakeRef = useRef(() => {});
  const measureRef = useRef(() => {});
  // 挂载时直接停在指定卡面(例如从其他标签页切回答题页, 环形卡面需要回到当前题)
  const startIndex = count ? clamp(Math.round(initialIndex), 0, count - 1) : 0;
  const activeRef = useRef(startIndex);

  const [active, setActive] = useState(startIndex);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  const readyRef = useRef(false);
  readyRef.current = ready;

  const stateRef = useRef({
    angle: -startIndex * step,
    velocity: 0,
    target: null,
    dir: direction === 'right' ? 1 : -1,
    press: null,
    drag: false,
    hover: false,
    pointer: { inside: false, x: 0, y: 0 },
    yaw: 0,
    pitch: 0,
    intro: null,
    introDone: false,
    holdUntil: 0,
    suppressClick: false,
    fit: 1,
    shift: 0,
    drop: 0,
    last: 0,
  });

  const settings = {
    count,
    step,
    radius,
    axisY: true,
    tilt: reduced ? 0 : tilt,
    perspective,
    cardW,
    cardH,
    intro: reduced ? 'none' : intro in INTRO_LENGTH ? intro : 'rise',
    autoplay: reduced ? 'off' : autoplay,
    speed,
    draggable,
    momentum: clamp(momentum, 0, 1),
    snap,
    pauseOnHover,
    parallax: reduced ? 0 : clamp(parallax, 0, 1),
    stretch: reduced ? 0 : clamp(stretch, 0, 1),
    depthFade: clamp(depthFade, 0, 1),
    spring: clamp(spring, 40, 400),
    captions,
    reduced,
    rootTilt: tilt,
    // ring: 整圈缩放到容器内; focus: 只把正前方那张卡缩放到容器内, 邻卡随环形自然溢出
    fit: fit === 'focus' ? 'focus' : 'ring',
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    stateRef.current.dir = direction === 'right' ? 1 : -1;
    wakeRef.current();
  }, [direction]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const camera = cameraRef.current;
    const ring = ringRef.current;
    if (!root || !stage || !camera || !ring) return undefined;
    const state = stateRef.current;
    let raf = 0;
    let visible = true;

    const nearest = (angle) => Math.round(angle / settingsRef.current.step) * settingsRef.current.step;

    const measure = () => {
      const s = settingsRef.current;
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const room = s.captions ? CAPTION_SPACE : 0;
      const width = rect.width * 0.96;
      const height = (rect.height - room) * 0.94;
      const P = s.perspective;

      if (s.fit === 'focus') {
        // 只保证正前方卡面完整可见, 邻卡按环形自然溢出(容器裁切)
        const alone = Math.min(1, width / s.cardW, height / s.cardH);
        state.fit = alone;
        state.shift = 0;
        state.drop = (rect.height / Math.max(alone, 0.05)) * 0.55 + s.cardH;
        stage.style.perspective = `${P}px`;
        stage.style.transform = `translate3d(0, 0, 0) scale(${alone})`;
        return;
      }

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const corners = [
        [-s.cardW / 2, -s.cardH / 2],
        [s.cardW / 2, -s.cardH / 2],
        [-s.cardW / 2, s.cardH / 2],
        [s.cardW / 2, s.cardH / 2],
      ];
      for (let a = -180; a <= 180; a += 7.5) {
        for (const [cx, cy] of corners) {
          const p = rotateX(rotateY([cx, cy, s.radius], a), s.tilt);
          const z = p[2] - s.radius;
          if (z >= P * 0.95) continue;
          const k = P / (P - z);
          minX = Math.min(minX, p[0] * k);
          maxX = Math.max(maxX, p[0] * k);
          minY = Math.min(minY, p[1] * k);
          maxY = Math.max(maxY, p[1] * k);
        }
      }
      const spanX = Math.max(maxX - minX, 1);
      const spanY = Math.max(maxY - minY, 1);
      const fit = Math.min(1, width / spanX, height / spanY);
      state.fit = fit;
      state.shift = -((minY + maxY) / 2) * fit - room / 2;
      state.drop = (rect.height / Math.max(fit, 0.05)) * 0.55 + s.cardH;
      stage.style.perspective = `${P}px`;
      stage.style.transform = `translate3d(0, ${state.shift}px, 0) scale(${fit})`;
    };
    measureRef.current = measure;

    const introCard = (elapsed, landing) => {
      if (!state.intro) return { radius: 1, lift: 0 };
      const reach = Math.abs(wrap(landing + state.angle));
      if (state.intro.type === 'assemble') {
        const p = easeOut(clamp((elapsed - (reach / 180) * 420) / 1080, 0, 1));
        return { radius: 1 + 0.6 * (1 - p), lift: 0 };
      }
      if (state.intro.type === 'rise') {
        const p = easeOutQuint(clamp((elapsed - (reach / 180) * 480) / 900, 0, 1));
        return { radius: 1, lift: (1 - p) * state.drop };
      }
      if (state.intro.type === 'spin') {
        const p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1));
        return { radius: 1 + 0.28 * (1 - p), lift: 0 };
      }
      return { radius: 1, lift: 0 };
    };

    const advance = (s, dt, now) => {
      if (!state.introDone && readyRef.current) {
        if (!state.intro) {
          if (s.intro === 'none') state.introDone = true;
          else state.intro = { type: s.intro, start: now };
        }
        if (state.intro && now - state.intro.start >= INTRO_LENGTH[state.intro.type]) {
          state.intro = null;
          state.introDone = true;
        }
      }

      const paused = (s.pauseOnHover && state.hover) || state.drag || now < state.holdUntil;
      const cruise = s.autoplay === 'drift' && !paused && !state.intro ? s.speed * state.dir : 0;
      let busy = Boolean(state.intro) || state.drag;

      if (state.drag || state.intro) {
        state.velocity = state.drag ? state.velocity : 0;
      } else if (state.target !== null) {
        let remaining = dt;
        const stiffness = s.spring;
        const damping = 2 * Math.sqrt(stiffness);
        while (remaining > 0) {
          const h = Math.min(remaining, 1 / 240);
          const accel = stiffness * (state.target - state.angle) - damping * state.velocity;
          state.velocity += accel * h;
          state.angle += state.velocity * h;
          remaining -= h;
        }
        if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
          state.angle = state.target;
          state.velocity = 0;
          state.target = null;
        }
        busy = true;
      } else {
        const tau = 0.18 + s.momentum * 1.5;
        state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / tau));
        state.angle += state.velocity * dt;
        if (cruise === 0 && s.snap && Math.abs(state.velocity) < SETTLE_SPEED) {
          state.target = nearest(state.angle);
        }
        busy = busy || cruise !== 0 || Math.abs(state.velocity) > 0.01 || state.target !== null;
      }

      const ease = 1 - Math.exp(-dt / 0.35);
      const aimYaw = state.pointer.inside ? state.pointer.x * s.parallax * 9 : 0;
      const aimPitch = state.pointer.inside ? -state.pointer.y * s.parallax * 6 : 0;
      state.yaw += (aimYaw - state.yaw) * ease;
      state.pitch += (aimPitch - state.pitch) * ease;
      if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true;

      return busy;
    };

    const render = (s, now) => {
      const elapsed = state.intro ? now - state.intro.start : 0;
      const swell = 1 + s.stretch * 0.12 * Math.min(1, Math.abs(state.velocity) / 420);
      let spinOffset = 0;
      if (state.intro?.type === 'spin') {
        spinOffset = -300 * state.dir * (1 - easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1)));
      } else if (state.intro?.type === 'assemble') {
        spinOffset = -32 * state.dir * (1 - easeOut(clamp(elapsed / INTRO_LENGTH.assemble, 0, 1)));
      }
      const angle = state.angle + spinOffset;
      const R = s.radius * swell;

      camera.style.transform = `translate3d(0, 0, ${-R}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`;
      ring.style.transform = `rotateY(${angle}deg)`;

      const frontIndex = ((Math.round(-state.angle / s.step) % s.count) + s.count) % s.count;

      for (let index = 0; index < s.count; index++) {
        const card = cardRefs.current[index];
        if (!card) continue;
        const base = index * s.step;
        const mod = introCard(elapsed, base);
        const r = R * mod.radius;
        let transform = `rotateY(${base}deg) translateZ(${r}px)`;
        if (index === frontIndex && s.fit !== 'focus') transform += ' scale(1.045)';
        if (mod.lift) transform += ` translateY(${mod.lift}px)`;
        card.style.transform = transform;

        const world = wrap(base + angle);
        const facing = Math.cos(world * TO_RAD);
        card.style.visibility = Math.abs(world) > 92 ? 'hidden' : '';
        const fade = s.depthFade * Math.pow((1 - facing) / 2, 1.25);
        card.style.setProperty('--cc-depth', fade.toFixed(3));
      }

      if (frontIndex !== activeRef.current) {
        activeRef.current = frontIndex;
        setActive(frontIndex);
        onChangeRef.current?.(frontIndex);
      }
    };

    const frame = (now) => {
      raf = 0;
      const s = settingsRef.current;
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
      state.last = now;
      const busy = advance(s, dt, now);
      render(s, now);
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else state.last = 0;
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        state.last = 0;
      } else wake();
    };

    const resize = new ResizeObserver(() => {
      measure();
      wake();
    });
    resize.observe(root);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
        state.last = 0;
      }
    });
    io.observe(root);

    document.addEventListener('visibilitychange', onVisibility);

    measure();
    render(settingsRef.current, performance.now());
    wake();

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useLayoutEffect(() => {
    measureRef.current();
    wakeRef.current();
  }, [radius, cardW, cardH, tilt, perspective, captions, count, fit]);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const focusIndex = useCallback((index) => {
    const state = stateRef.current;
    const s = settingsRef.current;
    let target = -index * s.step;
    target += 360 * Math.round((state.angle - target) / 360);
    state.target = target;
    state.holdUntil = performance.now() + 2800;
    wakeRef.current();
  }, []);

  const stepBy = useCallback((delta) => {
    const state = stateRef.current;
    const s = settingsRef.current;
    const base = state.target ?? Math.round(state.angle / s.step) * s.step;
    state.target = base - delta * s.step;
    state.holdUntil = performance.now() + 2800;
    wakeRef.current();
  }, []);

  // 供外部驱动: ref.current.goTo(i) / next() / prev()
  useImperativeHandle(
    ref,
    () => ({
      goTo: (index) => focusIndex(Math.max(0, Math.min(index, count - 1))),
      next: () => stepBy(1),
      prev: () => stepBy(-1),
      getActive: () => activeRef.current,
    }),
    [focusIndex, stepBy, count]
  );

  const updatePointer = (event) => {
    const rect = rootRef.current.getBoundingClientRect();
    const pointer = stateRef.current.pointer;
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  };

  const handlePointerDown = (event) => {
    const state = stateRef.current;
    state.suppressClick = false;
    if (!draggable || event.button !== 0) return;
    state.press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle: state.angle,
      moved: false,
      origin: 0,
      samples: [{ time: performance.now(), angle: state.angle }],
    };
  };

  const handlePointerMove = (event) => {
    const state = stateRef.current;
    if (event.pointerType === 'mouse') {
      state.pointer.inside = true;
      updatePointer(event);
    }
    const press = state.press;
    if (!press || press.id !== event.pointerId) {
      wakeRef.current();
      return;
    }
    const s = settingsRef.current;
    const delta = event.clientX - press.x;
    const cross = event.clientY - press.y;
    if (!press.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      if (Math.abs(cross) > Math.abs(delta) * 1.2 && event.pointerType !== 'mouse') {
        state.press = null;
        return;
      }
      press.moved = true;
      press.origin = delta;
      state.drag = true;
      state.target = null;
      state.velocity = 0;
      setDragging(true);
      try {
        rootRef.current.setPointerCapture(event.pointerId);
      } catch {
        /* 忽略：指针捕获失败不影响拖拽 */
      }
    }
    const perPixel = 180 / (Math.PI * s.radius * Math.max(state.fit, 0.05));
    state.angle = press.angle + (delta - press.origin) * perPixel;
    const now = performance.now();
    press.samples.push({ time: now, angle: state.angle });
    while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
    wakeRef.current();
  };

  const releasePointer = (event) => {
    const state = stateRef.current;
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    state.press = null;
    if (!press.moved) return;
    state.drag = false;
    setDragging(false);
    state.suppressClick = true;
    const s = settingsRef.current;
    const first = press.samples[0];
    const last = press.samples[press.samples.length - 1];
    const span = (last.time - first.time) / 1000;
    const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
    state.velocity = velocity;
    if (Math.abs(velocity) > 60) state.dir = Math.sign(velocity);
    if (s.snap) {
      const tau = 0.18 + s.momentum * 1.5;
      state.target = Math.round((state.angle + velocity * tau * 0.55) / s.step) * s.step;
    }
    wakeRef.current();
  };

  const handlePointerEnter = (event) => {
    if (event.pointerType !== 'mouse') return;
    stateRef.current.hover = true;
    wakeRef.current();
  };

  const handlePointerLeave = (event) => {
    const state = stateRef.current;
    if (event.pointerType === 'mouse') {
      state.hover = false;
      state.pointer.inside = false;
    }
    wakeRef.current();
  };

  const handleClick = (event) => {
    const state = stateRef.current;
    if (state.suppressClick) {
      state.suppressClick = false;
      return;
    }
    const card = event.target.closest?.('[data-cc-index]');
    if (!card) return;
    const index = Number(card.getAttribute('data-cc-index'));
    if (focusOnClick) focusIndex(index);
    onItemClick?.(list[index], index);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') stepBy(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') stepBy(-1);
    else if (event.key === 'Home') focusIndex(0);
    else if (event.key === 'End') focusIndex(Math.max(count - 1, 0));
    else if (event.key === 'Enter' || event.key === ' ') onItemClick?.(list[activeRef.current], activeRef.current);
    else return;
    event.preventDefault();
  };

  const current = list[active] || list[0];

  return (
    <div
      ref={rootRef}
      className={`circular-carousel ${className}`.trim()}
      style={{
        ...style,
        '--cc-fade': fadeColor,
        '--cc-radius': `${cornerRadius}px`,
        '--cc-inner': 0,
      }}
      data-ready={ready ? '' : undefined}
      data-draggable={draggable ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      data-fit={fit === 'focus' ? 'focus' : 'ring'}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="题库旋转卡面"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="circular-carousel__view">
        <div className="circular-carousel__stage" ref={stageRef}>
          <div className="circular-carousel__camera" ref={cameraRef}>
            <div className="circular-carousel__ring" ref={ringRef}>
              {list.map((item, index) => (
                <div
                  key={item.key ?? index}
                  ref={(element) => {
                    cardRefs.current[index] = element;
                  }}
                  className="circular-carousel__card"
                  data-cc-index={index}
                  data-active={index === Math.round(active) ? '' : undefined}
                  aria-hidden={Math.abs(wrap((index - active) * step)) > 92 ? 'true' : undefined}
                  style={{ '--cc-w': `${cardW}px`, '--cc-h': `${cardH}px` }}
                >
                  <div className="circular-carousel__face">
                    {item.content ?? (
                      <img className="circular-carousel__photo" src={item.src} alt={item.alt || ''} />
                    )}
                  </div>
                  <div className="circular-carousel__shade" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {captions && current && (
        <div className="circular-carousel__caption">
          <span className="circular-carousel__title">{current.title || current.alt}</span>
          {current.subtitle && <span className="circular-carousel__subtitle">{current.subtitle}</span>}
        </div>
      )}
    </div>
  );
}
