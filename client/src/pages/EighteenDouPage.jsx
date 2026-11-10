import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EighteenDouViewer from '../components/EighteenDouViewer';

/* ============================================
   清式十八斗 · 独立单体3D展示页（重构版）
   布局：左侧3D模型 + 右侧教育面板
   功能：拆解/组装交互 + 组件讲解
   ============================================ */

// ── 构件数据 ──
const COMPONENTS = [
  {
    id: 'dou',
    name: '斗',
    subtitle: 'Dǒu — Bracket Arm',
    icon: 'fa-cube',
    color: '#C4873E',
    description: '斗是斗拱体系中最基本的方形木块，位于柱头之上、梁枓之下。清代做法中，坐斗位于最下层，承托上方全部构件。斗体正面开V形槽口以卡拱，侧面刻有木纹装饰线，底部设榫头插入下一层构件的卯眼中。',
    details: [
      { label: '尺寸', value: '清式升斗类标准件' },
      { label: '材质', value: '橡木实木' },
      { label: '工艺', value: '榫卯结构' },
      { label: '位置', value: '柱头正上方' },
    ],
    history: [
      { year: '西周', event: '出现最早的陶制斗拱模型' },
      { year: '汉代', event: '斗拱成为宫殿建筑标配' },
      { year: '清代', event: '形成标准化"升斗"形制' },
    ],
    fact: '《营造法式》载："斗，其状如手，常向下。"斗的名称正来源于其形似捧物的双手。',
  },
  {
    id: 'arch',
    name: '拱',
    subtitle: 'Gǒng — Bracket Arm',
    icon: 'fa-layer-group',
    color: '#A0682E',
    description: '拱是横向伸出的弓形木构件，两端呈圆头状。在十八斗中，前后方向为短拱，左右方向为十字交拱。拱件通过单边V形槽嵌入斗体，形成稳固的榫卯连接。拱的端部圆头既美观又能分散荷载。',
    details: [
      { label: '形制', value: '单边V形开槽卡拱' },
      { label: '方向', value: '前后 + 左右十字交拱' },
      { label: '端部', value: '圆头收分' },
      { label: '数量', value: '十字交叉共四向' },
    ],
    history: [
      { year: '战国', event: '铜器纹饰中已见拱形构件' },
      { year: '唐代', event: '佛光寺东大殿保存完整唐拱' },
      { year: '宋代', event: '《营造法式》规范拱材断面' },
    ],
    fact: '拱的弓形设计是中国建筑智慧的结晶——利用木材的天然弹性，在地震时通过微小变形吸收能量，所谓"墙倒屋不塌"。',
  },
  {
    id: 'mortise',
    name: '榫卯',
    subtitle: 'Sǔn Mǎo — Mortise & Tenon',
    icon: 'fa-cut',
    color: '#6B4226',
    description: '榫卯是斗拱各构件之间的连接方式。斗体底部的凸出部分称为"榫头"，上方凹入的部分称为"卯眼"。榫头插入卯眼后，再通过拱件的水平卡接，形成无需一钉一铆的稳固结构。这种柔性连接使斗拱具有优异的抗震性能。',
    details: [
      { label: '榫头', value: '斗底凸出方形榫' },
      { label: '卯眼', value: '斗顶方形凹口' },
      { label: '连接', value: '卡拱+榫卯双重固定' },
      { label: '特点', value: '无钉、柔性、可拆卸' },
    ],
    history: [
      { year: '河姆渡', event: '距今7000年前的榫卯木构遗存' },
      { year: '明代', event: '官式建筑榫卯工艺达到巅峰' },
      { year: '现代', event: '榫卯结构启发现代抗震设计' },
    ],
    fact: '应县木塔（建于1056年）历经千年地震、战火仍屹立不倒，核心秘密就在于斗拱榫卯的柔性耗能机制。',
  },
  {
    id: 'structure',
    name: '结构',
    subtitle: 'Jié Gòu — Assembly Structure',
    icon: 'fa-sitemap',
    color: '#3E6B89',
    description: '十八斗由下层坐斗与上层撒斗叠合而成，前后左右四向拱件十字交叉插入。坐斗作为基础承托全部重量，撒斗缩小比例置于坐斗之上并旋转45°错位，形成稳定的层级结构。这种上下错位的构造方式有效传递了屋顶荷载至柱身。',
    details: [
      { label: '层级', value: '下层坐斗 + 上层撒斗' },
      { label: '角度', value: '上层旋转45°错位' },
      { label: '交拱', value: '前后左右十字交叉' },
      { label: '功能', value: '传递屋顶荷载至柱身' },
    ],
    history: [
      { year: '北魏', event: '云冈石窟可见早期斗拱组合' },
      { year: '辽代', event: '应县木塔斗拱种类达54种' },
      { year: '清代', event: '斗拱装饰性增强，结构功能弱化' },
    ],
    fact: '清代官式建筑中，斗拱不再承担主要结构功能，而是成为等级制度的象征——斗拱越多越复杂，建筑等级越高。',
  },
];

/**
 * 组件信息卡片（右侧面板使用）
 */
function ComponentCard({ comp, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '14px 16px',
        background: isActive ? 'rgba(184, 58, 42, 0.06)' : 'transparent',
        border: 'none',
        borderLeft: isActive ? `3px solid var(--vermillion)` : '3px solid transparent',
        borderRadius: isActive ? '0 10px 10px 0' : 0,
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'left',
        fontFamily: "'Noto Serif SC', serif",
      }}
      aria-pressed={isActive}
    >
      {/* 图标 */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: isActive ? `rgba(184,58,42,0.1)` : 'rgba(212,201,184,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.25s ease',
      }}>
        <i className={`fas ${comp.icon}`} style={{
          fontSize: '1rem',
          color: isActive ? 'var(--vermillion)' : 'var(--ink-muted)',
        }} />
      </div>

      {/* 文字 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.9rem', fontWeight: 600,
          color: isActive ? 'var(--vermillion)' : 'var(--ink)',
          letterSpacing: '1px',
          transition: 'color 0.25s ease',
        }}>{comp.name}</div>
        <div style={{
          fontSize: '0.68rem', color: 'var(--ink-muted)',
          marginTop: 2, letterSpacing: '0.5px',
        }}>{comp.subtitle}</div>
      </div>

      {/* 展开箭头 */}
      <i className={`fas fa-chevron-right`} style={{
        fontSize: '0.6rem', color: 'var(--ink-muted)',
        transform: isActive ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.25s ease',
      }} />
    </button>
  );
}

/**
 * 详情页头部（名称 + 图标）
 */
function DetailHeader({ comp }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      paddingBottom: 16, marginBottom: 4,
      borderBottom: `1px solid var(--border-warm)`,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: `linear-gradient(135deg, ${comp.color}22, ${comp.color}11)`,
        border: `1.5px solid ${comp.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`fas ${comp.icon}`} style={{ fontSize: '1.3rem', color: comp.color }} />
      </div>
      <div>
        <h3 style={{
          margin: 0, fontSize: '1.1rem', fontWeight: 700,
          color: 'var(--ink)', letterSpacing: '2px',
        }}>{comp.name}</h3>
        <p style={{
          margin: '2px 0 0', fontSize: '0.72rem',
          color: 'var(--ink-muted)', letterSpacing: '1px',
        }}>{comp.subtitle}</p>
      </div>
    </div>
  );
}

/**
 * 数据仪表盘
 */
function DetailDashboard({ items }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 10, marginBottom: 18,
    }}>
      {items.map((item) => (
        <div key={item.label} style={{
          background: 'var(--surface-card)',
          borderRadius: 10, padding: '12px 10px',
          textAlign: 'center',
          transition: 'transform 0.2s ease',
        }}>
          <div style={{
            fontSize: '0.6rem', color: 'var(--ink-muted)',
            letterSpacing: '1px', marginBottom: 4,
          }}>{item.label}</div>
          <div style={{
            fontSize: '0.78rem', color: 'var(--ink-light)',
            fontWeight: 600, lineHeight: 1.3,
          }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * 历史时间线
 */
function DetailTimeline({ events }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 16, position: 'relative' }}>
      {/* 竖线 */}
      <div style={{
        position: 'absolute', left: 5, top: 8, bottom: 8,
        width: 1, background: 'var(--border-warm)',
      }} />
      {events.map((ev, i) => (
        <div key={i} style={{
          display: 'flex', gap: 14, padding: '10px 0',
          position: 'relative',
        }}>
          {/* 点 */}
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--vermillion)',
            flexShrink: 0, marginTop: 3,
            boxShadow: '0 0 0 3px rgba(184,58,42,0.12)',
            zIndex: 1,
          }} />
          <div>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700,
              color: 'var(--vermillion)', letterSpacing: '0.5px',
            }}>{ev.year}</span>
            <p style={{
              margin: '2px 0 0', fontSize: '0.8rem',
              color: 'var(--ink-light)', lineHeight: 1.6,
            }}>{ev.event}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 典故引用
 */
function DetailFact({ text }) {
  return (
    <div style={{
      fontSize: '0.8rem', color: 'var(--ink-light)',
      lineHeight: 1.8, padding: '14px 16px',
      background: 'var(--surface-card)',
      borderRadius: 8,
      borderLeft: '2px solid var(--imperial-yellow)',
      letterSpacing: '0.5px',
      fontStyle: 'italic',
    }}>
      <i className="fas fa-quote-left fact-quote-icon" />
      {text}
    </div>
  );
}

/**
 * 右侧详情面板主体
 */
function DetailPanel({ component }) {
  if (!component) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12, padding: 40,
        textAlign: 'center',
      }}>
        <i className="fas fa-hand-pointer" style={{
          fontSize: '2.5rem', color: 'var(--border-warm)',
          opacity: 0.5,
        }} />
        <p style={{
          fontSize: '0.85rem', color: 'var(--ink-muted)',
          letterSpacing: '2px', lineHeight: 1.6,
        }}>
          点击左侧构件<br />查看详细解析
        </p>
      </div>
    );
  }

  const { description, details, history: hist, fact } = component;

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* 头部 */}
      <DetailHeader comp={component} />

      {/* 简介 */}
      <div style={{ marginBottom: 18 }}>
        <p style={{
          fontSize: '0.85rem', color: 'var(--ink-light)',
          lineHeight: 2, padding: '14px 16px',
          background: 'var(--surface-card)',
          borderRadius: 8,
          borderLeft: '3px solid var(--vermillion)',
          letterSpacing: '0.5px',
        }}>{description}</p>
      </div>

      {/* 数据仪表盘 */}
      <DetailDashboard items={details} />

      {/* 历史沿革 */}
      {hist && (
        <div style={{ marginBottom: 18 }}>
          <h4 style={{
            fontSize: '0.8rem', color: 'var(--vermillion)',
            fontWeight: 600, margin: '0 0 12px',
            letterSpacing: '2px',
          }}>
            <i className="fas fa-clock-rotate-left" style={{ marginRight: 6, opacity: 0.7 }} />
            历史沿革
          </h4>
          <DetailTimeline events={hist} />
        </div>
      )}

      {/* 典故 */}
      {fact && (
        <div style={{ marginTop: 18 }}>
          <h4 style={{
            fontSize: '0.8rem', color: 'var(--imperial-yellow)',
            fontWeight: 600, margin: '0 0 10px',
            letterSpacing: '2px',
          }}>
            <i className="fas fa-book-open" style={{ marginRight: 6, opacity: 0.7 }} />
            典籍记载
          </h4>
          <DetailFact text={fact} />
        </div>
      )}
    </div>
  );
}

/* ============================================
   页面主组件
   ============================================ */
export default function EighteenDouPage() {
  const navigate = useNavigate();
  const [autoRotate, setAutoRotate] = useState(true);
  const [noMotion, setNoMotion] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [explodeProgress, setExplodeProgress] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showExplodeHint, setShowExplodeHint] = useState(false);

  // 检测减少动画偏好
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setNoMotion(mq.matches);
    const h = (e) => setNoMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/');
      else if (e.key === ' ') { e.preventDefault(); setAutoRotate(v => !v); }
      else if (e.key === 'e' || e.key === 'E') toggleExplode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, exploded]);

  // 拆解缓动
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const toggleExplode = () => {
    setExploded(prev => {
      const next = !prev;
      let start = null;
      const duration = next ? 1500 : 1200;
      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const p = Math.min((timestamp - start) / duration, 1);
        setExplodeProgress(next ? easeInOutCubic(p) : 1 - easeInOutCubic(p));
        if (p < 1) requestAnimationFrame(animate);
        else if (!next) setShowExplodeHint(false);
      };
      requestAnimationFrame(animate);
      if (next) setShowExplodeHint(true);
      return next;
    });
  };

  const isActive = autoRotate && !noMotion;

  // 查找已选构件
  const activeComp = COMPONENTS.find(c => c.id === selectedComponent) || null;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#FFFFFF', position: 'relative',
      display: 'flex',
    }}>
      {/* ====== 左侧：3D模型区域 ====== */}
      <div style={{
        flex: 1, position: 'relative',
        borderRight: '1px solid var(--border-warm)',
        minWidth: 0,
      }}>
        <EighteenDouViewer
          autoRotate={isActive}
          explodeProgress={explodeProgress}
        />

        {/* 顶部栏 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          zIndex: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px', pointerEvents: 'none',
        }}>
          {/* 返回按钮 */}
          <button
            onClick={() => navigate('/')}
            style={{
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px',
              border: '1px solid rgba(200,180,150,0.3)',
              borderRadius: 24,
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(12px)',
              color: '#2C2C2C', cursor: 'pointer',
              fontFamily: "'Noto Serif SC', serif",
              fontSize: '0.82rem', letterSpacing: '1px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--vermillion)';
              e.currentTarget.style.color = 'var(--vermillion)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(200,180,150,0.3)';
              e.currentTarget.style.color = '#2C2C2C';
            }}
          >
            <i className="fas fa-arrow-left" /><span>返回首页</span>
          </button>

          {/* 标题 */}
          <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
            <h1 style={{
              margin: 0, fontSize: '1.35rem', fontWeight: 700,
              color: '#2C2C2C', letterSpacing: '6px',
            }}>清式十八斗</h1>
            <p style={{
              margin: '3px 0 0', fontSize: '0.68rem',
              color: '#8C8580', letterSpacing: '2px',
            }}>升斗类零件 · 单边开槽卡拱 · 榫卯结构</p>
          </div>

          {/* 操作按钮组 */}
          <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
            {/* 旋转开关 */}
            <button
              onClick={() => setAutoRotate(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `1px solid ${isActive ? 'var(--vermillion)' : 'rgba(200,180,150,0.3)'}`,
                background: isActive ? 'var(--vermillion)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                color: isActive ? '#fff' : '#8C8580',
                cursor: 'pointer', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 1px 8px rgba(184,58,42,0.25)' : '0 1px 6px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
              }}
              title={isActive ? '暂停旋转' : '开启旋转'}
            >
              <i className={`fas ${isActive ? 'fa-pause' : 'fa-play'}`} />
            </button>

            {/* 拆解按钮 */}
            <button
              onClick={toggleExplode}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `1px solid ${exploded ? 'var(--imperial-yellow)' : 'rgba(200,180,150,0.3)'}`,
                background: exploded ? 'var(--imperial-yellow)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                color: exploded ? '#fff' : '#8C8580',
                cursor: 'pointer', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: exploded ? '0 1px 8px rgba(200,150,12,0.25)' : '0 1px 6px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
              }}
              title={exploded ? '合拢复原' : '拆解结构'}
            >
              <i className={`fas ${exploded ? 'fa-compress-alt' : 'fa-expand-alt'}`} />
            </button>

            {/* 重置视图 */}
            <button
              onClick={() => setAutoRotate(true)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '1px solid rgba(200,180,150,0.3)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                color: '#8C8580', cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
              }}
              title="重置视图"
            >
              <i className="fas fa-redo" />
            </button>
          </div>
        </div>

        {/* 拆解模式提示 */}
        {showExplodeHint && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25, pointerEvents: 'none',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(200,150,12,0.3)',
            borderRadius: 14,
            padding: '10px 24px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            animation: 'fadeInUp 0.4s ease-out',
          }}>
            <span style={{
              fontSize: '0.8rem', color: 'var(--imperial-yellow)',
              letterSpacing: '2px',
              fontFamily: "'Noto Serif SC', serif",
            }}>
              <i className="fas fa-expand-alt" style={{ marginRight: 8 }} />
              拆解模式 — 按 E 合拢复原
            </span>
          </div>
        )}

        {/* 底部操作提示 */}
        <div style={{
          position: 'absolute', bottom: 12, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15, pointerEvents: 'none',
          fontSize: '0.65rem', color: 'var(--ink-muted)',
          letterSpacing: '1.5px', opacity: 0.6,
          whiteSpace: 'nowrap',
        }}>
          <i className="fas fa-hand-pointer" style={{ marginRight: 4, opacity: 0.5 }} />
          拖拽旋转 · 滚轮缩放 · 空格暂停 · E键拆解
        </div>
      </div>

      {/* ====== 右侧：教育面板 ====== */}
      <div style={{
        width: 380, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--paper-white)',
        overflow: 'hidden',
      }}>
        {/* 面板头部 */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border-warm)',
          flexShrink: 0,
        }}>
          <h3 style={{
            margin: 0, fontSize: '0.9rem', fontWeight: 600,
            color: 'var(--ink-light)', letterSpacing: '3px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="fas fa-book-open" style={{ color: 'var(--vermillion)', opacity: 0.7, fontSize: '0.85rem' }} />
            构件解析
          </h3>
          <p style={{
            margin: '4px 0 0', fontSize: '0.7rem',
            color: 'var(--ink-muted)', letterSpacing: '1px',
          }}>选择下方构件查看详细讲解</p>
        </div>

        {/* 构件列表 */}
        <div style={{
          flexShrink: 0,
          maxHeight: 200,
          overflowY: 'auto',
          borderBottom: '1px solid var(--border-warm)',
        }}>
          {COMPONENTS.map((comp) => (
            <ComponentCard
              key={comp.id}
              comp={comp}
              isActive={selectedComponent === comp.id}
              onClick={() => setSelectedComponent(
                selectedComponent === comp.id ? null : comp.id
              )}
            />
          ))}
        </div>

        {/* 拆解进度指示器 */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-warm)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: '0.7rem', color: 'var(--ink-muted)',
              letterSpacing: '1px',
            }}>拆解进度</span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 600,
              color: exploded ? 'var(--imperial-yellow)' : 'var(--ink-muted)',
            }}>
              {Math.round(explodeProgress * 100)}%
            </span>
          </div>
          <div style={{
            height: 4, borderRadius: 2,
            background: 'var(--border-warm)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${explodeProgress * 100}%`,
              borderRadius: 2,
              background: exploded
                ? 'linear-gradient(90deg, var(--vermillion), var(--imperial-yellow))'
                : 'var(--border-warm)',
              transition: 'width 0.1s linear, background 0.3s ease',
            }} />
          </div>
        </div>

        {/* 详情内容区 */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '0 20px',
        }}>
          <DetailPanel component={activeComp} />
        </div>

        {/* 底部信息栏 */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-warm)',
          flexShrink: 0,
          background: 'rgba(247,243,235,0.5)',
        }}>
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {[
              { icon: 'fa-cube', label: '清式升斗类', sub: '十八斗单体' },
              { icon: 'fa-layer-group', label: '下层坐斗', sub: '+ 上层撒斗' },
              { icon: 'fa-tree', label: '橡木实木', sub: '低多边形' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 8,
                border: '1px solid rgba(200,180,150,0.2)',
              }}>
                <i className={'fas ' + item.icon} style={{
                  fontSize: '0.75rem', color: 'var(--imperial-yellow)',
                  opacity: 0.7,
                }} />
                <div>
                  <span style={{
                    display: 'block', fontSize: '0.6rem',
                    color: 'var(--ink-muted)', letterSpacing: '0.5px',
                  }}>{item.label}</span>
                  <span style={{
                    display: 'block', fontSize: '0.65rem',
                    color: 'var(--ink-light)', marginTop: -1,
                  }}>{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 淡入动画 */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
