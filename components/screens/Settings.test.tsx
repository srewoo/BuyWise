// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '@/components/screens/Settings';
import { storage } from '@/lib/storage';

describe('<Settings>', () => {
  it('persists the OpenAI key as the user types', async () => {
    render(<Settings />);
    await userEvent.type(screen.getByPlaceholderText('sk-…'), 'sk-abc123');
    const s = await storage.getSettings();
    expect(s.openaiKey).toBe('sk-abc123');
  });

  it('persists the selected region', async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: /India/i }));
    const s = await storage.getSettings();
    expect(s.region).toBe('IN');
  });

  it('persists the selected model', async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: 'gpt-4.1' }));
    const s = await storage.getSettings();
    expect(s.model).toBe('gpt-4.1');
  });
});
