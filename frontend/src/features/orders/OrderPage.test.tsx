import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signInAs } from '../../test/utils';
import { addCartItem, clearCart } from '../../api/cart';
import { placeOrder } from '../../api/orders';
import { getProduct } from '../../api/products';
import { writeControls, DEFAULT_CONTROLS } from '../../mocks/controls';
import { ASHA_ADDRESS, getDb } from '../../mocks/db';
import { OrderPage } from './OrderPage';

const PRODUCT = '0b9a7c1e-0001-4c3a-9a10-000000000001'; // Aura Pods ANC, stock 120

/** Placement is a few seconds of simulated saga, so these tests use real time with a generous timeout. */
const SAGA_TIMEOUT = 12_000;

async function placeOneOrder(): Promise<string> {
  await clearCart();
  await addCartItem(PRODUCT, 1);
  const order = await placeOrder(ASHA_ADDRESS);
  return order.id;
}

describe('OrderPage live tracking', () => {
  beforeEach(() => {
    signInAs('asha');
  });

  it('polls a PENDING order until it is CONFIRMED', async () => {
    const id = await placeOneOrder();
    renderAt(<OrderPage />, { route: `/orders/${id}`, path: '/orders/:id' });
    expect(
      await screen.findByText('Processing your order. This page updates on its own.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Order confirmed: a confirmation is on its way.', undefined, {
        timeout: SAGA_TIMEOUT,
      }),
    ).toBeInTheDocument();
  }, 20_000);

  it('shows the out-of-stock cancellation message when the saga rejects the stock', async () => {
    await clearCart();
    const knifeSet = '0b9a7c1e-0020-4c3a-9a10-000000000020';
    await addCartItem(knifeSet, 2);
    // Stock runs out after the line was added (another shopper bought the last ones): the saga rejects it.
    const product = getDb().products.find((p) => p.id === knifeSet);
    if (product) product.stockQuantity = 1;
    const order = await placeOrder(ASHA_ADDRESS);
    renderAt(<OrderPage />, { route: `/orders/${order.id}`, path: '/orders/:id' });
    expect(
      await screen.findByText("Some items ran out of stock. You weren't charged.", undefined, {
        timeout: SAGA_TIMEOUT,
      }),
    ).toBeInTheDocument();
  }, 20_000);

  it('shows the payment-failed message, releases the reserved stock, and offers Try again', async () => {
    const user = userEvent.setup();
    writeControls({ ...DEFAULT_CONTROLS, payment: 'fail', latency: 'none' });
    const before = (await getProduct(PRODUCT)).stockQuantity;
    const id = await placeOneOrder();
    renderAt(<OrderPage />, { route: `/orders/${id}`, path: '/orders/:id' });
    expect(
      await screen.findByText('Payment failed. The reserved stock was released.', undefined, {
        timeout: SAGA_TIMEOUT,
      }),
    ).toBeInTheDocument();
    expect((await getProduct(PRODUCT)).stockQuantity).toBe(before);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/cart');
    });
  }, 20_000);

  it('explains each saga step in the behind-the-scenes panel', async () => {
    const user = userEvent.setup();
    const id = await placeOneOrder();
    renderAt(<OrderPage />, { route: `/orders/${id}`, path: '/orders/:id' });
    await screen.findByText('Behind the scenes');
    await user.click(screen.getByText('Behind the scenes'));
    // The first step is always OrderPlaced, published by order-service on order.events.
    expect(await screen.findByText(/order-service → order\.events/)).toBeInTheDocument();
  });
});
