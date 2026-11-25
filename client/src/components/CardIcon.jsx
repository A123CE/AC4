/**
 * 卡片/图谱图标适配层（T-CARD-02）
 *
 * 双路径说明：
 * - 目标：hugeicons（@hugeicons/react 1.1.10 + @hugeicons/core-free-icons 4.4.0，MIT）
 * - 现状：安装时 npm 网络 ECONNRESET（OQ-08 受阻），当前以 Font Awesome 回退保证可构建；
 *   网络恢复后在此文件启用静态具名导入分支（禁止 import * / 动态 import）。
 * - 装饰图标默认 aria-hidden="true"，按钮语义由调用方 aria-label 承担。
 */
const FA_MAP = {
  cube: 'fa-cube',
  building: 'fa-landmark',
  left: 'fa-chevron-left',
  right: 'fa-chevron-right',
  pause: 'fa-pause',
  play: 'fa-play',
  refresh: 'fa-rotate',
};

export default function CardIcon({
  name = 'cube',
  size = 20,
  className = '',
  label,
  title,
  ...rest
}) {
  const iconClass = FA_MAP[name] || FA_MAP.cube;
  return (
    <i
      className={`fas ${iconClass}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size }}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label || undefined}
      title={title || undefined}
      {...rest}
    />
  );
}

export { FA_MAP };