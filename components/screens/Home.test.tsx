// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from '@/components/screens/Home';

describe('<Home>', () => {
  it('searches when a recent item is clicked', async () => {
    const onSearch = vi.fn();
    render(<Home history={['Toyota RAV4']} onSearch={onSearch} onRemoveHistory={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Toyota RAV4' }));
    expect(onSearch).toHaveBeenCalledWith('Toyota RAV4');
  });

  it('removes a recent item via its X without triggering a search', async () => {
    const onSearch = vi.fn();
    const onRemoveHistory = vi.fn();
    render(<Home history={['Toyota RAV4']} onSearch={onSearch} onRemoveHistory={onRemoveHistory} />);
    await userEvent.click(screen.getByRole('button', { name: /remove Toyota RAV4 from recent searches/i }));
    expect(onRemoveHistory).toHaveBeenCalledWith('Toyota RAV4');
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('does not render a Trending section', () => {
    render(<Home history={['Toyota RAV4']} onSearch={() => {}} onRemoveHistory={() => {}} />);
    expect(screen.queryByText(/trending/i)).not.toBeInTheDocument();
  });
});
