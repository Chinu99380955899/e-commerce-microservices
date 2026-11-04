import { createContext, useContext } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

export interface ThemeValue {
  choice: ThemeChoice;
  /** The theme actually shown, after resolving "system". */
  resolved: 'light' | 'dark';
  setChoice: (choice: ThemeChoice) => void;
}

export const ThemeContext = createContext<ThemeValue | null>(null);

export const THEME_KEY = 'auramart.theme';

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
