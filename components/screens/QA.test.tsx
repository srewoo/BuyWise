// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QA } from '@/components/screens/QA';
import type { QAItem } from '@/lib/types';

describe('<QA>', () => {
  it('asks via a suggested pill and renders the answer + citations', async () => {
    const onAsk = vi.fn(
      async (q: string): Promise<QAItem> => ({
        question: q,
        answer: 'No, it does not overheat.',
        citations: [{ source: 'reddit', label: 'r/headphones' }],
      }),
    );
    render(<QA product="XM6" qa={[]} onAsk={onAsk} />);
    await userEvent.click(screen.getByRole('button', { name: 'Is it worth the price?' }));
    expect(onAsk).toHaveBeenCalledWith('Is it worth the price?');
    expect(await screen.findByText('No, it does not overheat.')).toBeInTheDocument();
    expect(screen.getByText('r/headphones')).toBeInTheDocument();
  });

  it('asks from the composer input', async () => {
    const onAsk = vi.fn(async (q: string): Promise<QAItem> => ({ question: q, answer: 'Answer.', citations: [] }));
    render(<QA product="XM6" qa={[]} onAsk={onAsk} />);
    await userEvent.type(screen.getByPlaceholderText(/ask anything/i), 'is it durable?');
    await userEvent.keyboard('{Enter}');
    expect(onAsk).toHaveBeenCalledWith('is it durable?');
    expect(await screen.findByText('Answer.')).toBeInTheDocument();
  });

  it('recovers instead of hanging on "Thinking…" when the handler rejects', async () => {
    const onAsk = vi.fn(async (): Promise<QAItem> => {
      throw new Error('network down');
    });
    render(<QA product="XM6" qa={[]} onAsk={onAsk} />);
    await userEvent.type(screen.getByPlaceholderText(/ask anything/i), 'will it last?');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText(/couldn't answer right now/i)).toBeInTheDocument();
    expect(screen.queryByText('Thinking…')).not.toBeInTheDocument();
  });
});
