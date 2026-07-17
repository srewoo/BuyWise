// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Deals } from '@/components/screens/Deals';
import type { DealInfo } from '@/lib/types';

const emptyDeals: DealInfo = {
  offers: [],
  currency: 'INR',
  history: [],
  dropProbability: 0,
  advice: 'Log a price to check if it is a genuine deal.',
};

describe('<Deals>', () => {
  it('shows the price logger and records a manually-entered price', async () => {
    const recorded: DealInfo = {
      offers: [{ retailer: 'Price you entered', price: 42990, currency: 'INR', url: '#', inStock: true, isLowest: true }],
      currency: 'INR',
      history: [{ t: '7/17', price: 42990 }],
      lowestEver: 42990,
      dropProbability: 0.05,
      advice: "This is the lowest price you've tracked (INR 42,990).",
      dealTruth: { status: 'real', message: 'Genuine deal.' },
    };
    const onRecordPrice = vi.fn(async (): Promise<DealInfo> => recorded);

    render(<Deals product="Test Sofa" deals={emptyDeals} currency="INR" onRecordPrice={onRecordPrice} />);

    // Empty state shows the logger up front.
    const priceInput = screen.getByPlaceholderText(/price you see/i);
    await userEvent.type(priceInput, '42990');
    await userEvent.click(screen.getByRole('button', { name: /check this price/i }));

    expect(onRecordPrice).toHaveBeenCalledWith(42990, undefined);
    // The view updates live to show the newly-grounded offer + deal-truth.
    expect(await screen.findByText('Price you entered')).toBeInTheDocument();
    expect(screen.getByText('Genuine deal')).toBeInTheDocument();
  });

  it('passes the optional advertised/MRP price through', async () => {
    const onRecordPrice = vi.fn(async (): Promise<DealInfo> => emptyDeals);
    render(<Deals product="Test Drink" deals={emptyDeals} currency="INR" onRecordPrice={onRecordPrice} />);

    await userEvent.type(screen.getByPlaceholderText(/price you see/i), '40');
    await userEvent.type(screen.getByPlaceholderText(/advertised/i), '60');
    await userEvent.click(screen.getByRole('button', { name: /check this price/i }));

    expect(onRecordPrice).toHaveBeenCalledWith(40, 60);
  });

  it('hides the logger when no handler is provided', () => {
    render(<Deals product="X" deals={emptyDeals} />);
    expect(screen.queryByText(/log the price you see/i)).not.toBeInTheDocument();
  });

  it('sets a price alert via the target input', async () => {
    const onSetAlert = vi.fn();
    render(
      <Deals product="Sony XM6" deals={emptyDeals} currency="USD" onSetAlert={onSetAlert} onRemoveAlert={() => {}} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /set a price alert/i }));
    await userEvent.type(screen.getByPlaceholderText(/target price/i), '299');
    await userEvent.click(screen.getByRole('button', { name: /^set$/i }));
    expect(onSetAlert).toHaveBeenCalledWith(299);
  });

  it('shows an active/triggered alert and allows removing it', async () => {
    const onRemoveAlert = vi.fn();
    render(
      <Deals
        product="Sony XM6"
        deals={emptyDeals}
        currency="USD"
        alert={{
          product: 'Sony XM6',
          currency: 'USD',
          targetPrice: 350,
          createdAt: '2026-07-01T00:00:00Z',
          triggeredAt: '2026-07-10T00:00:00Z',
          triggeredPrice: 348,
        }}
        onSetAlert={() => {}}
        onRemoveAlert={onRemoveAlert}
      />,
    );
    expect(screen.getByText('Target hit')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /remove price alert/i }));
    expect(onRemoveAlert).toHaveBeenCalled();
  });
});
