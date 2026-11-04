/** The two demo users. Kept outside src/mocks so the production bundle does not include the mock data. */
export const DEMO_USERS = {
  asha: {
    id: 'c0ffee00-0000-4000-8000-000000000001',
    name: 'Asha Verma',
    role: 'shopper' as const,
    email: 'asha.verma@example.com',
  },
  ravi: {
    id: 'c0ffee00-0000-4000-8000-000000000002',
    name: 'Ravi Kumar',
    role: 'admin' as const,
    email: 'ravi.kumar@example.com',
  },
};

export type DemoUserKey = keyof typeof DEMO_USERS;
