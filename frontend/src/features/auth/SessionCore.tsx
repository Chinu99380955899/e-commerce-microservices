import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthMode } from '../../config';
import type { DemoUserKey } from '../../lib/demoUsers';
import { setRequestIdentity } from '../../api/client';
import { mergeGuestCart } from '../../api/cart';
import { toast } from '../../lib/toast';
import { SessionContext, type Role, type SessionValue } from './sessionContext';

export type { SignedInUser };

interface SignedInUser {
  customerId: string;
  name: string;
  role: Role;
  accessToken: string | null;
}

const GUEST_KEY = 'auramart.guestId';

/** A guest's customer ID survives reloads, so the cart works without signing in. */
function readOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export interface SessionCoreProps {
  mode: AuthMode;
  isLoading: boolean;
  user: SignedInUser | null;
  signInDemo?: (key: DemoUserKey) => void;
  signInOidc?: (returnTo: string) => void;
  signOut: () => void;
  resetDemoData?: () => void;
  children: ReactNode;
}

/** Shared session logic for every auth mode: identity headers, guest cart merge and cache reset. */
export function SessionCore({
  mode,
  isLoading,
  user,
  signInDemo,
  signInOidc,
  signOut,
  resetDemoData,
  children,
}: SessionCoreProps) {
  const queryClient = useQueryClient();
  const [guestId] = useState(readOrCreateGuestId);
  const customerId = user?.customerId ?? guestId;
  // Set before children render, so every query that starts afterwards carries the right identity.
  setRequestIdentity({ customerId, accessToken: user?.accessToken ?? null });

  // The latest user, for the effect below. Updated in an effect so the render itself stays pure.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  });

  const previousCustomerId = useRef(customerId);
  useEffect(() => {
    const previous = previousCustomerId.current;
    if (previous === customerId) return;
    previousCustomerId.current = customerId;
    const signedInUser = userRef.current;
    const run = async () => {
      // A guest who signs in keeps their basket: move the guest cart into the user's cart.
      if (signedInUser && previous === guestId) {
        try {
          const { moved, skipped } = await mergeGuestCart(guestId, signedInUser.customerId);
          if (moved > 0) {
            toast.success(
              'Your cart is saved',
              `${moved} item${moved === 1 ? '' : 's'} moved to your account.`,
            );
          }
          if (skipped > 0) {
            toast.info(
              'Some items were not moved',
              'They are no longer in stock in the quantity you chose.',
            );
          }
        } catch {
          toast.error('Could not move your guest cart', 'Your items are still in your guest cart.');
        }
      }
      await queryClient.resetQueries();
    };
    void run();
  }, [customerId, guestId, queryClient]);

  const value: SessionValue = {
    mode,
    isLoading,
    isSignedIn: user !== null,
    customerId,
    name: user?.name ?? 'Guest',
    role: user?.role ?? null,
    canManageCatalogue: mode === 'anonymous' || user?.role === 'admin',
    signInDemo: signInDemo ?? (() => undefined),
    signInOidc: signInOidc ?? (() => undefined),
    signOut,
    resetDemoData: resetDemoData ?? (() => undefined),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
