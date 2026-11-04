import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Info, ShoppingBag } from 'lucide-react';
import { useCart } from '../../api/cart';
import { usePlaceOrder } from '../../api/orders';
import { ApiError } from '../../api/client';
import type { ShippingAddress } from '../../api/schemas';
import { useDocumentTitle } from '../../app/hooks';
import { useSession } from '../auth/sessionContext';
import { addressFormSchema, type AddressFormValues } from './schema';
import { INDIAN_STATES } from '../../lib/indianStates';
import { readJson, writeJson } from '../../lib/storage';
import { Button } from '../../components/ui/Button';
import { TextField, SelectField } from '../../components/ui/Field';
import { EmptyState, ErrorState, Price, Skeleton } from '../../components/ui/Status';
import { Link } from 'react-router';
import { toast } from '../../lib/toast';
import { cn } from '../../lib/cn';

export const ADDRESS_KEY = 'auramart.address.v1';

function isAddressValues(value: unknown): value is AddressFormValues {
  return addressFormSchema.safeParse(value).success;
}

const EMPTY_ADDRESS: AddressFormValues = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pinCode: '',
};

type Step = 'address' | 'review';

export function CheckoutPage() {
  useDocumentTitle('Checkout');
  const cart = useCart();
  const [step, setStep] = useState<Step>('address');
  const [address, setAddress] = useState<AddressFormValues | null>(null);

  if (cart.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />;
  if (cart.data.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-10" aria-hidden="true" />}
        title="Your cart is empty"
        description="Add a few things before you check out."
        action={
          <Link
            to="/products"
            className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
          >
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
          <Steps step={step} />
        </header>
        {step === 'address' ? (
          <AddressStep
            onContinue={(values) => {
              setAddress(values);
              writeJson(ADDRESS_KEY, values);
              setStep('review');
            }}
          />
        ) : address ? (
          <ReviewStep address={address} onBack={() => setStep('address')} />
        ) : null}
      </div>
      <aside
        aria-label="Order summary"
        className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="font-semibold">Order summary</h2>
        <ul className="mt-3 divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {cart.data.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                {item.name} <span className="text-slate-500">× {item.quantity}</span>
              </span>
              <Price amount={item.lineTotal} currency={item.currency} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
          <span className="font-medium">Total</span>
          <Price amount={cart.data.subtotal} currency={cart.data.currency} className="text-lg" />
        </div>
      </aside>
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const items: { id: Step; label: string }[] = [
    { id: 'address', label: '1. Delivery address' },
    { id: 'review', label: '2. Review and place order' },
  ];
  return (
    <ol className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Checkout steps">
      {items.map((item) => (
        <li
          key={item.id}
          aria-current={item.id === step ? 'step' : undefined}
          className={cn(
            'rounded-full px-3 py-1 font-medium',
            item.id === step
              ? 'bg-aura-600 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
          )}
        >
          {item.label}
        </li>
      ))}
    </ol>
  );
}

function AddressStep({ onContinue }: { onContinue: (values: AddressFormValues) => void }) {
  const session = useSession();
  const saved = readJson<AddressFormValues>(ADDRESS_KEY, EMPTY_ADDRESS, isAddressValues);
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      ...EMPTY_ADDRESS,
      ...saved,
      fullName: saved.fullName || (session.isSignedIn ? session.name : ''),
    },
    mode: 'onTouched',
  });
  const errors = form.formState.errors;

  return (
    <form
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      onSubmit={(event) => {
        void form.handleSubmit(onContinue)(event);
      }}
    >
      <h2 className="text-lg font-semibold">Delivery address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            label="Full name"
            autoComplete="name"
            required
            error={errors.fullName?.message}
            {...form.register('fullName')}
          />
        </div>
        <TextField
          label="Phone number"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          hint="10 digits, without +91"
          required
          error={errors.phone?.message}
          {...form.register('phone')}
        />
        <TextField
          label="PIN code"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          required
          error={errors.pinCode?.message}
          {...form.register('pinCode')}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Address line 1"
            autoComplete="address-line1"
            required
            error={errors.line1?.message}
            {...form.register('line1')}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            label="Address line 2 (optional)"
            autoComplete="address-line2"
            error={errors.line2?.message}
            {...form.register('line2')}
          />
        </div>
        <TextField
          label="City"
          autoComplete="address-level2"
          required
          error={errors.city?.message}
          {...form.register('city')}
        />
        <SelectField
          label="State or union territory"
          placeholder="Choose a state"
          autoComplete="address-level1"
          required
          options={INDIAN_STATES.map((state) => ({ value: state, label: state }))}
          error={errors.state?.message}
          {...form.register('state')}
        />
      </div>
      <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        We remember this address on this device for next time.
      </p>
      <div className="flex justify-end">
        <Button type="submit" size="lg" icon={<ArrowRight className="size-4" aria-hidden="true" />}>
          Continue to review
        </Button>
      </div>
    </form>
  );
}

function ReviewStep({ address, onBack }: { address: AddressFormValues; onBack: () => void }) {
  const navigate = useNavigate();
  const placeOrder = usePlaceOrder();
  const shipping: ShippingAddress = {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ? address.line2 : undefined,
    city: address.city,
    state: address.state,
    pinCode: address.pinCode,
  };

  const submit = () => {
    placeOrder.mutate(shipping, {
      onSuccess: (order) => {
        void navigate(`/orders/${order.id}`);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.problem?.type.endsWith('/empty-cart')) {
          toast.error('Your cart is empty', 'Add something before you place an order.');
          void navigate('/cart');
        }
      },
    });
  };

  return (
    <section
      aria-labelledby="review-heading"
      className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <h2 id="review-heading" className="text-lg font-semibold">
        Review your order
      </h2>
      <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
        <p className="font-medium">{shipping.fullName}</p>
        <p className="text-slate-600 dark:text-slate-400">
          {shipping.line1}
          {shipping.line2 ? `, ${shipping.line2}` : ''}, {shipping.city}, {shipping.state}{' '}
          {shipping.pinCode}
        </p>
        <p className="text-slate-600 dark:text-slate-400">Phone {shipping.phone}</p>
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Payment is simulated in this demo. Nothing is charged to a real card. Your order is
        confirmed a few seconds after you place it.
      </p>
      {placeOrder.isError &&
      !(
        placeOrder.error instanceof ApiError &&
        placeOrder.error.problem?.type.endsWith('/empty-cart')
      ) ? (
        <ErrorState
          title="The order could not be placed"
          error={placeOrder.error}
          onRetry={submit}
        />
      ) : null}
      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <Button
          variant="secondary"
          onClick={onBack}
          icon={<ArrowLeft className="size-4" aria-hidden="true" />}
        >
          Back
        </Button>
        <Button size="lg" loading={placeOrder.isPending} onClick={submit}>
          Place order
        </Button>
      </div>
    </section>
  );
}
