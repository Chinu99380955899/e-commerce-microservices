import { describe, expect, it } from 'vitest';
import { issuesToErrors, productRequestSchema } from './productRequest';

const valid = {
  sku: 'AUD-ANC-100',
  name: 'Aura Pods ANC Earbuds',
  description: 'True wireless earbuds with active noise cancellation.',
  category: 'electronics',
  brand: 'AuraSound',
  price: 4999,
  currency: 'INR',
  stockQuantity: 120,
};

function errorsFor(overrides: Record<string, unknown>): Record<string, string> {
  const result = productRequestSchema.safeParse({ ...valid, ...overrides });
  return result.success ? {} : issuesToErrors(result.error.issues);
}

describe('productRequestSchema', () => {
  it('accepts a valid product', () => {
    expect(productRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('uses the backend messages for the SKU', () => {
    expect(errorsFor({ sku: '' }).sku).toBe('must not be blank');
    expect(errorsFor({ sku: 'a'.repeat(65) }).sku).toBe('size must be between 0 and 64');
    expect(errorsFor({ sku: 'aud-100' }).sku).toBe('use upper-case letters, digits and dashes');
  });

  it('rejects a negative price with the backend message', () => {
    expect(errorsFor({ price: -1 }).price).toBe('must be greater than or equal to 0.00');
  });

  it('rejects more than two decimals in a price', () => {
    expect(errorsFor({ price: 10.005 }).price).toBe(
      'numeric value out of bounds (<10 digits>.<2 digits> expected)',
    );
  });

  it('rejects a currency that is not three letters', () => {
    expect(errorsFor({ currency: 'RS' }).currency).toBe('must be a 3-letter ISO currency code');
  });

  it('rejects a fractional stock quantity', () => {
    expect(errorsFor({ stockQuantity: 1.5 }).stockQuantity).toBe('must be a whole number');
  });

  it('treats an empty brand as no brand', () => {
    const result = productRequestSchema.safeParse({ ...valid, brand: '' });
    expect(result.success && result.data.brand).toBe(null);
  });
});
