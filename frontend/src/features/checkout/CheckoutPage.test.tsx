import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signInAs } from '../../test/utils';
import { addCartItem, clearCart } from '../../api/cart';
import { CheckoutPage } from './CheckoutPage';

const FLASK = '0b9a7c1e-0003-4c3a-9a10-000000000003';

describe('CheckoutPage', () => {
  beforeEach(async () => {
    signInAs('asha');
    await clearCart();
  });

  it('shows the empty cart state instead of a form when there is nothing to buy', async () => {
    renderAt(<CheckoutPage />, { route: '/checkout' });
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Full name/)).not.toBeInTheDocument();
  });

  it('shows the field messages when the address is incomplete', async () => {
    const user = userEvent.setup();
    await addCartItem(FLASK, 1);
    renderAt(<CheckoutPage />, { route: '/checkout' });
    await screen.findByLabelText(/^Full name/);
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    expect(await screen.findByText('Enter a 10-digit phone number')).toBeInTheDocument();
    expect(screen.getByText('Enter a 6-digit PIN code')).toBeInTheDocument();
    expect(screen.getByText('Choose a state or union territory')).toBeInTheDocument();
  });

  it('takes the address, reviews the order and places it', async () => {
    const user = userEvent.setup();
    await addCartItem(FLASK, 1);
    renderAt(<CheckoutPage />, { route: '/checkout' });
    await user.type(await screen.findByLabelText(/^Full name/), 'Asha Verma');
    await user.type(screen.getByLabelText(/^Phone number/), '9876543210');
    await user.type(screen.getByLabelText(/^Address line 1/), '14, Lotus Apartments, MG Road');
    await user.type(screen.getByLabelText(/^City/), 'Bengaluru');
    await user.selectOptions(screen.getByLabelText(/^State or union territory/), 'Karnataka');
    await user.type(screen.getByLabelText(/^PIN code/), '560001');
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));

    expect(await screen.findByRole('heading', { name: 'Review your order' })).toBeInTheDocument();
    expect(screen.getByText(/simulated/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toMatch(/^\/orders\/[0-9a-f-]{36}$/);
    });
  });
});
