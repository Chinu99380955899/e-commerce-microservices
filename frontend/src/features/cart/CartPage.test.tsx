import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signInAs } from '../../test/utils';
import { addCartItem, clearCart } from '../../api/cart';
import { CartPage } from './CartPage';

const FLASK = '0b9a7c1e-0003-4c3a-9a10-000000000003';
const KNIFE_SET = '0b9a7c1e-0020-4c3a-9a10-000000000020'; // stock 2
const BAND_SET = '0b9a7c1e-0021-4c3a-9a10-000000000021';

describe('CartPage', () => {
  beforeEach(async () => {
    signInAs('asha');
    await clearCart();
  });

  it('shows the empty state for a new cart', async () => {
    renderAt(<CartPage />, { route: '/cart' });
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
  });

  it('lists lines and computes the subtotal', async () => {
    await addCartItem(FLASK, 2);
    await addCartItem(BAND_SET, 1);
    renderAt(<CartPage />, { route: '/cart' });
    expect(await screen.findByText('Steel Vacuum Flask 750ml')).toBeInTheDocument();
    // 2 × 1,299 + 1 × 799 = 3,397
    expect(screen.getByLabelText('Order summary')).toHaveTextContent('₹3,397.00');
  });

  it('changes a quantity and updates the line total', async () => {
    const user = userEvent.setup();
    await addCartItem(FLASK, 1);
    renderAt(<CartPage />, { route: '/cart' });
    const increase = await screen.findByRole('button', {
      name: 'Increase Steel Vacuum Flask 750ml',
    });
    await user.click(increase);
    await waitFor(() => {
      expect(screen.getByLabelText('Order summary')).toHaveTextContent('₹2,598.00');
    });
  });

  it('removes a line', async () => {
    const user = userEvent.setup();
    await addCartItem(FLASK, 1);
    renderAt(<CartPage />, { route: '/cart' });
    await user.click(
      await screen.findByRole('button', { name: 'Remove Steel Vacuum Flask 750ml from cart' }),
    );
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
  });

  it('rolls back and shows a toast when the server refuses the quantity (insufficient stock)', async () => {
    const user = userEvent.setup();
    await addCartItem(KNIFE_SET, 2);
    renderAt(<CartPage />, { route: '/cart' });
    const name = await screen.findByText("Chef's Knife Set");
    const scope = name.closest('li');
    if (!scope) throw new Error('Cart line not found');
    await user.click(within(scope).getByRole('button', { name: "Increase Chef's Knife Set" }));
    expect(await screen.findByText('Cart not updated')).toBeInTheDocument();
    expect(screen.getByText('Only 2 left in stock')).toBeInTheDocument();
    expect(within(scope).getByRole('group', { name: "Chef's Knife Set" })).toHaveTextContent('2');
  });

  it('asks before clearing the cart and clears it on confirm', async () => {
    const user = userEvent.setup();
    await addCartItem(FLASK, 1);
    renderAt(<CartPage />, { route: '/cart' });
    await user.click(await screen.findByRole('button', { name: 'Clear cart' }));
    const dialog = await screen.findByRole('dialog', { name: 'Clear your cart?' });
    await user.click(within(dialog).getByRole('button', { name: 'Clear cart' }));
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
  });
});
