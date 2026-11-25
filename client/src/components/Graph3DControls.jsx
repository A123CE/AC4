/**
 * 3D 图谱工具条（T-CARD-11 / T-G3D-13 / T-G3D-18）
 * 只负责按钮语义与 aria；视角与主题计算全部在 Graph3DScene / 面板层。
 */
export default function Graph3DControls({
  autoRotate = false,
  reducedMotion = false,
  panMode = false,
  sphereEnabled = false,
  graphTheme = 'dark',
  themeToggle = false,
  onToggleRotate,
  onTogglePan,
  onToggleTheme,
  onZoomIn,
  onZoomOut,
  onReset,
  t = (key, fallback) => fallback ?? key,
}) {
  return (
    <div
      className="enc-graph3d-controls"
      role="group"
      aria-label={t('encyclopedia.graph3d.stageLabel', '三维知识图谱')}
    >
      <button
        type="button"
        className="enc-graph3d-control"
        aria-pressed={autoRotate ? 'true' : 'false'}
        aria-disabled={reducedMotion ? 'true' : undefined}
        disabled={reducedMotion}
        onClick={onToggleRotate}
      >
        {autoRotate
          ? t('encyclopedia.graph3d.rotateOn', '暂停旋转')
          : t('encyclopedia.graph3d.rotateOff', '继续旋转')}
      </button>
      {sphereEnabled && (
        <button
          type="button"
          className="enc-graph3d-control"
          aria-pressed={panMode ? 'true' : 'false'}
          onClick={onTogglePan}
        >
          {panMode
            ? t('encyclopedia.graph3d.panOn', '平移中')
            : t('encyclopedia.graph3d.panOff', '平移模式')}
        </button>
      )}
      <button
        type="button"
        className="enc-graph3d-control"
        aria-label={t('encyclopedia.graph3d.zoomIn', '放大图谱')}
        onClick={onZoomIn}
      >
        ＋
      </button>
      <button
        type="button"
        className="enc-graph3d-control"
        aria-label={t('encyclopedia.graph3d.zoomOut', '缩小图谱')}
        onClick={onZoomOut}
      >
        －
      </button>
      {sphereEnabled && themeToggle && (
        <button
          type="button"
          className="enc-graph3d-control"
          data-theme-toggle="true"
          aria-pressed={graphTheme === 'light' ? 'true' : 'false'}
          aria-label={t('encyclopedia.graph3d.themeToggle', '切换主题')}
          onClick={onToggleTheme}
        >
          {graphTheme === 'light'
            ? t('encyclopedia.graph3d.themeDark', '深色主题')
            : t('encyclopedia.graph3d.themeLight', '浅色主题')}
        </button>
      )}
      {!sphereEnabled && (
        <button
          type="button"
          className="enc-graph3d-control"
          aria-label={t('encyclopedia.graph3d.reset', '复位视角')}
          onClick={() => onReset?.()}
        >
          {t('encyclopedia.graph3d.reset', '复位视角')}
        </button>
      )}
    </div>
  );
}