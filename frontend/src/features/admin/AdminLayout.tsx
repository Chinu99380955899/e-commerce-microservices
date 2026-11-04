import { NavLink, Outlet } from 'react-router';
import { useSession } from '../auth/sessionContext';
import { ForbiddenPage } from '../system/pages';
import { cn } from '../../lib/cn';

/** Admin shell: the guard, the title (labelled "no login yet" in anonymous mode) and sub-navigation. */
export function AdminLayout() {
  const session = useSession();
  if (session.isLoading) return null;
  if (!session.canManageCatalogue) return <ForbiddenPage />;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Admin{session.mode === 'anonymous' ? ' (no login yet)' : ''}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage the catalogue. Changes are visible in the store straight away.
          </p>
        </div>
        <nav
          aria-label="Admin sections"
          className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800"
        >
          <AdminTab to="/admin" end>
            Dashboard
          </AdminTab>
          <AdminTab to="/admin/products">Products</AdminTab>
          <AdminTab to="/admin/products/new">New product</AdminTab>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function AdminTab({ to, end = false, children }: { to: string; end?: boolean; children: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
          isActive
            ? 'border-aura-600 text-aura-700 dark:border-aura-400 dark:text-aura-400'
            : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
        )
      }
    >
      {children}
    </NavLink>
  );
}
