import { expect, test, type Page } from '@playwright/test';

/** Flow A: ask the assistant, open the product, add it to the cart. */
test('A: the assistant finds a product that is added to the cart', async ({ page }) => {
  await page.goto('/assistant');
  await page
    .getByLabel('Ask Aura a question')
    .fill('I need something to keep tea hot on a long train trip');
  await page.getByLabel('Ask Aura a question').press('Enter');

  const productLink = page.getByRole('link', { name: 'Steel Vacuum Flask 750ml' }).first();
  await expect(productLink).toBeVisible({ timeout: 10_000 });
  await productLink.click();

  await expect(page).toHaveURL(/\/products\/0b9a7c1e-0003-4c3a-9a10-000000000003$/);
  await expect(page.getByRole('heading', { name: 'Steel Vacuum Flask 750ml' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('Added to your cart', { exact: true })).toBeVisible();
});

/** Flow B: check out and see the order CONFIRMED. */
test('B: checkout ends with a confirmed order', async ({ page }) => {
  await addFlaskAndOpenCheckout(page);
  await fillDeliveryAddress(page);
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Order confirmed: a confirmation is on its way.')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
});

/** Flow C: the next payments fail, so the order is CANCELLED and the stock is restored. */
test('C: a failed payment cancels the order and restores the stock', async ({ page }) => {
  await page.goto('/products/0b9a7c1e-0003-4c3a-9a10-000000000003');
  await expect(page.getByRole('heading', { name: 'Steel Vacuum Flask 750ml' })).toBeVisible();

  await page.getByRole('button', { name: 'Open demo controls' }).click();
  await page.getByRole('radio', { name: /Payments fail/ }).check();
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('Added to your cart', { exact: true })).toBeVisible();
  await page.goto('/checkout');
  await fillDeliveryAddress(page);
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByText('Payment failed. The reserved stock was released.')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible();

  // The reserved stock was released: the product is still in stock at its original level.
  await page.goto('/products/0b9a7c1e-0003-4c3a-9a10-000000000003');
  await expect(page.getByText('In stock', { exact: true }).first()).toBeVisible();
});

/** Flow D: as admin, create a product, then get the duplicate-SKU error. */
test('D: an admin gets the duplicate-SKU error when creating an existing SKU', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu for Asha Verma' }).click();
  await page.getByRole('menuitem', { name: 'Ravi Kumar (admin)' }).click();
  await expect(page.getByRole('button', { name: 'Account menu for Ravi Kumar' })).toBeVisible();

  await page.goto('/admin/products/new');
  await page.getByLabel(/^SKU/).fill('FIT-YMT-006');
  await page.getByLabel(/^Name/).fill('Travel Yoga Mat');
  await page.getByLabel(/^Description/).fill('A light mat that rolls up for travel.');
  await page.getByLabel(/^Category/).selectOption('fitness');
  await page.getByLabel(/^Price/).fill('1299');
  await page.getByLabel(/^Stock quantity/).fill('25');
  await page.getByRole('button', { name: 'Create product' }).click();

  await expect(page.getByText('This SKU is already used by another product')).toBeVisible();
});

async function addFlaskAndOpenCheckout(page: Page): Promise<void> {
  await page.goto('/products/0b9a7c1e-0003-4c3a-9a10-000000000003');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('Added to your cart', { exact: true })).toBeVisible();
  await page.goto('/checkout');
}

async function fillDeliveryAddress(page: Page): Promise<void> {
  await page.getByLabel(/^Full name/).fill('Asha Verma');
  await page.getByLabel(/^Phone number/).fill('9876543210');
  await page.getByLabel(/^Address line 1/).fill('14, Lotus Apartments, MG Road');
  await page.getByLabel(/^City/).fill('Bengaluru');
  await page.getByLabel(/^State or union territory/).selectOption('Karnataka');
  await page.getByLabel(/^PIN code/).fill('560001');
  await page.getByRole('button', { name: 'Continue to review' }).click();
}
