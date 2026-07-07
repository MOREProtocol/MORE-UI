import { useMediaQuery } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';

import { getDesignTokens, getThemedComponents } from '../utils/theme';

export const ColorModeContext = React.createContext({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleColorMode: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setModeLight: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setModeDark: () => {},
});

type Mode = 'light' | 'dark';

/**
 * Main Layout component which wrapps around the whole app
 * @param param0
 * @returns
 */
export function AppGlobalStyles({ children }: { children: ReactNode }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  // Read the persisted choice synchronously on the first client render so the
  // initial paint matches the user's saved mode. Deferring this to an effect
  // (below) caused a one-frame flash of the OS scheme before correction — e.g.
  // a light-mode user on a dark OS briefly saw dark. SSR has no localStorage,
  // so it renders light (matching the emotion critical CSS).
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('colorMode');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return prefersDarkMode ? 'dark' : 'light';
  });
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('colorMode', newMode);
          return newMode;
        });
      },
      setModeLight: () => {
        setMode('light');
        localStorage.setItem('colorMode', 'light');
      },
      setModeDark: () => {
        setMode('dark');
        localStorage.setItem('colorMode', 'dark');
      },
    }),
    []
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  const theme = useMemo(() => {
    const themeCreate = createTheme(getDesignTokens(mode));
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
