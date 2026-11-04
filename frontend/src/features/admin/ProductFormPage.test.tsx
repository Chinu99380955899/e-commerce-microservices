import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../../test/utils';
import { server } from '../../mocks/server';
import { ProductFormPage } from './ProductFormPage';

async function fillValidProduct(user: ReturnType<typeof userEvent.setup>, sku: string) {
  await user.type(screen.getByLabelText(/^SKU/), sku);
  await user.type(screen.getByLabelText(/^Name/), 'Test Lamp');
  await user.type(screen.getByLabelText(/^Description/), 'A small lamp for the desk.');
  await user.selectOptions(screen.getByLabelText(/^Category/), 'home');
  await user.type(screen.getByLabelText(/^Price/), '999');
  await user.type(screen.getByLabelText(/^Stock quantity/), '12');
}

describe('ProductFormPage (admin)', () => {
  it('shows the backend validation messages for empty required fields', async () => {
    const user = userEvent.setup();
    renderAt(<ProductFormPage />, { route: '/admin/products/new', as: 'ravi' });
    await user.click(await screen.findByRole('button', { name: 'Create product' }));
    expect((await screen.findAllByText('must not be blank')).length).toBeGreaterThan(0);
  });

  it('shows the duplicate-SKU error from a 409 on the SKU field', async () => {
    const user = userEvent.setup();
    renderAt(<ProductFormPage />, { route: '/admin/products/new', as: 'ravi' });
    await fillValidProduct(user, 'AUD-ANC-100');
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    expect(
      await screen.findByText('This SKU is already used by another product'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^SKU/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('maps field errors from a 400 response onto the matching fields', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/api/v1/products', () =>
        HttpResponse.json(
          {
            type: 'https://auramart.dev/problems/validation-error',
            title: 'Validation failed',
            status: 400,
            detail: 'One or more fields are invalid.',
            errors: { name: 'size must be between 0 and 200' },
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    renderAt(<ProductFormPage />, { route: '/admin/products/new', as: 'ravi' });
    await fillValidProduct(user, 'TST-LMP-001');
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    expect(await screen.findByText('size must be between 0 and 200')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('creates a product and returns to the product list', async () => {
    const user = userEvent.setup();
    renderAt(<ProductFormPage />, { route: '/admin/products/new', as: 'ravi' });
    await fillValidProduct(user, 'TST-LMP-002');
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/products');
    });
  });
});
