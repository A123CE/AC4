import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { UiPrefsProvider, useUiPrefs } from '../UiPrefsContext';
import { ClassroomViewProvider, useClassroomView } from '../ClassroomViewContext';
import { buildClassroomLink } from '../../lib/share';

vi.mock('../../api', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

import * as api from '../../api';

function wrapper({ children }) {
  return (
    <AuthProvider>
      <UiPrefsProvider>
        <ClassroomViewProvider>{children}</ClassroomViewProvider>
      </UiPrefsProvider>
    </AuthProvider>
  );
}

function useProbe() {
  return {
    prefs: useUiPrefs(),
    classroom: useClassroomView(),
  };
}

function loginStoredUser() {
  localStorage.setItem(
    'palace_auth',
    JSON.stringify({ token: 'test-token', user: { id: 1, username: 'tester' } })
  );
}

function defaultPrefs() {
  return {
    classroom_mode: false,
    classroom_font_scale: 'large',
    minor_mode: 'unset',
    leaderboard_opt_out: false,
  };
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  delete document.documentElement.dataset.classroom;
  delete document.documentElement.dataset.font;

  api.getPreferences.mockResolvedValue({
    data: { success: true, data: defaultPrefs() },
  });
  api.updatePreferences.mockResolvedValue({ data: { success: true, data: {} } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ClassroomViewContext', () => {
  it('只读链接启用课堂视图且不写存储、不发请求', async () => {
    window.history.replaceState({}, '', '/quiz?view=classroom&font=xlarge&readonly=1');

    const { result } = renderHook(useProbe, { wrapper });

    expect(result.current.classroom.enabled).toBe(true);
    expect(result.current.classroom.readOnly).toBe(true);
    expect(result.current.classroom.fontScale).toBe('xlarge');
    expect(result.current.classroom.hidden.share).toBe(true);
    expect(document.documentElement.dataset.classroom).toBe('on');

    await act(async () => {
      await result.current.prefs.updatePrefs({ classroomMode: false });
    });

    expect(localStorage.getItem('ac4_classroom_v1')).toBeNull();
    expect(api.updatePreferences).not.toHaveBeenCalled();
  });

  it('游客刷新后从本机键恢复课堂模式', () => {
    localStorage.setItem(
      'ac4_classroom_v1',
      JSON.stringify({ v: 1, enabled: true, fontScale: 'standard', updatedAt: '2026-01-01T00:00:00.000Z' })
    );

    const { result } = renderHook(useProbe, { wrapper });

    expect(result.current.prefs.uiPrefs.classroomMode).toBe(true);
    expect(result.current.classroom.enabled).toBe(true);
    expect(result.current.classroom.fontScale).toBe('standard');
    expect(document.documentElement.dataset.font).toBe('standard');
  });

  it('登录用户以服务端值优先，并同步本机课堂开关', async () => {
    loginStoredUser();
    localStorage.setItem(
      'ac4_classroom_v1',
      JSON.stringify({ v: 1, enabled: true, fontScale: 'xlarge' })
    );
    api.getPreferences.mockResolvedValue({
      data: {
        success: true,
        data: {
          classroom_mode: true,
          classroom_font_scale: 'standard',
          minor_mode: 'minor',
          leaderboard_opt_out: true,
        },
      },
    });

    const { result } = renderHook(useProbe, { wrapper });

    await waitFor(() => {
      expect(result.current.prefs.uiPrefs.classroomFontScale).toBe('standard');
    });
    expect(result.current.prefs.uiPrefs.classroomMode).toBe(true);
    expect(result.current.prefs.uiPrefs.minorMode).toBe('minor');
    expect(result.current.prefs.uiPrefs.leaderboardOptOut).toBe(true);
    expect(api.updatePreferences).not.toHaveBeenCalled();
  });

  it('服务端默认且本机已开启时只同步一次', async () => {
    loginStoredUser();
    localStorage.setItem(
      'ac4_classroom_v1',
      JSON.stringify({ v: 1, enabled: true, fontScale: 'xlarge' })
    );

    const { result } = renderHook(useProbe, { wrapper });

    await waitFor(() => {
      expect(api.updatePreferences).toHaveBeenCalledTimes(1);
    });
    expect(api.updatePreferences).toHaveBeenCalledWith({
      classroom_mode: true,
      classroom_font_scale: 'xlarge',
    });
    expect(result.current.prefs.uiPrefs.classroomMode).toBe(true);
  });

  it('更新失败回滚并抛出可捕获错误', async () => {
    loginStoredUser();
    api.updatePreferences.mockRejectedValue(new Error('网络错误'));

    const { result } = renderHook(useProbe, { wrapper });
    await waitFor(() => expect(api.getPreferences).toHaveBeenCalled());

    await act(async () => {
      await result.current.prefs
        .updatePrefs({ classroomMode: true, minorMode: 'minor' })
        .catch(() => {});
    });

    expect(result.current.prefs.uiPrefs.classroomMode).toBe(false);
    expect(result.current.prefs.uiPrefs.minorMode).toBe('unset');
  });

  it('非法字号回退 large，卸载后清理根属性', () => {
    window.history.replaceState({}, '', '/quiz?view=classroom&font=huge&readonly=1');

    const { result, unmount } = renderHook(useProbe, { wrapper });
    expect(result.current.classroom.fontScale).toBe('large');

    unmount();
    expect(document.documentElement.dataset.classroom).toBeUndefined();
    expect(document.documentElement.dataset.font).toBeUndefined();
  });

  it('buildClassroomLink 只包含视图参数', () => {
    const link = buildClassroomLink('/quiz', { font: 'xlarge' });
    expect(link).toBe('/quiz?view=classroom&font=xlarge&readonly=1');
    expect(link).not.toMatch(/token|user_id|utm_|score/i);

    expect(buildClassroomLink('/quiz?mode=practice', { font: 'huge' })).toBe(
      '/quiz?mode=practice&view=classroom&font=large&readonly=1'
    );
  });
});