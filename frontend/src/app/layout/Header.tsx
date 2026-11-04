import { Link, useNavigate } from 'react-router';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Bot,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Moon,
  Package,
  Settings,
  ShoppingCart,
  Sun,
  SunMoon,
  User,
  UserCog,
} from 'lucide-react';
import { useSession } from '../../features/auth/sessionContext';
import { useCart } from '../../api/cart';
import { useAssistantUi } from '../../features/assistant/assistantUi';
import { SearchBox } from '../../features/search/SearchBox';
import { MiniCart } from '../../features/cart/MiniCart';
import { CATEGORIES } from '../../lib/categories';
import { useTheme } from '../themeContext';
import type { ThemeChoice } from '../themeContext';
import { DEMO_USERS, type DemoUserKey } from '../../lib/demoUsers';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { useState } from 'react';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <div className="order-3 flex w-full min-w-0 items-center gap-3 lg:order-none lg:w-auto lg:flex-1">
          <CategoryMenu />
          <div className="min-w-0 flex-1">
            <SearchBox />
          </div>
        </div>
        <nav aria-label="Account and shopping" className="ml-auto flex items-center gap-1">
          <AssistantButton />
          <CartButton />
          <ThemeToggle />
          <DemoPill />
          <AccountMenu />
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 rounded-lg font-bold tracking-tight text-slate-900 dark:text-white"
      aria-label="AuraMart home"
    >
      <span
        className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-aura-600 to-violet-600 text-white"
        aria-hidden="true"
      >
        <Sparkle />
      </span>
      <span className="text-lg">AuraMart</span>
    </Link>
  );
}

function Sparkle() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z" />
    </svg>
  );
}

function AssistantButton() {
  const { openAssistant } = useAssistantUi();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => openAssistant()}
      aria-keyshortcuts="Control+K Meta+K"
      aria-label="Open the Aura assistant"
      className="gap-1.5"
    >
      <Bot className="size-5 text-aura-600 dark:text-aura-400" aria-hidden="true" />
      <span className="hidden xl:inline">Ask Aura</span>
    </Button>
  );
}

function CartButton() {
  const cart = useCart();
  const count = cart.data?.itemCount ?? 0;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Open mini cart, ${count} item${count === 1 ? '' : 's'}`}
        onClick={() => setOpen(true)}
        className="relative"
      >
        <ShoppingCart className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">Cart</span>
        {count > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-aura-600 px-1 text-[11px] font-semibold text-white"
            aria-hidden="true"
          >
            {count}
          </span>
        ) : null}
      </Button>
      <MiniCart open={open} onOpenChange={setOpen} />
    </>
  );
}

function CategoryMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="secondary"
          size="md"
          className="hidden shrink-0 sm:inline-flex"
          icon={<LayoutGrid className="size-4" aria-hidden="true" />}
        >
          Categories
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={menuClass}>
          {CATEGORIES.map((category) => (
            <DropdownMenu.Item asChild key={category.key}>
              <Link to={`/products?category=${category.key}`} className={menuItemClass}>
                <category.icon className="size-4" aria-hidden="true" />
                {category.label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
          <DropdownMenu.Item asChild>
            <Link to="/products" className={menuItemClass}>
              All products
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const menuClass =
  'z-50 min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900';
const menuItemClass =
  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none data-[highlighted]:bg-slate-100 dark:text-slate-100 dark:data-[highlighted]:bg-slate-800';

function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  const next: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' };
  const Icon = choice === 'light' ? Sun : choice === 'dark' ? Moon : SunMoon;
  const label = choice === 'system' ? 'system' : choice;
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Theme: ${label}. Switch theme`}
      onClick={() => setChoice(next[choice])}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  );
}

function DemoPill() {
  const session = useSession();
  if (session.mode !== 'demo') return null;
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
      Demo data
    </span>
  );
}

function AccountMenu() {
  const session = useSession();
  const navigate = useNavigate();
  const label = session.isSignedIn ? session.name : 'Account';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={session.isSignedIn ? `Account menu for ${session.name}` : 'Account menu'}
          className="gap-1.5"
        >
          <User className="size-5" aria-hidden="true" />
          <span className="hidden max-w-28 truncate xl:inline">{label}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={cn(menuClass, 'min-w-60')}>
          <div className="px-3 py-2 text-sm">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {session.isSignedIn ? session.name : 'Guest'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {session.isSignedIn
                ? session.role === 'admin'
                  ? 'Admin'
                  : 'Shopper'
                : session.mode === 'anonymous'
                  ? 'Admin pages: Admin (no login yet)'
                  : 'Your cart is saved on this device'}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
          <DropdownMenu.Item asChild>
            <Link to="/orders" className={menuItemClass}>
              <Package className="size-4" aria-hidden="true" />
              Orders
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to="/account" className={menuItemClass}>
              <UserCog className="size-4" aria-hidden="true" />
              Account
            </Link>
          </DropdownMenu.Item>
          {session.canManageCatalogue ? (
            <DropdownMenu.Item asChild>
              <Link to="/admin" className={menuItemClass}>
                <Settings className="size-4" aria-hidden="true" />
                {session.mode === 'anonymous' ? 'Admin (no login yet)' : 'Admin'}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {session.mode === 'demo' ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
              <DropdownMenu.Label className="px-3 pb-1 pt-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Switch demo user
              </DropdownMenu.Label>
              {(Object.keys(DEMO_USERS) as DemoUserKey[]).map((key) => (
                <DropdownMenu.Item
                  key={key}
                  className={menuItemClass}
                  onSelect={() => {
                    session.signInDemo(key);
                  }}
                >
                  {DEMO_USERS[key].name} ({DEMO_USERS[key].role})
                </DropdownMenu.Item>
              ))}
            </>
          ) : null}
          {session.mode === 'oidc' && !session.isSignedIn ? (
            <DropdownMenu.Item
              className={menuItemClass}
              onSelect={() => session.signInOidc(window.location.pathname)}
            >
              Sign in with Keycloak
            </DropdownMenu.Item>
          ) : null}
          {session.isSignedIn ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
              <DropdownMenu.Item
                className={menuItemClass}
                onSelect={() => {
                  session.signOut();
                  void navigate('/');
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
