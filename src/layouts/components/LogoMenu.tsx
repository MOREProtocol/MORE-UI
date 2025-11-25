import { Box, Button, ButtonGroup, Divider, IconButton, Menu, MenuItem, SvgIcon, Typography, useTheme } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import XIcon from '@mui/icons-material/X';
import DiscordIcon from '/public/icons/discord.svg';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Link } from 'src/components/primitives/Link';
import { ColorModeContext } from 'src/layouts/AppGlobalStyles';
import { uiConfig } from 'src/uiConfig';

interface LogoMenuProps {
  logo:
  | { src: string; width: number; height: number }
  | { node: React.ReactNode };
}

export const LogoMenu: React.FC<LogoMenuProps> = ({ logo }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const colorMode = React.useContext(ColorModeContext);
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const logoRef = React.useRef<HTMLButtonElement | null>(null);

  const defaultUi = uiConfig.default;
  const defaultLogoSrc = isLight ? defaultUi.appLogo : defaultUi.appLogoDark;
  const showPoweredByMore =
    process.env.NEXT_PUBLIC_UI_THEME &&
    process.env.NEXT_PUBLIC_UI_THEME !== 'default';

  const handleOpen = () => setAnchorEl(logoRef.current);
  const handleClose = () => setAnchorEl(null);
  const handleToggle = () => {
    if (open) handleClose();
    else handleOpen();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleToggle}
        ref={logoRef}
        sx={{ lineHeight: 0, p: 0, m: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
      >
        {'node' in logo ? logo.node : <img src={logo.src} alt="MORE" width={logo.width} height={logo.height} />}
      </Box>
      <IconButton onClick={handleToggle} size="small" sx={{ color: 'text.primary' }} aria-label={open ? 'Close menu' : 'Open menu'}>
        <SvgIcon>{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</SvgIcon>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        keepMounted
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem component={Link} href="/vaults" onClick={handleClose}>Vaults</MenuItem>
        {(!process.env.NEXT_PUBLIC_UI_THEME ||
          process.env.NEXT_PUBLIC_UI_THEME === 'default') && (
            <MenuItem component={Link} href="/markets" onClick={handleClose}>
              Markets
            </MenuItem>
          )}
        <MenuItem component={Link} href="/bridge" onClick={handleClose}>Bridge</MenuItem>
        <Divider />
        <MenuItem component={Link} href="https://docs.more.markets/terms" onClick={handleClose}>Terms</MenuItem>
        <MenuItem component={Link} href="https://docs.more.markets/privacy" onClick={handleClose}>Privacy</MenuItem>
        <MenuItem component={Link} href="https://docs.more.markets/" onClick={handleClose}>Docs</MenuItem>
        <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
            <IconButton component={Link} href="https://x.com/more_defi/" aria-label="X">
              <XIcon />
            </IconButton>
            <IconButton component={Link} href="https://discord.gg/XnU7hHQgYF" aria-label="Discord">
              <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 24 }}>
                <DiscordIcon />
              </SvgIcon>
            </IconButton>
            <IconButton component={Link} href="https://github.com/MOREProtocol" aria-label="Github">
              <GitHubIcon />
            </IconButton>
          </Box>
          <ButtonGroup fullWidth variant="outlined">
            <Button
              onClick={() => { colorMode.setModeLight(); }}
              startIcon={<LightModeIcon />}
              variant={isLight ? 'contained' : 'outlined'}
              aria-pressed={isLight}
            >
              Light
            </Button>
            <Button
              onClick={() => { colorMode.setModeDark(); }}
              startIcon={<DarkModeIcon />}
              variant={!isLight ? 'contained' : 'outlined'}
              aria-pressed={!isLight}
            >
              Dark
            </Button>
          </ButtonGroup>
          {showPoweredByMore && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Powered by
              </Typography>
              <Box
                component="img"
                src={defaultLogoSrc}
                alt="MORE"
                sx={{ height: 18, width: 'auto' }}
              />
            </Box>
          )}
        </Box>
      </Menu>
    </Box>
  );
};


