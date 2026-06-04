// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alternatives } from '@/components/screens/Alternatives';
import type { Alternative } from '@/lib/types';

const alts: Alternative[] = [
  { name: 'Pixel Fold', angle: 'Best Camera', reason: 'Great photos', priceHint: '~$1599', decision: 'consider' },
];

describe('<Alternatives>', () => {
  it('renders an alternative and fires onAnalyze with its name', async () => {
    const onAnalyze = vi.fn();
    render(<Alternatives product="Z Fold7" alternatives={alts} onAnalyze={onAnalyze} />);
    expect(screen.getByText('Pixel Fold')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Analyze Pixel Fold/i }));
    expect(onAnalyze).toHaveBeenCalledWith('Pixel Fold');
  });
});
