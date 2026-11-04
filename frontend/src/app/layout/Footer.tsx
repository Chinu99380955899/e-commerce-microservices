import { Link } from 'react-router';
import { config } from '../../config';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">AuraMart</p>
          <p className="mt-1">
            A portfolio project: event-driven commerce with an AI shopping assistant.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/about" className="hover:text-slate-900 hover:underline dark:hover:text-white">
            How it works
          </Link>
          <a
            href={config.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900 hover:underline dark:hover:text-white"
          >
            Source code
          </a>
          <a
            href={`${config.repoUrl}/blob/main/frontend/auramart-web/API_CONTRACT.md`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900 hover:underline dark:hover:text-white"
          >
            API contract
          </a>
        </nav>
      </div>
    </footer>
  );
}
