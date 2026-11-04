import { z } from 'zod';

/**
 * Mirrors the backend's bean validation (API_CONTRACT.md, section 5.2). The admin form and the
 * demo API use this same schema, so the messages are identical to the real service.
 */
const decimalPrice = z
  .number({ error: 'must not be null' })
  .refine((value) => Number.isFinite(value), { message: 'must not be null' })
  .refine((value) => value >= 0, { message: 'must be greater than or equal to 0.00' })
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'numeric value out of bounds (<10 digits>.<2 digits> expected)',
  })
  .refine((value) => Math.floor(value).toString().length <= 10, {
    message: 'numeric value out of bounds (<10 digits>.<2 digits> expected)',
  });

export const productRequestSchema = z.object({
  sku: z
    .string({ error: 'must not be blank' })
    .trim()
    .min(1, { message: 'must not be blank' })
    .max(64, { message: 'size must be between 0 and 64' })
    .regex(/^[A-Z0-9-]+$/, { message: 'use upper-case letters, digits and dashes' }),
  name: z
    .string({ error: 'must not be blank' })
    .trim()
    .min(1, { message: 'must not be blank' })
    .max(200, { message: 'size must be between 0 and 200' }),
  description: z
    .string({ error: 'must not be blank' })
    .trim()
    .min(1, { message: 'must not be blank' })
    .max(4000, { message: 'size must be between 0 and 4000' }),
  category: z
    .string({ error: 'must not be blank' })
    .trim()
    .min(1, { message: 'must not be blank' })
    .max(80, { message: 'size must be between 0 and 80' }),
  brand: z
    .string()
    .trim()
    .max(80, { message: 'size must be between 0 and 80' })
    .nullish()
    .transform((value) => (value ? value : null)),
  price: decimalPrice,
  currency: z
    .string({ error: 'must be a 3-letter ISO currency code' })
    .regex(/^[A-Za-z]{3}$/, { message: 'must be a 3-letter ISO currency code' }),
  stockQuantity: z
    .number({ error: 'must not be null' })
    .int({ message: 'must be a whole number' })
    .min(0, { message: 'must be greater than or equal to 0' }),
});

export type ProductRequest = z.infer<typeof productRequestSchema>;

/** Converts Zod issues into the backend's `errors` map (first message per field wins). */
export function issuesToErrors(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join('.');
    if (field && !(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
