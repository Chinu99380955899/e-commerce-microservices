import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Monitor, MapPin, Moon, RotateCcw, Sun } from 'lucide-react';
import { useSession } from '../auth/sessionContext';
import { useDocumentTitle } from '../../app/hooks';
import { useTheme, type ThemeChoice } from '../../app/themeContext';
import { readJson } from '../../lib/storage';
import { ADDRESS_KEY } from '../checkout/CheckoutPage';
import { addressFormSchema, type AddressFormValues } from '../checkout/schema';
import { resetDemoData } from '../demo/resetDemo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Status';
import { cn } from '../../lib/cn';

function isAddress(value: unknown): value is AddressFormValues {
  return addressFormSchema.safeParse(value).success;
}

export function AccountPage() {
  useDocumentTitle('Account');
  const session = useSession();
  const { choice, setChoice } = useTheme();
  const queryClient = useQueryClient();
  const address = readJson<AddressFormValues | null>(
    ADDRESS_KEY,
    null,
    (value): value is AddressFormValues | null => value === null || isAddress(value),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your account</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your details, saved address and preferences.
        </p>
      </header>

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-slate-500 dark:text-slate-400">Name</dt>
          <dd className="font-medium">{session.name}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Role</dt>
          <dd className="font-medium capitalize">
            {session.role ?? (session.canManageCatalogue ? 'Admin (no login yet)' : 'Guest')}
          </dd>
          <dt className="text-slate-500 dark:text-slate-400">Customer ID</dt>
          <dd className="break-all font-mono text-xs">{session.customerId}</dd>
        </dl>
        {session.isSignedIn ? (
          <div>
            <Button
              variant="secondary"
              icon={<LogOut className="size-4" aria-hidden="true" />}
              onClick={() => session.signOut()}
            >
              Sign out
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapPin className="size-5 text-aura-600 dark:text-aura-400" aria-hidden="true" />
          Saved delivery address
        </h2>
        {address ? (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {address.fullName}, {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state}{' '}
            {address.pinCode}
            <span className="block text-slate-500 dark:text-slate-400">Phone {address.phone}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No address yet. It is saved the first time you check out.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="font-semibold">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 sm:max-w-md">
          {(
            [
              { value: 'system', label: 'System', icon: Monitor },
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
            ] as const
          ).map((option) => (
            <ThemeOption
              key={option.value}
              value={option.value}
              label={option.label}
              icon={option.icon}
              active={choice === option.value}
              onSelect={setChoice}
            />
          ))}
        </div>
      </Card>

      {session.mode === 'demo' ? (
        <Card className="flex flex-col gap-3 p-5 sm:p-6">
          <h2 className="font-semibold">Demo data</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Restore the starting catalogue, carts and orders. Your demo controls settings are kept.
          </p>
          <div>
            <Button
              variant="secondary"
              icon={<RotateCcw className="size-4" aria-hidden="true" />}
              onClick={() => resetDemoData(queryClient)}
            >
              Reset demo data
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function ThemeOption({
  value,
  label,
  icon: Icon,
  active,
  onSelect,
}: {
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
  active: boolean;
  onSelect: (choice: ThemeChoice) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium',
        active
          ? 'border-aura-600 bg-aura-50 text-aura-700 dark:border-aura-500 dark:bg-aura-950 dark:text-aura-300'
          : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
    </button>
  );
}
