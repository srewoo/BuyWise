// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/screens/Dashboard';
import { DEMO_VERDICT } from '@/lib/mock';

describe('<Dashboard>', () => {
  it('renders the verdict, one-liner and reviews pill', () => {
    render(<Dashboard v={{ ...DEMO_VERDICT, decision: 'buy' }} mode="live" grounded />);
    expect(screen.getByText('Buy')).toBeInTheDocument();
    expect(screen.getByText(DEMO_VERDICT.oneLiner)).toBeInTheDocument();
    expect(screen.getByText('1,284 sources')).toBeInTheDocument(); // the reviews pill (grounded)
  });

  it('shows the demo banner in demo mode', () => {
    render(<Dashboard v={DEMO_VERDICT} mode="demo" />);
    expect(screen.getByText(/demo verdict/i)).toBeInTheDocument();
  });

  it('navigates when an evidence tile is clicked', async () => {
    const onNav = vi.fn();
    render(<Dashboard v={DEMO_VERDICT} mode="live" grounded onNav={onNav} />);
    await userEvent.click(screen.getByRole('button', { name: /^Pros/i }));
    expect(onNav).toHaveBeenCalledWith('pros');
  });
});
