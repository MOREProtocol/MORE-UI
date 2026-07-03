import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import {
  Box,
  FormControlLabel,
  IconButton,
  ListItem,
  ListItemText,
  MenuItem,
  Switch,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useRootStore } from 'src/store/root';
import { SETTINGS } from 'src/utils/mixPanelEvents';

import { ColorModeContext } from '../AppGlobalStyles';

interface DarkModeSwitcherProps {
  component?: typeof MenuItem | typeof ListItem;
  /** Render a 36px circular ghost icon button (moon/sun) instead of the list row. */
  variant?: 'listItem' | 'icon';
}

export const DarkModeSwitcher = ({
  component = ListItem,
  variant = 'listItem',
}: DarkModeSwitcherProps) => {
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const trackEvent = useRootStore((store) => store.trackEvent);
  const isDark = theme.palette.mode === 'dark';

  const handleToggle = () => {
    trackEvent(SETTINGS.DARK_MODE, { mode: theme.palette.mode });
    colorMode.toggleColorMode();
  };

  if (variant === 'icon') {
    return (
      <IconButton
        onClick={handleToggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          width: 36,
          height: 36,
          color: 'text.muted',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            color: 'text.primary',
            bgcolor: 'background.surface',
          },
        }}
      >
        {isDark ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
      </IconButton>
    );
  }

  return (
    <Box
      component={component}
      onClick={colorMode.toggleColorMode}
      sx={{
        color: { xs: '#F1F1F3', md: 'text.primary' },
        py: { xs: 1.5, md: 2 },
      }}
    >
      <ListItemText>Dark mode</ListItemText>
      <FormControlLabel
        sx={{ mr: 0 }}
        value="darkmode"
        control={
          <Switch
            onClick={() => trackEvent(SETTINGS.DARK_MODE, { mode: theme.palette.mode })}
            disableRipple
            checked={isDark}
            sx={{ '.MuiSwitch-track': { bgcolor: { xs: '#FFFFFF1F', md: 'primary.light' } } }}
          />
        }
        label={isDark ? 'On' : 'Off'}
        labelPlacement="start"
      />
    </Box>
  );
};
