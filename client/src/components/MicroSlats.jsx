import { useEffect, useRef } from 'react';

/**
 * MicroSlats — 微竖条光栅背景
 *
 * 一片致密的竖向小光栅按行排布，随「涌浪」波动起伏，
 * 峰值处浮出白色高光，支持指针涟漪、入场渐显与景深雾化。
 * 纯 Canvas 2D 实现，无第三方依赖。
 *
 * 主要 props：
 *   preset        涌浪形态：'swell' | 'ripple' | 'wave'
 *   color         光栅主色
 *   glintColor    高光色
 *   backgroundColor 背景色
 *   slatWidth / slatHeight / gap / roundness  光栅尺寸与圆角
 *   interactive / cursorStrength / cursorSize  指针交互
 *   swirl / trail / lean / stretch             形态微调
 *   intro / introDuration                      入场动画
 *   scale / speed / direction / chop           整体缩放、速度、波向、错落
 *   glint / contrast / perspective / fog       高光、对比、透视、雾化
 *   paused                                     暂停动画
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function hexToRgb(input) {
  if (!input) return [0, 0, 0];
  let hex = String(input).trim().replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const num = parseInt(hex, 16);
  if (Number.isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const css = (c, alpha = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;

/** 圆角矩形路径（兼容不支持 roundRect 的浏览器） */
function roundRectPath(path, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  path.moveTo(x + rr, y);
  path.lineTo(x + w - rr, y);
  path.quadraticCurveTo(x + w, y, x + w, y + rr);
  path.lineTo(x + w, y + h - rr);
  path.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  path.lineTo(x + rr, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - rr);
  path.lineTo(x, y + rr);
  path.quadraticCurveTo(x, y, x + rr, y);
  path.closePath();
}

const RAMP_STEPS = 6;

export default function MicroSlats({
  preset = 'swell',
  color = '#A855F7',
  glintColor = '#ffffff',
  backgroundColor = '#120f17',
  slatWidth = 10,
  slatHeight = 25,
  gap = 3,
  roundness = 0.75,
  interactive = true,
  cursorStrength = 1,
  cursorSize = 40,
  swirl = 0,
  trail = 1.4,
  lean = 0,
  intro = true,
  scale = 1,
  speed = 0.6,
  direction = 250,
  chop = 0.55,
  stretch = 0,
  glint = 0.7,
  contrast = 1.25,
  perspective = 0.55,
  fog = 0.55,
  introDuration = 1.5,
  paused = false,
  className = '',
  style,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  // 动画循环读取最新 props，避免因 props 变化重建循环
  const configRef = useRef({});
  configRef.current = {
    preset, color, glintColor, backgroundColor, slatWidth, slatHeight, gap,
    roundness, interactive, cursorStrength, cursorSize, swirl, trail, lean,
    intro, scale, speed, direction, chop, stretch, glint, contrast,
    perspective, fog, introDuration, paused,
  };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    const size = { w: 1, h: 1 };
    const cursor = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, target: 0 };
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let dirty = true;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.w = Math.max(1, rect.width);
      size.h = Math.max(1, rect.height);
      canvas.width = Math.round(size.w * dpr);
      canvas.height = Math.round(size.h * dpr);
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cursor.x = cursor.tx = size.w * 0.5;
      cursor.y = cursor.ty = size.h * 0.45;
      dirty = true;
    };

    const draw = (time) => {
      const cfg = configRef.current;
      const { w, h } = size;
      if (w <= 1 || h <= 1) return;

      const base = hexToRgb(cfg.color);
      const tipColor = hexToRgb(cfg.glintColor);
      const bg = hexToRgb(cfg.backgroundColor);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css(bg);
      ctx.fillRect(0, 0, w, h);

      // 中央光晕
      const gx = w * 0.5;
      const gy = h * 0.45;
      const gr = Math.max(w, h) * 0.72;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      glow.addColorStop(0, css(base, 0.16));
      glow.addColorStop(0.55, css(base, 0.05));
      glow.addColorStop(1, css(bg, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // 亮度色阶（把雾化、对比、高光折算成有限几档，减少绘制调用）
      const ramp = [];
      const rampTip = [];
      for (let i = 0; i < RAMP_STEPS; i++) {
        const k = i / (RAMP_STEPS - 1);
        const c = mix(bg, base, 0.08 + 0.54 * k);
        ramp.push(css(c));
        rampTip.push(css(mix(c, tipColor, 0.45 + 0.45 * k)));
      }

      const unit = Math.max(3, cfg.slatWidth + cfg.gap);
      const cols = clamp(Math.floor(w / unit), 4, 110);
      const rowUnit = Math.max(12, (cfg.slatHeight + cfg.gap) * 1.5);
      const rows = clamp(Math.floor(h / rowUnit), 4, 20);
      const colStep = w / cols;
      const rowStep = h / rows;

      const dirRad = (cfg.direction * Math.PI) / 180;
      const cosD = Math.cos(dirRad);
      const sinD = Math.sin(dirRad);
      const introP = cfg.intro
        ? clamp(time / Math.max(0.2, cfg.introDuration), 0, 1)
        : 1;

      const bodies = Array.from({ length: RAMP_STEPS }, () => new Path2D());
      const tips = Array.from({ length: RAMP_STEPS }, () => new Path2D());

      for (let r = 0; r < rows; r++) {
        const ry = (r + 0.5) / rows;
        const depth =
          0.42 + 0.9 * Math.pow(ry, 0.8) * (1 + cfg.perspective * 0.5);
        // 宽度不得超过列间距，避免相邻光栅粘连成色块
        const sw = clamp(
          cfg.slatWidth * depth * cfg.scale,
          1.2,
          Math.max(1.2, colStep * 0.58)
        );
        const sh = clamp(
          cfg.slatHeight * depth * cfg.scale * (1 + cfg.stretch),
          3,
          rowStep * 1.05
        );
        const radius = sw * 0.5 * clamp(cfg.roundness, 0, 1) + sw * 0.1;

        // 行入场：由下往上依次浮现
        const rowIntro = cfg.intro
          ? clamp((introP - (1 - ry) * 0.3) / 0.7, 0, 1)
          : 1;
        if (rowIntro <= 0) continue;
        const easeIntro = rowIntro * rowIntro * (3 - 2 * rowIntro);

        for (let c = 0; c < cols; c++) {
          const nx = (c + 0.5) / cols - 0.5;
          const ny = ry - 0.5;

          let phase;
          if (cfg.preset === 'ripple') {
            phase =
              Math.hypot(nx * 1.6, ny * 2.1) * 4.4 -
              time * (0.9 + cfg.speed * 2.2);
          } else if (cfg.preset === 'wave') {
            phase =
              (nx * cosD + ny * sinD) * 3.6 -
              time * (0.7 + cfg.speed * 2);
          } else {
            phase =
              Math.hypot(nx * 1.15, ny * 1.5) * 3.2 -
              time * (0.7 + cfg.speed * 1.7);
          }
          phase += cfg.swirl * Math.sin(Math.atan2(ny, nx) * 2 + time * 0.5);

          const wave = Math.sin(
            phase + (c * cfg.chop + r * cfg.chop * 0.5) * 0.32
          );

          const cx = (c + 0.5) * colStep + cfg.lean * (ry - 0.5) * 42;
          const baseline = (r + 1) * rowStep;

          let infl = 0;
          if (cfg.interactive && cursor.strength > 0.002) {
            const d = Math.hypot(cx - cursor.x, baseline - sh * 0.6 - cursor.y);
            const radiusPx = Math.max(26, cfg.cursorSize * 3.4);
            const f = 1 - d / radiusPx;
            if (f > 0) infl = f * f * cfg.cursorStrength * cursor.strength;
          }

          const height = clamp(
            sh * (1 + wave * 0.45 * cfg.contrast + infl * 1.2) *
              (0.32 + 0.68 * easeIntro),
            1.5,
            rowStep * 1.5
          );
          const y = baseline - height;
          const x = cx - sw / 2;

          const fade = clamp(1 - cfg.fog * 0.85 * (1 - depth / 1.35), 0.16, 1);
          const lum = clamp(
            0.26 + wave * 0.3 * cfg.contrast + infl * 0.5 + fade * 0.24,
            0,
            1
          );
          const bucket = clamp(
            Math.round(lum * (RAMP_STEPS - 1)),
            0,
            RAMP_STEPS - 1
          );

          roundRectPath(bodies[bucket], x, y, sw, height, radius);

          // 高光只在波峰处点缀一小截，避免整体发白
          const shine = clamp(
            Math.max(0, wave) * cfg.glint * 0.9 + infl * 0.7,
            0,
            1
          );
          if (shine > 0.3) {
            const tipH = clamp(height * 0.16, 1, 3.2);
            const tipBucket = clamp(
              bucket + Math.round(shine * 2),
              0,
              RAMP_STEPS - 1
            );
            roundRectPath(tips[tipBucket], x, y, sw, tipH, radius * 0.8);
          }
        }
      }

      for (let i = 0; i < RAMP_STEPS; i++) {
        ctx.fillStyle = ramp[i];
        ctx.fill(bodies[i]);
        ctx.fillStyle = rampTip[i];
        ctx.fill(tips[i]);
      }

      // 底部渐隐，融入容器
      const bottom = ctx.createLinearGradient(0, h * 0.78, 0, h);
      bottom.addColorStop(0, css(bg, 0));
      bottom.addColorStop(1, css(bg, 0.85));
      ctx.fillStyle = bottom;
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const cfg = configRef.current;
      const moving = !cfg.paused && !reduceMotion;
      if (moving) elapsed += dt;

      // 指针平滑（trail 越大越黏）
      const rate = clamp(5 / Math.max(0.35, cfg.trail), 1, 20);
      cursor.x += (cursor.tx - cursor.x) * Math.min(1, rate * dt);
      cursor.y += (cursor.ty - cursor.y) * Math.min(1, rate * dt);
      const target = cfg.interactive ? cursor.target : 0;
      cursor.strength += (target - cursor.strength) * Math.min(1, 4 * dt);

      if (!moving && !dirty) return;
      dirty = false;
      draw(elapsed);
    };

    const onPointerMove = (event) => {
      const cfg = configRef.current;
      if (!cfg.interactive) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      if (inside) {
        cursor.tx = x;
        cursor.ty = y;
        cursor.target = 1;
      } else {
        cursor.target = 0;
      }
    };

    const onLeave = () => {
      cursor.target = 0;
    };

    resize();

    const onResize = () => {
      resize();
      dirty = true;
    };

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(onResize)
      : null;
    if (observer) observer.observe(host);
    else window.addEventListener('resize', onResize);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    if (reduceMotion) {
      elapsed = 1.6;
      draw(elapsed);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`micro-slats ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="micro-slats-canvas" />
    </div>
  );
}
