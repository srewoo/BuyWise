// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEMO_VERDICT } from '@/lib/mock';

// Keep the advisor off the network — App should still route correctly.
vi.mock('@/lib/messaging', () => ({
  requestAdvice: vi.fn(async () => ({ verdict: DEMO_VERDICT, mode: 'live', coverage: [], sources: [], grounded: true })),
}));

import { App } from '@/entrypoints/sidepanel/App';

describe('<App> routing', () => {
  it('starts on Home', () => {
    render(<App />);
    expect(screen.getByText('Should you buy it?')).toBeInTheDocument();
  });

  it('routes to Analyzing when a product is searched', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Steam Deck OLED' }));
    // go('analyzing') fires synchronously before the async advisor call resolves
    expect(await screen.findByText('Analyzing')).toBeInTheDocument();
  });
});
