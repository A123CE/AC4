import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TierBadge from '../components/TierBadge';
import { AppProviders } from '../context/AppProviders';

beforeEach(() => {
  localStorage.clear();
});

describe('TierBadge', () => {
  it('可选择流畅档并写入本地覆盖', () => {
    render(
      <AppProviders>
        <TierBadge />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole('button', { name: /画质档位/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: '流畅' }));

    expect(localStorage.getItem('ac4_tier_override')).toBe('smooth');
  });

  it('选择自动会清除覆盖', () => {
    localStorage.setItem('ac4_tier_override', 'high');

    render(
      <AppProviders>
        <TierBadge />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole('button', { name: /画质档位/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /^自动/ }));

    expect(localStorage.getItem('ac4_tier_override')).toBeNull();
  });
});