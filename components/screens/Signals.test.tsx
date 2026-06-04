// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Signals } from '@/components/screens/Signals';
import type { Signal } from '@/lib/types';

const signals: Signal[] = [
  { label: 'Great battery', strength: 0.9, mentions: 120 },
  { label: 'Comfortable fit', strength: 0.6, mentions: 40 },
];

describe('<Signals>', () => {
  it('renders pros with labels, percentages and mention counts', () => {
    render(<Signals kind="pros" product="XM6" signals={signals} />);
    expect(screen.getByText('Positive signals')).toBeInTheDocument();
    expect(screen.getByText('Great battery')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('120 mentions')).toBeInTheDocument();
  });

  it('renders the cons heading for kind=cons', () => {
    render(<Signals kind="cons" product="XM6" signals={signals} />);
    expect(screen.getByText('Negative signals')).toBeInTheDocument();
  });
});
