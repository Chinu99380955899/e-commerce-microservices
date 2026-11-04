import {
  BookOpen,
  Backpack,
  CookingPot,
  Dumbbell,
  Headphones,
  Lamp,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryKey } from '../api/schemas';

export interface CategoryInfo {
  key: CategoryKey;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** The fixed category list (no categories endpoint, spec section 5.2). Labels and icons live here only. */
export const CATEGORIES: readonly CategoryInfo[] = [
  {
    key: 'electronics',
    label: 'Electronics',
    description: 'Earbuds, headphones and gadgets',
    icon: Headphones,
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    description: 'Cookware, flasks and tableware',
    icon: CookingPot,
  },
  {
    key: 'fitness',
    label: 'Fitness',
    description: 'Training gear for home and gym',
    icon: Dumbbell,
  },
  { key: 'bags', label: 'Bags', description: 'Backpacks, sleeves and trolleys', icon: Backpack },
  { key: 'home', label: 'Home', description: 'Lamps, purifiers and décor', icon: Lamp },
  { key: 'books', label: 'Books', description: 'Engineering and practical guides', icon: BookOpen },
];

export function categoryInfo(key: string): CategoryInfo | undefined {
  return CATEGORIES.find((category) => category.key === key);
}

/** The label for a category key; unknown keys (from older data) are shown as they are. */
export function categoryLabel(key: string): string {
  return categoryInfo(key)?.label ?? key;
}
