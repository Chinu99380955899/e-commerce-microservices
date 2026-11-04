import { z } from 'zod';

export const categoryKeys = ['electronics', 'kitchen', 'fitness', 'bags', 'home', 'books'] as const;

export const categorySchema = z.enum(categoryKeys);
export type CategoryKey = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  brand: z.string().nullable(),
  price: z.number(),
  currency: z.string(),
  stockQuantity: z.number().int().nonnegative(),
  inStock: z.boolean(),
  updatedAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }).optional(),
});
export type Product = z.infer<typeof productSchema>;

export function pagedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    content: z.array(item),
    page: z.object({
      size: z.number().int(),
      number: z.number().int(),
      totalElements: z.number().int(),
      totalPages: z.number().int(),
    }),
  });
}

export const pagedProductsSchema = pagedSchema(productSchema);
export type PagedProducts = z.infer<typeof pagedProductsSchema>;

export const semanticResultSchema = z.object({
  query: z.string(),
  results: z.array(z.object({ product: productSchema, score: z.number().min(0).max(1) })),
});
export type SemanticSearchResult = z.infer<typeof semanticResultSchema>;

export const cartItemSchema = z.object({
  productId: z.uuid(),
  sku: z.string(),
  name: z.string(),
  unitPrice: z.number(),
  currency: z.string(),
  quantity: z.number().int(),
  lineTotal: z.number(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  items: z.array(cartItemSchema),
  itemCount: z.number().int(),
  subtotal: z.number(),
  currency: z.string(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type Cart = z.infer<typeof cartSchema>;

export const orderStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderEventTypeSchema = z.enum([
  'OrderPlaced',
  'StockReserved',
  'StockRejected',
  'PaymentSucceeded',
  'PaymentFailed',
  'OrderConfirmed',
  'OrderCancelled',
]);
export type OrderEventType = z.infer<typeof orderEventTypeSchema>;

export const orderEventSchema = z.object({
  type: orderEventTypeSchema,
  at: z.iso.datetime({ offset: true }),
});
export type OrderEvent = z.infer<typeof orderEventSchema>;

export const shippingAddressSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  pinCode: z.string(),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const orderSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  status: orderStatusSchema,
  cancellationReason: z.enum(['OUT_OF_STOCK', 'PAYMENT_FAILED']).nullable(),
  lines: z.array(cartItemSchema),
  itemCount: z.number().int(),
  total: z.number(),
  currency: z.string(),
  shippingAddress: shippingAddressSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  timeline: z.array(orderEventSchema),
});
export type Order = z.infer<typeof orderSchema>;

export const orderSummarySchema = z.object({
  id: z.uuid(),
  status: orderStatusSchema,
  itemCount: z.number().int(),
  total: z.number(),
  currency: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const pagedOrdersSchema = pagedSchema(orderSummarySchema);
export type PagedOrders = z.infer<typeof pagedOrdersSchema>;

export const assistantChatSchema = z.object({
  conversationId: z.string(),
  reply: z.string(),
});
export type AssistantChatResponse = z.infer<typeof assistantChatSchema>;

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.record(z.string(), z.string()).optional(),
});
export type Problem = z.infer<typeof problemSchema>;

export const customerIdSchema = z.uuid();
