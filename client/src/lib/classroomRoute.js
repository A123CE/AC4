/**
 * 课堂只读链接的 URL 解析
 * 只认 view=classroom / font / readonly，不读取任何身份参数。
 */

const FONT_SCALES = new Set(['standard', 'large', 'xlarge']);

export function normalizeFontScale(value) {
  return FONT_SCALES.has(value) ? value : 'large';
}

export function readClassroomRoute(search = typeof window !== 'undefined' ? window.location.search : '') {
  const params = new URLSearchParams(search || '');
  const isClassroom = params.get('view') === 'classroom';

  return {
    isClassroom,
    readOnly: isClassroom && params.get('readonly') === '1',
    fontScale: normalizeFontScale(params.get('font')),
    hasFont: params.has('font'),
  };
}

export function isReadOnlySession() {
  return readClassroomRoute().readOnly;
}

export default { normalizeFontScale, readClassroomRoute, isReadOnlySession };