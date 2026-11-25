/**
 * 图谱复位浮层按钮（T-G3D-10）
 * 44×44 圆形，右下角定位，语义与键盘等价（Home / 0）。
 */
export default function SphereResetButton({ onReset, t = (key, fallback) => fallback ?? key }) {
  return (
    <button
      type="button"
      className="enc-graph3d-reset-fab"
      aria-label={t('encyclopedia.graph3d.reset', '复位视角')}
      title={t('encyclopedia.graph3d.reset', '复位视角')}
      onClick={() => onReset?.()}
    >
      <span aria-hidden="true">↺</span>
    </button>
  );
}