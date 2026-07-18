import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
 *  时空地图 · 宫阙图志
 *
 *  5张故宫主题舆图切换:
 *   游览路线 / 建筑形式 / 建筑等级 / 原状陈列 / 常设专馆
 *
 *  交互: 拖拽平移 / 滚轮缩放 / 点击建筑跳转3D / 悬停标注
 * ═══════════════════════════════════════════════════════════════ */

const SHEETS = {
  route:      { src: '/maps/游览路线.png', label: '游览路线', icon: 'fa-route' },
  form:       { src: '/maps/建筑形式.png', label: '建筑形式', icon: 'fa-shapes' },
  rank:       { src: '/maps/建筑等级.png', label: '建筑等级', icon: 'fa-crown' },
  original:   { src: '/maps/原状陈列.png', label: '原状陈列', icon: 'fa-landmark' },
  exhibition: { src: '/maps/常设专馆.png', label: '常设专馆', icon: 'fa-building-columns' },
};

const LEGENDS = {
  route:      [{ color: '#c0392b', label: '暖色建筑' }, { color: '#3e6b89', label: '冷色建筑' }, { color: '#f1c40f', label: '游览路线' }],
  form:       [{ color: '#c75d40', label: '庑殿顶' }, { color: '#b26730', label: '歇山顶' }, { color: '#6caf89', label: '攒尖顶' }, { color: '#9c8366', label: '门楼' }],
  rank:       [{ color: '#d1603c', label: '最高级' }, { color: '#efae63', label: '高等级' }, { color: '#57c482', label: '中等级' }],
  original:   [{ color: '#8a3032', label: '原状陈列' }, { color: '#d6af76', label: '非原状' }],
  exhibition: [{ color: '#2c5f7c', label: '常设专馆' }, { color: '#deb47b', label: '非专馆' }],
};

var BLD = [
  { id: 'shenwumen',    label: '神武门', name: '神武门',   epoch: '明代永乐', cx: 50, cy: 3.5,  rx: 8, ry: 2.5, zone: '内廷' },
  { id: 'kunninggong',  label: '坤宁宫', name: '坤宁宫',   epoch: '明代永乐', cx: 50, cy: 11,   rx: 9, ry: 4,   zone: '内廷' },
  { id: 'jiaotaidian',  label: '交泰殿', name: '交泰殿',   epoch: '明代嘉靖', cx: 50, cy: 17,   rx: 6, ry: 3,   zone: '内廷' },
  { id: 'qianqinggong', label: '乾清宫', name: '乾清宫',   epoch: '明代永乐', cx: 50, cy: 24,   rx: 9, ry: 4,   zone: '内廷' },
  { id: 'qianqingmen',  label: '乾清门', name: '乾清门',   epoch: '清代顺治', cx: 50, cy: 32,   rx: 7, ry: 2.5, zone: '分界' },
  { id: 'baohedian',    label: '保和殿', name: '保和殿',   epoch: '明代永乐', cx: 50, cy: 53,   rx: 10, ry: 4,  zone: '外朝' },
  { id: 'zhonghedian',  label: '中和殿', name: '中和殿',   epoch: '明代永乐', cx: 50, cy: 59,   rx: 6, ry: 3,   zone: '外朝' },
  { id: 'taihedian',    label: '太和殿', name: '太和殿',   epoch: '明代永乐', cx: 50, cy: 68,   rx: 11, ry: 4.5,zone: '外朝' },
  { id: 'taihemen',     label: '太和门', name: '太和门',   epoch: '明代永乐', cx: 50, cy: 81,   rx: 8, ry: 3,   zone: '外朝' },
  { id: 'wumen',        label: '午门',   name: '午门',     epoch: '明代永乐', cx: 50, cy: 90,   rx: 10, ry: 3,  zone: '外朝' },
];

var ZOOM_MIN = 0.3, ZOOM_MAX = 5, ZOOM_DEF = 1.05;

export default function MapPage() {
  var nav = useNavigate();
  var canvasRef = useRef(null);
  var containerRef = useRef(null);

  var [view, setView] = useState('route');
  var [images, setImages] = useState({});
  var [ready, setReady] = useState(false);
  var [hoverId, setHoverId] = useState(null);
  var [hoverXY, setHoverXY] = useState(null);
  var [ripple, setRipple] = useState(null);

  // 用 tick 驱动重绘 — 拖拽/缩放只改 ref 不触发 render, 靠 tick 轮询
  var [tick, setTick] = useState(0);

  var tx = useRef({ x: 0, y: 0, zoom: ZOOM_DEF });
  var drag = useRef({ on: false, lx: 0, ly: 0, moved: false });
  var pinch = useRef(null);
  var needDraw = useRef(true);

  // 预加载
  useEffect(function() {
    var ok = true;
    var ks = Object.keys(SHEETS);
    Promise.all(ks.map(function(k) {
      return new Promise(function(res) {
        var img = new Image();
        img.onload = function() { res({ k: k, img: img }); };
        img.onerror = function() { res({ k: k, img: null }); };
        img.src = SHEETS[k].src;
      });
    })).then(function(arr) {
      if (!ok) return;
      var m = {};
      arr.forEach(function(r) { if (r.img) m[r.k] = r.img; });
      setImages(m); setReady(true);
    });
    return function() { ok = false; };
  }, []);

  // 自适应
  var fit = useCallback(function() {
    var c = containerRef.current, img = images[view]; if (!c || !img) return;
    var s = Math.min(c.clientWidth * 0.9 / img.naturalWidth, c.clientHeight * 0.9 / img.naturalHeight, 1.8);
    tx.current = { x: (c.clientWidth - img.naturalWidth * s) / 2, y: (c.clientHeight - img.naturalHeight * s) / 2, zoom: s };
    needDraw.current = true;
  }, [images, view]);

  // Canvas 绘制
  var paint = useCallback(function() {
    var cv = canvasRef.current, ct = containerRef.current, img = images[view];
    if (!cv || !ct || !img) return;

    needDraw.current = false;

    var dpr = window.devicePixelRatio || 1;
    var cw = ct.clientWidth, ch = ct.clientHeight;
    cv.width = cw * dpr; cv.height = ch * dpr;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#EBE4D5'; ctx.fillRect(0, 0, cw, ch);

    var T = tx.current;
    var iw = img.naturalWidth, ih = img.naturalHeight;

    // 底图
    ctx.save(); ctx.translate(T.x, T.y); ctx.scale(T.zoom, T.zoom); ctx.drawImage(img, 0, 0); ctx.restore();
    function sx2(pctX, pctY) { return T.x + pctX / 100 * iw * T.zoom; }
    function sy2(pctX, pctY) { return T.y + pctY / 100 * ih * T.zoom; }

    // 建筑悬停
    if (hoverId && hoverXY) {
      var hv = BLD.find(function(h) { return h.id === hoverId; });
      if (hv) {
        var hx = sx2(hv.cx, hv.cy), hy = sy2(hv.cx, hv.cy);
        var hw = hv.rx / 100 * iw * T.zoom * 2;
        var hh = hv.ry / 100 * ih * T.zoom * 2;

        ctx.save();
        var grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, Math.max(hw, hh) * 2.5);
        grd.addColorStop(0, 'rgba(243,156,18,0.25)'); grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd; ctx.fillRect(hx - hw * 3, hy - hh * 3, hw * 6, hh * 6);

        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.roundRect(hx - hw/2 - 2, hy - hh/2 - 2, hw + 4, hh + 4, 6); ctx.stroke();
        ctx.shadowBlur = 0;

        var cardW = 140, cardH = 42;
        var cx = hx - cardW / 2, cy = hy - hh/2 - cardH - 50;
        ctx.fillStyle = 'rgba(40,24,12,0.94)'; ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 10); ctx.fill();
        ctx.fillStyle = '#F5F0E5'; ctx.font = '700 13px "Noto Serif SC",serif'; ctx.textAlign = 'center';
        ctx.fillText(hv.name, hx, cy + 15);
        ctx.font = '400 10px "Noto Serif SC",serif'; ctx.fillStyle = 'rgba(245,240,229,0.7)';
        ctx.fillText(hv.epoch + ' · ' + hv.zone, hx, cy + 32);
        ctx.restore();
      }
    }

    // 点击涟漪
    if (ripple) {
      var el = (Date.now() - ripple.t) / 1000;
      if (el < 0.7) {
        ctx.save(); ctx.globalAlpha = 1 - el / 0.7;
        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 3 * (1 - el / 0.7);
        ctx.beginPath(); ctx.arc(ripple.sx, ripple.sy, el * 60, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }, [images, view, hoverId, hoverXY, ripple]);

  var paintRef = useRef(paint);
  paintRef.current = paint;

  // 渲染循环 — 每帧检查是否需要绘制
  useEffect(function() {
    var running = true;
    function loop() {
      if (!running) return;
      if (needDraw.current) paintRef.current();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return function() { running = false; };
  }, []);

  // 图片加载 / 切换 / hover 变化时标记绘制
  useEffect(function() { needDraw.current = true; }, [ready, images, view, hoverId, hoverXY, ripple]);
  useEffect(function() { if (ready && images[view]) { fit(); } }, [view, ready]);

  // 坐标转换
  function toImg(px, py) {
    var img = images[view]; if (!img) return null;
    var T = tx.current;
    return { x: (px - T.x) / (img.naturalWidth * T.zoom) * 100, y: (py - T.y) / (img.naturalHeight * T.zoom) * 100 };
  }
  function hitTest(px, py) {
    var p = toImg(px, py); if (!p) return null;
    for (var i = 0; i < BLD.length; i++) {
      var h = BLD[i];
      if (Math.abs(p.x - h.cx) < h.rx && Math.abs(p.y - h.cy) < h.ry) return h.id;
    }
    return null;
  }

  // 鼠标
  function onMD(e) { if (e.button === 0) drag.current = { on: true, lx: e.clientX, ly: e.clientY, moved: false }; }
  function onMM(e) {
    var r = containerRef.current ? containerRef.current.getBoundingClientRect() : null; if (!r) return;
    var scx = e.clientX - r.left, scy = e.clientY - r.top;
    if (drag.current.on) {
      tx.current.x += e.clientX - drag.current.lx; tx.current.y += e.clientY - drag.current.ly;
      drag.current.lx = e.clientX; drag.current.ly = e.clientY;
      if (Math.abs(e.movementX) > 1 || Math.abs(e.movementY) > 1) drag.current.moved = true;
      needDraw.current = true;
    } else {
      var hit = hitTest(scx, scy); setHoverId(hit); setHoverXY(hit ? { x: scx, y: scy } : null);
      if (containerRef.current) containerRef.current.style.cursor = hit ? 'pointer' : 'grab';
    }
  }
  function onMU(e) {
    if (!drag.current.on) return; drag.current.on = false;
    if (!drag.current.moved) {
      var r = containerRef.current ? containerRef.current.getBoundingClientRect() : null; if (!r) return;
      var hit = hitTest(e.clientX - r.left, e.clientY - r.top);
      if (hit) { setRipple({ t: Date.now(), sx: e.clientX - r.left, sy: e.clientY - r.top }); setTimeout(function() { nav('/', { state: { selectPalaceId: hit } }); }, 250); }
    }
  }
  function onML() { drag.current.on = false; setHoverId(null); needDraw.current = true; }
  function onW(e) {
    e.preventDefault();
    var r = containerRef.current ? containerRef.current.getBoundingClientRect() : null; if (!r) return;
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var nz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, tx.current.zoom * (1 - e.deltaY * 0.001)));
    var ratio = nz / tx.current.zoom;
    tx.current.x = mx - (mx - tx.current.x) * ratio; tx.current.y = my - (my - tx.current.y) * ratio; tx.current.zoom = nz;
    needDraw.current = true;
  }
  // 触摸
  function onTS(e) {
    if (e.touches.length === 1) { drag.current = { on: true, lx: e.touches[0].clientX, ly: e.touches[0].clientY, moved: false }; }
    else if (e.touches.length === 2) {
      drag.current.on = false;
      pinch.current = { dist: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), zoom: tx.current.zoom, cx: (e.touches[0].clientX + e.touches[1].clientX) / 2, cy: (e.touches[0].clientY + e.touches[1].clientY) / 2, tx: tx.current.x, ty: tx.current.y };
    }
  }
  function onTM(e) {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current.on) { tx.current.x += e.touches[0].clientX - drag.current.lx; tx.current.y += e.touches[0].clientY - drag.current.ly; drag.current.lx = e.touches[0].clientX; drag.current.ly = e.touches[0].clientY; needDraw.current = true; }
    else if (e.touches.length === 2 && pinch.current) {
      var p = pinch.current, nd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      var nz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, p.zoom * nd / p.dist)), zr = nz / p.zoom;
      tx.current.x = p.cx - (p.cx - p.tx) * zr; tx.current.y = p.cy - (p.cy - p.ty) * zr; tx.current.zoom = nz;
      needDraw.current = true;
    }
  }
  function onTE() { drag.current.on = false; pinch.current = null; }

  function zoomBy(factor) {
    var c = containerRef.current; if (!c) return;
    var z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, tx.current.zoom * factor));
    var ratio = z / tx.current.zoom;
    tx.current.x = c.clientWidth/2 - (c.clientWidth/2 - tx.current.x) * ratio;
    tx.current.y = c.clientHeight/2 - (c.clientHeight/2 - tx.current.y) * ratio;
    tx.current.zoom = z;
    needDraw.current = true;
  }

  return (
    <div className="map-v4-page">
      <div className="map-v4-topbar">
        <button className="map-v4-back" onClick={function() { nav('/'); }}><i className="fas fa-arrow-left" /> 返回</button>
        <h1 className="map-v4-title"><i className="fas fa-map" /> 时空地图</h1>
        <span className="map-v4-sub">紫禁城舆图</span>
        <div className="map-v4-tabs">
          {Object.entries(SHEETS).map(function(e) { var k = e[0], s = e[1]; return (
            <button key={k} className={'map-v4-tab' + (view === k ? ' active' : '')} onClick={function() { setView(k); }} title={s.label}>
              <i className={'fas ' + s.icon} /><span>{s.label}</span><div className="map-v4-tab-glare" />
            </button>
          );})}
        </div>
      </div>

      <div className="map-v4-main" ref={containerRef}>
        {!ready && <div className="map-v4-loading"><div className="loading-spinner" /><span>绘制舆图…</span></div>}
        <canvas ref={canvasRef} className="map-v4-canvas" style={{ cursor: 'grab' }}
          onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onML}
          onWheel={onW} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} />

        <div className="map-v4-zoom">
          <button onClick={function(){zoomBy(1.35)}}><i className="fas fa-plus" /></button>
          <button onClick={function(){zoomBy(1/1.35)}}><i className="fas fa-minus" /></button>
          <button onClick={fit}><i className="fas fa-expand" /></button>
        </div>

        <div className="map-v4-legend">
          <span className="map-v4-legend-title">{SHEETS[view].label}</span>
          {LEGENDS[view].map(function(l, i) { return (
            <div key={i} className="map-v4-legend-item"><span className="map-v4-legend-swatch" style={{ background: l.color }} /><span>{l.label}</span></div>
          );})}
        </div>
      </div>

      <div className="map-v4-hint" style={{ textAlign: 'center', padding: '8px 0', borderTop: '1px solid #C4B8A0', flexShrink: 0 }}><i className="fas fa-hand-pointer"/> 拖拽平移 · 滚轮缩放 · 点击建筑跳转3D浏览</div>
    </div>
  );
}
