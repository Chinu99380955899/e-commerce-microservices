import { z } from 'zod';
import { INDIAN_STATES } from '../../lib/indianStates';

export const addressFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your full name')
    .max(100, 'Keep the name under 100 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
  line1: z
    .string()
    .trim()
    .min(5, 'Enter your street address')
    .max(150, 'Keep the address under 150 characters'),
  line2: z
    .string()
    .trim()
    .max(150, 'Keep the address under 150 characters')
    .optional()
    .or(z.literal('')),
  city: z.string().trim().min(2, 'Enter your city').max(80, 'Keep the city under 80 characters'),
  state: z.enum(INDIAN_STATES as [string, ...string[]], {
    error: 'Choose a state or union territory',
  }),
  pinCode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;
