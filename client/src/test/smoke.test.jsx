import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('client smoke', () => {
  it('renders a basic node', () => {
    render(<div>华夏古建</div>);
    expect(screen.getByText('华夏古建')).toBeInTheDocument();
  });
});