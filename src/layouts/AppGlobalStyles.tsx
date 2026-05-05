import { useMediaQuery } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';

import { getDesignTokens, getThemedComponents, UiThemeName } from '../utils/theme';

export type ColorModePreference = 'light' | 'dark' | 'auto';

export const ColorModeContext = React.createContext({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleColorMode: () => { },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setModeLight: () => { },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setModeDark: () => { },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setModeAuto: () => { },
  preference: 'auto' as ColorModePreference,
});

type Mode = 'light' | 'dark';
const STORAGE_KEY = 'colorMode';
const isPreference = (v: unknown): v is ColorModePreference =>
  v === 'light' || v === 'dark' || v === 'auto';

const resolveUiThemeFromEnv = (): UiThemeName => {
  const envValue = process.env.NEXT_PUBLIC_UI_THEME;

  switch (envValue) {
    case 'flow':
      return 'flow';
    case 'default':
    case undefined:
    case null:
    case '':
    default:
      return 'default';
  }
};

const UI_THEME: UiThemeName = resolveUiThemeFromEnv();

/**
 * Main Layout component which wrapps around the whole app
 * @param param0
 * @returns
 */
export function AppGlobalStyles({ children }: { children: ReactNode }) {
  // Reactive media query — re-evaluates whenever the OS theme flips, so 'auto'
  // mode follows scheduled OS dark/light changes mid-session without a reload.
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [preference, setPreference] = useState<ColorModePreference>('auto');

  // Resolved theme mode: explicit preference wins; 'auto' defers to the OS.
  const mode: Mode = preference === 'auto' ? (prefersDarkMode ? 'dark' : 'light') : preference;

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setPreference((prev) => {
          const current: Mode = prev === 'auto' ? (prefersDarkMode ? 'dark' : 'light') : prev;
          const next: ColorModePreference = current === 'light' ? 'dark' : 'light';
          localStorage.setItem(STORAGE_KEY, next);
          return next;
        });
      },
      setModeLight: () => {
        setPreference('light');
        localStorage.setItem(STORAGE_KEY, 'light');
      },
      setModeDark: () => {
        setPreference('dark');
        localStorage.setItem(STORAGE_KEY, 'dark');
      },
      setModeAuto: () => {
        setPreference('auto');
        localStorage.setItem(STORAGE_KEY, 'auto');
      },
      preference,
    }),
    [preference, prefersDarkMode]
  );

  useEffect(() => {
    const stored = localStorage?.getItem(STORAGE_KEY);
    if (isPreference(stored)) {
      setPreference(stored);
    }
    // Otherwise default 'auto' stands and tracks the OS preference.
  }, []);

  const theme = useMemo(() => {
    const themeCreate = createTheme(getDesignTokens(mode, UI_THEME));
    return deepmerge(themeCreate, getThemedComponents(themeCreate));
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />

        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
