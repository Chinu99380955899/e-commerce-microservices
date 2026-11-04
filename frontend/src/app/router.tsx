import { createBrowserRouter, type RouteObject } from 'react-router';
import { RootLayout } from './layout/RootLayout';
import { RequireSignedIn } from './guards';
import { RouteErrorPage, NotFoundPage } from '../features/system/pages';
import { HomePage } from '../features/home/HomePage';
import { CataloguePage } from '../features/catalog/CataloguePage';
import { ProductPage } from '../features/product/ProductPage';
import { SearchPage } from '../features/search/SearchPage';
import { CartPage } from '../features/cart/CartPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { OrdersPage } from '../features/orders/OrdersPage';
import { OrderPage } from '../features/orders/OrderPage';
import { LoginPage, AuthCallbackPage } from '../features/auth/LoginPage';
import { AccountPage } from '../features/account/AccountPage';

/**
 * Routes. Heavy pages (assistant, admin, about) are split into their own chunks with `lazy`.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, Component: HomePage },
      { path: 'products', Component: CataloguePage },
      { path: 'products/:id', Component: ProductPage },
      { path: 'search', Component: SearchPage },
      { path: 'cart', Component: CartPage },
      {
        path: 'checkout',
        element: (
          <RequireSignedIn>
            <CheckoutPage />
          </RequireSignedIn>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireSignedIn>
            <OrdersPage />
          </RequireSignedIn>
        ),
      },
      {
        path: 'orders/:id',
        element: (
          <RequireSignedIn>
            <OrderPage />
          </RequireSignedIn>
        ),
      },
      {
        path: 'assistant',
        lazy: async () => ({
          Component: (await import('../features/assistant/AssistantPage')).AssistantPage,
        }),
      },
      { path: 'login', Component: LoginPage },
      { path: 'auth/callback', Component: AuthCallbackPage },
      {
        path: 'account',
        element: (
          <RequireSignedIn>
            <AccountPage />
          </RequireSignedIn>
        ),
      },
      {
        path: 'admin',
        // AdminLayout applies the admin guard itself, so it can show the 403 page inside the site chrome.
        lazy: async () => ({
          Component: (await import('../features/admin/AdminLayout')).AdminLayout,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('../features/admin/AdminDashboard')).AdminDashboard,
            }),
          },
          {
            path: 'products',
            lazy: async () => ({
              Component: (await import('../features/admin/AdminProductsPage')).AdminProductsPage,
            }),
          },
          {
            path: 'products/new',
            lazy: async () => ({
              Component: (await import('../features/admin/ProductFormPage')).ProductFormPage,
            }),
          },
          {
            path: 'products/:id/edit',
            lazy: async () => ({
              Component: (await import('../features/admin/ProductFormPage')).ProductFormPage,
            }),
          },
        ],
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('../features/about/AboutPage')).AboutPage }),
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
];

export const router = createBrowserRouter(routes);
