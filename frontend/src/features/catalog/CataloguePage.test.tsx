import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../../test/utils';
import { CataloguePage } from './CataloguePage';

function locationOf(): string {
  return screen.getByTestId('location').textContent;
}

describe('CataloguePage', () => {
  it('reads the category, sort, size and page from the URL', async () => {
    renderAt(<CataloguePage />, { route: '/products?category=kitchen&sort=price%2Casc&size=24' });
    await screen.findByRole('heading', { name: 'Kitchen' });
    // Kitchen has eight products, so one page shows all of them.
    await waitFor(() => {
      expect(screen.getByText('Showing 1–8 of 8')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Sort by')).toHaveValue('price,asc');
    expect(screen.getByLabelText('Per page')).toHaveValue('24');
    expect(screen.getByRole('button', { name: 'Kitchen' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts a changed filter into the URL and goes back to page 1', async () => {
    const user = userEvent.setup();
    renderAt(<CataloguePage />, { route: '/products?page=2' });
    await screen.findByText(/Showing 13–24 of/);
    await user.click(screen.getByRole('button', { name: 'Books' }));
    await waitFor(() => {
      expect(locationOf()).toBe('/products?category=books');
    });
  });

  it('moves between pages through the pagination controls', async () => {
    const user = userEvent.setup();
    renderAt(<CataloguePage />, { route: '/products' });
    await screen.findByText(/Showing 1–12 of 40/);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(locationOf()).toBe('/products?page=2');
    });
    await screen.findByText(/Showing 13–24 of 40/);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => {
      expect(locationOf()).toBe('/products');
    });
  });

  it('changes the sort order in the URL', async () => {
    const user = userEvent.setup();
    renderAt(<CataloguePage />, { route: '/products' });
    await screen.findByText(/Showing 1–12 of 40/);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'price,desc');
    await waitFor(() => {
      expect(locationOf()).toBe('/products?sort=price%2Cdesc');
    });
  });

  it('shows product cards with price and stock', async () => {
    renderAt(<CataloguePage />, { route: '/products?category=electronics&sort=price%2Cdesc' });
    const card = await screen.findByRole('link', { name: /Studio Over-Ear Headphones/ });
    expect(within(card).getByText('₹8,999.00')).toBeInTheDocument();
    expect(within(card).getByText('In stock')).toBeInTheDocument();
  });
});
