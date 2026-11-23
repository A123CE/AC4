import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPalaces,
  getPalaceById,
  createPalace,
  updatePalace,
  deletePalace,
  uploadPalaceAsset,
} from '../api';
import AnimatedList from '../components/AnimatedList';
import '../styles/curator.css';

/* ═══════════════════════════════════════════════════════════════
 *  编修台 — 古建筑档案增删改查
 *
 *  左侧: 建筑名录(检索)
 *  右侧: 分组表单 — 基本档案 / 关键数据 / 介绍讲解 /
 *        三维资源 / 历史沿革 / 趣味典故 / 图影
 * ═══════════════════════════════════════════════════════════════ */

const CATEGORY_OPTIONS = [
  '宫殿',
  '关隘',
  '楼阁',
  '坛庙',
  '石窟',
  '民居',
  '佛塔',
  '寺庙',
  '军事工程',
  '园林',
];

const EMPTY_FORM = {
  id: '',
  name: '',
  name_en: '',
  category: '',
  dynasty: '',
  built_year: '',
  region: '',
  city: '',
  order_num: '',
  height: '',
  area: '',
  style: '',
  significance: '',
  tagline: '',
  quote: '',
  quote_by: '',
  description: '',
  audio_guide: '',
  model_path: '',
  poster_path: '',
  tags: [],
  stats: [['', ''], ['', ''], ['', '']],
  timeline: [],
  funFacts: [],
  views: [],
};

/**
 * 接口数据 → 表单状态
 */
function toForm(palace) {
  const stats = Array.isArray(palace.stats) ? palace.stats : [];
  const statRows = stats.map((s) => [String(s?.[0] ?? ''), String(s?.[1] ?? '')]);
  while (statRows.length < 3) statRows.push(['', '']);

  return {
    ...EMPTY_FORM,
    id: palace.id || '',
    name: palace.name || '',
    name_en: palace.name_en || '',
    category: palace.category || '',
    dynasty: palace.dynasty || '',
    built_year: palace.built_year || '',
    region: palace.region || '',
    city: palace.city || '',
    order_num: palace.order_num ?? '',
    height: palace.height || '',
    area: palace.area || '',
    style: palace.style || '',
    significance: palace.significance || '',
    tagline: palace.tagline || '',
    quote: palace.quote || '',
    quote_by: palace.quote_by || '',
    description: palace.description || '',
    audio_guide: palace.audio_guide || '',
    model_path: palace.model_path || '',
    poster_path: palace.poster_path || '',
    tags: Array.isArray(palace.tags)
      ? palace.tags
      : String(palace.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
    stats: statRows,
    timeline: (palace.timeline || []).map((t) => ({
      year: t.year || '',
      event: t.event || '',
    })),
    funFacts: [...(palace.funFacts || [])],
    // 详情页「图影」读取 views_data；无该字段时回退到 palace_images
    views: Array.isArray(palace.views) && palace.views.length
      ? palace.views.map((v) => ({ src: v.src || '', zh: v.zh || '', en: v.en || '' }))
      : (palace.images || []).map((src) => ({ src, zh: '', en: '' })),
  };
}

/**
 * 英文名 → 建筑标识
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

/* ---------------- 基础控件 ---------------- */

function Field({ label, hint, wide, children }) {
  return (
    <label className={`curator-field${wide ? ' curator-field--wide' : ''}`}>
      <span className="curator-field-label">
        {label}
        {hint ? <em>{hint}</em> : null}
      </span>
      {children}
    </label>
  );
}

function Section({ index, title, desc, children, actions }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`curator-section${open ? '' : ' is-closed'}`}>
      <header className="curator-section-head" onClick={() => setOpen((v) => !v)}>
        <span className="curator-section-index">{String(index).padStart(2, '0')}</span>
        <div className="curator-section-text">
          <h3>{title}</h3>
          {desc ? <p>{desc}</p> : null}
        </div>
        {actions ? (
          <div className="curator-section-actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        ) : null}
        <i className={`fas fa-chevron-down curator-section-chevron`} />
      </header>
      {open ? <div className="curator-section-body">{children}</div> : null}
    </section>
  );
}

/**
 * 标签编辑器 — 回车或逗号添加, 点 × 移除
 */
function TagEditor({ value, onChange }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const next = draft
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (next.length === 0) return;
    const merged = [...value];
    next.forEach((t) => {
      if (!merged.includes(t)) merged.push(t);
    });
    onChange(merged);
    setDraft('');
  };

  return (
    <div className="curator-tags">
      <div className="curator-tag-list">
        {value.map((tag, i) => (
          <span className="curator-tag" key={`${tag}-${i}`}>
            {tag}
            <button
              type="button"
              aria-label={`移除 ${tag}`}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <i className="fas fa-xmark" />
            </button>
          </span>
        ))}
        <input
          className="curator-tag-input"
          value={draft}
          placeholder={value.length ? '继续添加…' : '如：重檐庑殿顶、世界遗产'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
        />
      </div>
    </div>
  );
}

/**
 * 资源上传按钮 — 受控组件, 上传状态由页面统一管理
 */
function AssetUpload({ accept, label, uploading, onFile, disabled }) {
  const inputRef = useRef(null);
  const busy = !!uploading?.busy;

  return (
    <div className={`curator-upload${busy ? ' is-busy' : ''}`}>
      <button
        type="button"
        className="curator-upload-btn"
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        disabled={disabled || busy}
      >
        <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-arrow-up-from-bracket'}`} />
        <span>{busy ? `上传中 ${uploading.percent}%` : label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {busy ? (
        <span className="curator-upload-track">
          <i style={{ width: `${uploading.percent}%` }} />
        </span>
      ) : null}
      {uploading?.error ? <p className="curator-upload-error">{uploading.error}</p> : null}
    </div>
  );
}

/* ---------------- 页面 ---------------- */

export default function CuratorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [idTouched, setIdTouched] = useState(false);
  // 资源上传状态 — model / poster 各自独立
  const [uploads, setUploads] = useState({ model: null, poster: null });
  const [dragKind, setDragKind] = useState(null);
  const modelInputRef = useRef(null);

  const isNew = editingId === null;
  const noticeTimer = useRef(0);

  // 同一时间只保留一条提示，新提示会取消旧提示的自动关闭
  const flash = useCallback((type, text) => {
    window.clearTimeout(noticeTimer.current);
    setNotice({ type, text });
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3600);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getPalaces({ include_drafts: '1' });
      setList(res.data?.data || []);
    } catch {
      flash('error', '名录加载失败，请确认后端服务已启动');
    } finally {
      setListLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // 检索过滤
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return list;
    return list.filter((p) =>
      `${p.name}${p.name_en || ''}${p.category || ''}${p.region || ''}${p.dynasty || ''}`
        .toLowerCase()
        .includes(kw)
    );
  }, [list, keyword]);

  // 读取单条档案
  const openPalace = useCallback(
    async (id) => {
      setFormLoading(true);
      setEditingId(id);
      setIdTouched(true);
      try {
        const res = await getPalaceById(id);
        if (res.data?.success) {
          setForm(toForm(res.data.data));
        } else {
          flash('error', '档案读取失败');
        }
      } catch {
        flash('error', '档案读取失败');
      } finally {
        setFormLoading(false);
      }
    },
    [flash]
  );

  // 新建
  const startNew = useCallback(
    (silent = false) => {
      const maxOrder = list.reduce((m, p) => Math.max(m, Number(p.order_num) || 0), 0);
      setEditingId(null);
      setIdTouched(false);
      setForm({ ...EMPTY_FORM, order_num: maxOrder + 1 });
      if (!silent) flash('info', '已新建空白档案，填写后保存即可收录');
    },
    [list, flash]
  );

  // /curator?new=1 — 从「上传模型」入口直达空白档案
  const autoNewHandled = useRef(false);
  useEffect(() => {
    if (autoNewHandled.current) return;
    if (searchParams.get('new') !== '1') return;
    if (listLoading || editingId !== null) return;
    autoNewHandled.current = true;
    startNew();
  }, [searchParams, listLoading, editingId, startNew]);

  const patch = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * 上传资源 — kind: 'model' | 'poster'
   * 成功后直接把返回路径写入对应字段，无需手动复制
   */
  const uploadFile = useCallback(
    async (kind, file) => {
      if (!file) return;
      const field = kind === 'model' ? 'model_path' : 'poster_path';
      const label = kind === 'model' ? '模型' : '封面图';

      setUploads((prev) => ({ ...prev, [kind]: { busy: true, percent: 0, error: '' } }));
      try {
        const res = await uploadPalaceAsset(kind, file, (percent) =>
          setUploads((prev) => ({ ...prev, [kind]: { ...prev[kind], percent } }))
        );
        if (res.data?.success) {
          const path = res.data.data.path;
          setForm((prev) => ({ ...prev, [field]: path }));
          setUploads((prev) => ({ ...prev, [kind]: { busy: false, percent: 100, error: '' } }));
          flash('success', `${label}已上传：${path}`);
        } else {
          setUploads((prev) => ({
            ...prev,
            [kind]: { busy: false, percent: 0, error: res.data?.error || '上传失败' },
          }));
        }
      } catch (err) {
        setUploads((prev) => ({
          ...prev,
          [kind]: {
            busy: false,
            percent: 0,
            error: err.response?.data?.error || '上传失败，请检查网络或文件大小',
          },
        }));
      }
    },
    [flash]
  );

  // 英文名联动建筑标识
  const handleNameEn = (value) => {
    setForm((prev) => ({
      ...prev,
      name_en: value,
      id: isNew && !idTouched ? slugify(value) : prev.id,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      flash('error', '建筑名称不能为空');
      return;
    }
    const views = form.views.filter((v) => v.src.trim());
    const payload = {
      ...form,
      name: form.name.trim(),
      tags: form.tags,
      stats: form.stats.filter((s) => String(s[0] || '').trim()),
      timeline: form.timeline.filter((t) => t.year.trim() || t.event.trim()),
      funFacts: form.funFacts.filter((f) => f.trim()),
      views,
      // palace_images 与 views_data 保持同源，兼容只读 image_path 的旧接口
      images: views.map((v) => v.src.trim()),
    };

    setSaving(true);
    try {
      if (isNew) {
        const res = await createPalace(payload);
        flash('success', res.data?.message || '档案已收录');
        await loadList();
        if (res.data?.data?.id) {
          await openPalace(res.data.data.id);
        }
      } else {
        const res = await updatePalace(editingId, payload);
        flash('success', res.data?.message || '档案已更新');
        await loadList();
        await openPalace(editingId);
      }
    } catch (err) {
      flash('error', err.response?.data?.error || '保存失败，请检查填写内容');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) return;
    const target = list.find((p) => p.id === editingId);
    const ok = window.confirm(
      `确定将「${target?.name || editingId}」从图录中移除吗？\n其沿革、典故与图影会一并删除，且不可恢复。`
    );
    if (!ok) return;

    setSaving(true);
    try {
      const res = await deletePalace(editingId);
      startNew(true);
      await loadList();
      flash('success', res.data?.message || '档案已删除');
    } catch (err) {
      flash('error', err.response?.data?.error || '删除失败');
    } finally {
      setSaving(false);
    }
  };

  /* ---- 关联数据编辑辅助 ---- */
  const updateRow = (key, index, patchRow) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((row, i) => (i === index ? { ...row, ...patchRow } : row)),
    }));
  };
  const removeRow = (key, index) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };
  const addRow = (key, row) => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], row] }));
  };

  return (
    <div className="curator-page">
      {/* ===== 顶部栏 ===== */}
      <header className="curator-topbar">
        <button type="button" className="curator-back" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" />
          <span>返回总览</span>
        </button>

        <div className="curator-title-wrap">
          <div className="curator-seal">编<br />修</div>
          <div>
            <h1 className="curator-title">编修台</h1>
            <p className="curator-subtitle">古建筑档案 · 模型与文本在线编修</p>
          </div>
        </div>

        <div className="curator-actions">
          <button type="button" className="curator-btn curator-btn--ghost" onClick={() => startNew()}>
            <i className="fas fa-plus" />
            <span>新建档案</span>
          </button>
          {!isNew && (
            <button
              type="button"
              className="curator-btn curator-btn--danger"
              onClick={handleDelete}
              disabled={saving}
            >
              <i className="fas fa-trash-can" />
              <span>删除</span>
            </button>
          )}
          <button
            type="button"
            className="curator-btn curator-btn--primary"
            onClick={handleSave}
            disabled={saving || formLoading}
          >
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
            <span>{saving ? '存档中…' : '保存档案'}</span>
          </button>
        </div>
      </header>

      {notice && (
        <div className={`curator-notice curator-notice--${notice.type}`}>
          <i
            className={`fas ${
              notice.type === 'error'
                ? 'fa-circle-exclamation'
                : notice.type === 'success'
                ? 'fa-circle-check'
                : 'fa-circle-info'
            }`}
          />
          <span>{notice.text}</span>
        </div>
      )}

      <div className="curator-body">
        {/* ===== 名录 ===== */}
        <aside className="curator-list">
          <div className="curator-list-head">
            <h2>建筑名录</h2>
            <span className="curator-list-count">{filtered.length} / {list.length}</span>
          </div>
          <div className="curator-list-search">
            <i className="fas fa-magnifying-glass" />
            <input
              value={keyword}
              placeholder="检索名称 / 类别 / 地区"
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {listLoading ? (
            <p className="curator-list-empty">
              <i className="fas fa-spinner fa-spin" /> 正在整理名录…
            </p>
          ) : filtered.length === 0 ? (
            <p className="curator-list-empty">
              <i className="fas fa-folder-open" /> 没有匹配的建筑
            </p>
          ) : (
            <AnimatedList
              className="curator-list-animated"
              scrollClassName="curator-list-items"
              items={filtered}
              getKey={(p) => p.id}
              selectedKey={editingId}
              animation="pop"
              stagger={0.028}
              gap={2}
              enableArrowNavigation
              onItemSelect={(p) => openPalace(p.id)}
              itemAs="button"
              itemClassName="curator-list-item"
              activeClassName="is-active"
              renderItem={(p) => (
                <>
                  <span className="curator-list-name">{p.name}</span>
                  <span className="curator-list-meta">
                    {[p.dynasty, p.category, p.region].filter(Boolean).join(' · ') || '待考'}
                  </span>
                  {p.status === 'draft' && (
                    <span className="curator-list-flag curator-list-flag--draft">
                      草稿
                    </span>
                  )}
                  {!p.model_path && <span className="curator-list-flag">缺模型</span>}
                </>
              )}
            />
          )}
        </aside>

        {/* ===== 编辑器 ===== */}
        <main className="curator-editor">
          {formLoading ? (
            <div className="curator-loading">
              <i className="fas fa-spinner fa-spin" />
              <p>正在调取档案…</p>
            </div>
          ) : (
            <>
              <div className="curator-editor-head">
                <div>
                  <p className="curator-editor-eyebrow">{isNew ? 'NEW ENTRY' : 'EDITING'}</p>
                  <h2 className="curator-editor-title">{form.name || '未命名建筑'}</h2>
                </div>
                <code className="curator-editor-id">{form.id || 'id 待生成'}</code>
              </div>

              {/* ===== 页首直传区 — 模型 / 封面 ===== */}
              <div className="curator-dropzone-wrap">
                <div
                  className={`curator-dropzone${dragKind === 'model' ? ' is-over' : ''}${
                    uploads.model?.busy ? ' is-busy' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => modelInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && modelInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragKind('model');
                  }}
                  onDragLeave={() => setDragKind(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragKind(null);
                    uploadFile('model', e.dataTransfer.files?.[0]);
                  }}
                >
                  <i
                    className={`fas ${
                      uploads.model?.busy ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'
                    }`}
                  />
                  <div className="curator-dropzone-text">
                    <p className="curator-dropzone-title">
                      {uploads.model?.busy
                        ? `模型上传中 ${uploads.model.percent}%`
                        : '上传三维模型'}
                    </p>
                    <p className="curator-dropzone-hint">
                      拖拽 .glb / .gltf 文件到此处，或点击选择文件（单文件 ≤ 300MB）
                    </p>
                  </div>
                  <input
                    ref={modelInputRef}
                    type="file"
                    accept=".glb,.gltf"
                    hidden
                    onChange={(e) => {
                      uploadFile('model', e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>

                <div className="curator-dropzone-side">
                  <div className="curator-asset-state">
                    <span className="curator-asset-tag">模型</span>
                    <code title={form.model_path}>{form.model_path || '尚未上传'}</code>
                  </div>
                  <div className="curator-asset-state">
                    <span className="curator-asset-tag">封面</span>
                    <code title={form.poster_path}>{form.poster_path || '尚未上传'}</code>
                  </div>
                  <div className="curator-dropzone-btns">
                    <AssetUpload
                      accept=".glb,.gltf"
                      label="选择模型文件"
                      uploading={uploads.model}
                      onFile={(file) => uploadFile('model', file)}
                    />
                    <AssetUpload
                      accept=".png,.jpg,.jpeg,.webp"
                      label="选择封面图"
                      uploading={uploads.poster}
                      onFile={(file) => uploadFile('poster', file)}
                    />
                  </div>
                  {uploads.model?.error ? (
                    <p className="curator-upload-error">{uploads.model.error}</p>
                  ) : null}
                  {uploads.poster?.error ? (
                    <p className="curator-upload-error">{uploads.poster.error}</p>
                  ) : null}
                </div>
              </div>

              {/* 01 基本档案 */}
              <Section index={1} title="基本档案" desc="名录中展示的身份信息">
                <div className="curator-grid">
                  <Field label="建筑名称" hint="必填">
                    <input
                      className="curator-input"
                      value={form.name}
                      onChange={(e) => patch('name', e.target.value)}
                      placeholder="如：应县木塔"
                    />
                  </Field>
                  <Field label="英文名" hint="用于生成建筑标识">
                    <input
                      className="curator-input"
                      value={form.name_en}
                      onChange={(e) => handleNameEn(e.target.value)}
                      placeholder="如：YINGXIAN WOODEN PAGODA"
                    />
                  </Field>
                  <Field label="建筑标识" hint="小写字母 / 数字 / 下划线">
                    <input
                      className="curator-input"
                      value={form.id}
                      disabled={!isNew}
                      onChange={(e) => {
                        setIdTouched(true);
                        patch('id', slugify(e.target.value));
                      }}
                      placeholder="yingxian_muta"
                    />
                  </Field>
                  <Field label="类别">
                    <input
                      className="curator-input"
                      list="curator-categories"
                      value={form.category}
                      onChange={(e) => patch('category', e.target.value)}
                      placeholder="如：佛塔"
                    />
                    <datalist id="curator-categories">
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="朝代">
                    <input
                      className="curator-input"
                      value={form.dynasty}
                      onChange={(e) => patch('dynasty', e.target.value)}
                      placeholder="如：辽"
                    />
                  </Field>
                  <Field label="建造年份">
                    <input
                      className="curator-input"
                      value={form.built_year}
                      onChange={(e) => patch('built_year', e.target.value)}
                      placeholder="如：1056 年建成"
                    />
                  </Field>
                  <Field label="地区">
                    <input
                      className="curator-input"
                      value={form.region}
                      onChange={(e) => patch('region', e.target.value)}
                      placeholder="如：山西"
                    />
                  </Field>
                  <Field label="地点">
                    <input
                      className="curator-input"
                      value={form.city}
                      onChange={(e) => patch('city', e.target.value)}
                      placeholder="如：朔州 · 应县"
                    />
                  </Field>
                  <Field label="名录排序" hint="数字越小越前">
                    <input
                      className="curator-input"
                      type="number"
                      value={form.order_num}
                      onChange={(e) => patch('order_num', e.target.value)}
                    />
                  </Field>
                </div>
              </Section>

              {/* 02 关键数据 */}
              <Section index={2} title="关键数据" desc="详情页指标卡与信息表">
                <div className="curator-grid">
                  <Field label="建筑高度">
                    <input
                      className="curator-input"
                      value={form.height}
                      onChange={(e) => patch('height', e.target.value)}
                      placeholder="如：67.31 米"
                    />
                  </Field>
                  <Field label="占地 / 规模">
                    <input
                      className="curator-input"
                      value={form.area}
                      onChange={(e) => patch('area', e.target.value)}
                      placeholder="如：72 万平方米"
                    />
                  </Field>
                  <Field label="建筑风格" wide>
                    <input
                      className="curator-input"
                      value={form.style}
                      onChange={(e) => patch('style', e.target.value)}
                      placeholder="如：八角五层 · 楼阁式木塔"
                    />
                  </Field>
                  <Field label="历史意义" wide>
                    <textarea
                      className="curator-textarea"
                      rows={2}
                      value={form.significance}
                      onChange={(e) => patch('significance', e.target.value)}
                      placeholder="一句话概括其在中国建筑史上的位置"
                    />
                  </Field>
                  <Field label="档案标语" hint="详情页副标题" wide>
                    <input
                      className="curator-input"
                      value={form.tagline}
                      onChange={(e) => patch('tagline', e.target.value)}
                      placeholder="如：千年木塔，无一钉一铁"
                    />
                  </Field>
                  <Field label="引文" wide>
                    <textarea
                      className="curator-textarea"
                      rows={2}
                      value={form.quote}
                      onChange={(e) => patch('quote', e.target.value)}
                      placeholder="如：如鸟斯革，如翚斯飞。"
                    />
                  </Field>
                  <Field label="引文出处">
                    <input
                      className="curator-input"
                      value={form.quote_by}
                      onChange={(e) => patch('quote_by', e.target.value)}
                      placeholder="如：《诗经 · 小雅 · 斯干》"
                    />
                  </Field>
                </div>

                <div className="curator-tags-field">
                  <span className="curator-field-label">标签</span>
                  <TagEditor value={form.tags} onChange={(v) => patch('tags', v)} />
                </div>
              </Section>

              {/* 03 指标卡 */}
              <Section
                index={3}
                title="指标卡"
                desc="详情页顶部三组核心数字"
                actions={
                  <button
                    type="button"
                    className="curator-mini-btn"
                    onClick={() => addRow('stats', ['', ''])}
                  >
                    <i className="fas fa-plus" /> 增加
                  </button>
                }
              >
                <div className="curator-rows">
                  {form.stats.map((row, i) => (
                    <div className="curator-row" key={`stat-${i}`}>
                      <input
                        className="curator-input curator-input--sm"
                        value={row[0]}
                        placeholder="数值，如 67.31 米"
                        onChange={(e) =>
                          patch(
                            'stats',
                            form.stats.map((r, idx) =>
                              idx === i ? [e.target.value, r[1]] : r
                            )
                          )
                        }
                      />
                      <input
                        className="curator-input curator-input--sm"
                        value={row[1]}
                        placeholder="说明，如 塔高"
                        onChange={(e) =>
                          patch(
                            'stats',
                            form.stats.map((r, idx) =>
                              idx === i ? [r[0], e.target.value] : r
                            )
                          )
                        }
                      />
                      <button
                        type="button"
                        className="curator-row-del"
                        onClick={() => patch('stats', form.stats.filter((_, idx) => idx !== i))}
                        aria-label="删除该指标"
                      >
                        <i className="fas fa-xmark" />
                      </button>
                    </div>
                  ))}
                </div>
              </Section>

              {/* 04 介绍与讲解 */}
              <Section index={4} title="介绍与讲解" desc="详情页正文与语音讲解稿">
                <Field label="建筑简介" wide>
                  <textarea
                    className="curator-textarea"
                    rows={4}
                    value={form.description}
                    onChange={(e) => patch('description', e.target.value)}
                    placeholder="沿革脉络、形制特征与保护现状"
                  />
                </Field>
                <Field label="语音讲解稿" wide>
                  <textarea
                    className="curator-textarea"
                    rows={4}
                    value={form.audio_guide}
                    onChange={(e) => patch('audio_guide', e.target.value)}
                    placeholder="供详情页「语音讲解」展开阅读"
                  />
                </Field>
              </Section>

              {/* 05 三维资源 */}
              <Section index={5} title="三维资源" desc="模型文件与封面影像，也可在页首直传">
                <div className="curator-grid">
                  <Field label="模型路径" hint="上传后自动填入" wide>
                    <div className="curator-asset">
                      <input
                        className="curator-input"
                        value={form.model_path}
                        onChange={(e) => patch('model_path', e.target.value)}
                        placeholder="uploads/xxx.glb 或 procedural:<key>"
                      />
                      <AssetUpload
                        accept=".glb,.gltf"
                        label="上传模型"
                        uploading={uploads.model}
                        onFile={(file) => uploadFile('model', file)}
                      />
                    </div>
                  </Field>

                  <Field label="封面影像" hint="首页画廊与卡片" wide>
                    <div className="curator-asset">
                      <input
                        className="curator-input"
                        value={form.poster_path}
                        onChange={(e) => patch('poster_path', e.target.value)}
                        placeholder="posters/xxx.webp"
                      />
                      <AssetUpload
                        accept=".png,.jpg,.jpeg,.webp"
                        label="上传封面"
                        uploading={uploads.poster}
                        onFile={(file) => uploadFile('poster', file)}
                      />
                    </div>
                    {form.poster_path && (
                      <div className="curator-poster-preview">
                        <img src={`/images/${form.poster_path}`} alt="封面预览" loading="lazy" />
                        <span>{form.poster_path}</span>
                      </div>
                    )}
                  </Field>
                </div>
              </Section>

              {/* 06 历史沿革 */}
              <Section
                index={6}
                title="历史沿革"
                desc="按年份排列的大事记"
                actions={
                  <button
                    type="button"
                    className="curator-mini-btn"
                    onClick={() => addRow('timeline', { year: '', event: '' })}
                  >
                    <i className="fas fa-plus" /> 增加
                  </button>
                }
              >
                {form.timeline.length === 0 ? (
                  <p className="curator-empty">暂无沿革条目，点击右上角「增加」录入</p>
                ) : (
                  <div className="curator-rows">
                    {form.timeline.map((row, i) => (
                      <div className="curator-row" key={`tl-${i}`}>
                        <input
                          className="curator-input curator-input--year"
                          value={row.year}
                          placeholder="年份"
                          onChange={(e) => updateRow('timeline', i, { year: e.target.value })}
                        />
                        <input
                          className="curator-input"
                          value={row.event}
                          placeholder="事件，如：辽清宁二年建成"
                          onChange={(e) => updateRow('timeline', i, { event: e.target.value })}
                        />
                        <button
                          type="button"
                          className="curator-row-del"
                          onClick={() => removeRow('timeline', i)}
                          aria-label="删除该条目"
                        >
                          <i className="fas fa-xmark" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* 07 趣味典故 */}
              <Section
                index={7}
                title="趣味典故"
                desc="详情页的短故事卡片"
                actions={
                  <button
                    type="button"
                    className="curator-mini-btn"
                    onClick={() => addRow('funFacts', '')}
                  >
                    <i className="fas fa-plus" /> 增加
                  </button>
                }
              >
                {form.funFacts.length === 0 ? (
                  <p className="curator-empty">暂无典故，点击右上角「增加」录入</p>
                ) : (
                  <div className="curator-rows">
                    {form.funFacts.map((fact, i) => (
                      <div className="curator-row curator-row--stack" key={`fact-${i}`}>
                        <textarea
                          className="curator-textarea"
                          rows={2}
                          value={fact}
                          placeholder="一条可独立阅读的营造细节或轶事"
                          onChange={(e) =>
                            patch(
                              'funFacts',
                              form.funFacts.map((f, idx) => (idx === i ? e.target.value : f))
                            )
                          }
                        />
                        <button
                          type="button"
                          className="curator-row-del"
                          onClick={() => removeRow('funFacts', i)}
                          aria-label="删除该典故"
                        >
                          <i className="fas fa-xmark" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* 08 图影 */}
              <Section
                index={8}
                title="图影"
                desc="详情页「图影」画廊，路径相对 /images"
                actions={
                  <button
                    type="button"
                    className="curator-mini-btn"
                    onClick={() => addRow('views', { src: '', zh: '', en: '' })}
                  >
                    <i className="fas fa-plus" /> 增加
                  </button>
                }
              >
                {form.views.length === 0 ? (
                  <p className="curator-empty">暂无图影，可上传封面后手动录入路径</p>
                ) : (
                  <div className="curator-rows">
                    {form.views.map((view, i) => (
                      <div className="curator-row" key={`view-${i}`}>
                        <span className="curator-thumb">
                          {view.src ? <img src={`/images/${view.src}`} alt="" loading="lazy" /> : null}
                        </span>
                        <input
                          className="curator-input"
                          value={view.src}
                          placeholder="posters/xxx.webp"
                          onChange={(e) => updateRow('views', i, { src: e.target.value })}
                        />
                        <input
                          className="curator-input curator-input--year"
                          value={view.zh}
                          placeholder="视图名，如 正面"
                          onChange={(e) => updateRow('views', i, { zh: e.target.value })}
                        />
                        <button
                          type="button"
                          className="curator-row-del"
                          onClick={() => removeRow('views', i)}
                          aria-label="删除该图影"
                        >
                          <i className="fas fa-xmark" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <div className="curator-editor-foot">
                <button
                  type="button"
                  className="curator-btn curator-btn--primary"
                  onClick={handleSave}
                  disabled={saving || formLoading}
                >
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
                  <span>{saving ? '存档中…' : isNew ? '收录此档案' : '保存修改'}</span>
                </button>
                {!isNew && (
                  <button
                    type="button"
                    className="curator-btn curator-btn--danger"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    <i className="fas fa-trash-can" />
                    <span>删除档案</span>
                  </button>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * 权限说明页 — 非管理员访问编修台时展示
 * 不做静默跳转，让「模型上传 / 档案编修」入口始终可见并说明开通方式
 */
export function CuratorGate() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="curator-page">
      <header className="curator-topbar">
        <button type="button" className="curator-back" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" />
          <span>返回总览</span>
        </button>
        <div className="curator-title-wrap">
          <div className="curator-seal">编<br />修</div>
          <div>
            <h1 className="curator-title">编修台</h1>
            <p className="curator-subtitle">古建筑档案 · 模型与文本在线编修</p>
          </div>
        </div>
      </header>

      <div className="curator-gate">
        <i className="fas fa-lock" />
        <h2>编修台需要授权</h2>
        <p>
          当前账号「<strong>{user?.username || '未登录'}</strong>」的角色为
          「<strong>{user?.role === 'admin' ? '管理员' : '浏览者'}</strong>」，
          上传模型与档案增删改仅向管理员开放。
        </p>
        <div className="curator-gate-cmd">
          <span>在项目根目录执行：</span>
          <code>node server/scripts/promote-admin.js {user?.username || '<你的用户名>'}</code>
        </div>
        <p className="curator-gate-hint">
          授权后需退出并重新登录，令牌才会携带编修权限。也可直接使用内置管理员账号
          <code> curator / curator2026</code>。
        </p>
        <div className="curator-gate-actions">
          <button type="button" className="curator-btn curator-btn--ghost" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left" />
            <span>返回总览</span>
          </button>
          <button
            type="button"
            className="curator-btn curator-btn--primary"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <i className="fas fa-right-to-bracket" />
            <span>切换账号</span>
          </button>
        </div>
      </div>
    </div>
  );
}
