import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UiPrefsProvider } from '../../context/UiPrefsContext';
import { ClassroomViewProvider } from '../../context/ClassroomViewContext';
import RecommendationRail from '../RecommendationRail';
import ShareButton from '../ShareButton';
import AchievementToast from '../AchievementToast';

function Providers({ children }) {
  return (
    <UiPrefsProvider>
      <ClassroomViewProvider>{children}</ClassroomViewProvider>
    </UiPrefsProvider>
  );
}

function enableClassroomLocally() {
  localStorage.setItem(
    'ac4_classroom_v1',
    JSON.stringify({ v: 1, enabled: true, fontScale: 'large' })
  );
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('课堂模式隐藏矩阵', () => {
  it('推荐位在课堂模式下不渲染，关闭后恢复', () => {
    enableClassroomLocally();
    const hidden = render(
      <Providers>
        <RecommendationRail title="推荐" items={[{ id: 1, name: '太和殿' }]} />
      </Providers>
    );
    expect(hidden.container.firstChild).toBeNull();

    localStorage.clear();
    const visible = render(
      <Providers>
        <RecommendationRail title="推荐" items={[{ id: 1, name: '太和殿' }]} />
      </Providers>
    );
    expect(visible.container.querySelector('.recommendation-rail')).not.toBeNull();
  });

  it('分享按钮在课堂模式下不渲染', () => {
    enableClassroomLocally();
    const { container } = render(
      <Providers>
        <ShareButton type="palace" id="taihedian" />
      </Providers>
    );

    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('成就结算层在课堂模式下不弹层', () => {
    enableClassroomLocally();
    const { container } = render(
      <MemoryRouter>
        <Providers>
          <AchievementToast />
        </Providers>
      </MemoryRouter>
    );

    expect(container.querySelector('.achievement-toast')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('Provider 外使用回退为不隐藏', () => {
    const rail = render(
      <RecommendationRail title="推荐" items={[{ id: 2, name: '天坛' }]} />
    );
    expect(rail.container.querySelector('.recommendation-rail')).not.toBeNull();

    const share = render(<ShareButton type="palace" id="tiantan" />);
    expect(share.container.querySelector('button')).not.toBeNull();
  });
});