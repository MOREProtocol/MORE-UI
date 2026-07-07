import { Box, styled, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'src/components/primitives/Link';
import { useRootStore } from 'src/store/root';
import { FONT_BODY } from 'src/utils/theme';

import { DarkModeSwitcher } from './components/DarkModeSwitcher';
import { getSocialLinks } from './socialLinks';

interface StyledLinkProps {
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

const StyledLink = styled(Link)<StyledLinkProps>(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 13,
  '&:hover': {
    color: theme.palette.text.primary,
  },
  display: 'flex',
  alignItems: 'center',
}));

const StyledSocialLink = styled(Link)<StyledLinkProps>(({ theme }) => ({
  color: theme.palette.text.muted,
  '&:hover': {
    color: theme.palette.text.primary,
  },
  display: 'flex',
  alignItems: 'center',
}));

export function AppFooter() {
  const [setAnalyticsConfigOpen] = useRootStore((store) => [store.setAnalyticsConfigOpen]);
  const [isStatusDown, setIsStatusDown] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/uptimerobot-status');
        const json = await res.json();
        if (mounted && typeof json?.isDown === 'boolean') {
          setIsStatusDown(Boolean(json.isDown));
        }
      } catch (e) {
        // swallow errors; keep previous state
      }
    };
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const FOOTER_LINKS = useMemo(
    () => [
      {
        href: 'https://docs.more.markets/terms',
        label: 'Terms',
        key: 'Terms',
      },
      {
        href: 'https://docs.more.markets/privacy',
        label: 'Privacy',
        key: 'Privacy',
      },
      {
        href: 'https://docs.more.markets/',
        label: 'Docs',
        key: 'Docs',
      },
      {
        href: '/attributions',
        label: 'Attributions',
        key: 'Attributions',
      },
      {
        href: 'https://discord.gg/XnU7hHQgYF',
        label: 'Send feedback',
        key: 'Send feedback',
      },
      {
        href: '/',
        label: 'Manage analytics',
        key: 'Manage analytics',
        onClick: (event: React.MouseEvent) => {
          event.preventDefault();
          setAnalyticsConfigOpen(true);
        },
      },
      {
        href: 'https://deprecated.more.markets/',
        label: 'Deprecated',
        key: 'Deprecated',
      },
      {
        href: 'https://stats.uptimerobot.com/Pb5D28L3Ik',
        label: 'Status',
        key: 'Status',
        sx: isStatusDown
          ? {
              color: (theme) => theme.palette.error.main,
              '&:hover': { color: (theme) => theme.palette.error.main },
            }
          : undefined,
      },
    ],
    [isStatusDown, setAnalyticsConfigOpen]
  );

  return (
    <Box
      component="footer"
      sx={(theme) => ({
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.default',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: ['column', 'column', 'row'],
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          maxWidth: 1600,
          mx: 'auto',
          width: '100%',
          px: { xs: '16px', sm: '32px' },
          py: '20px',
        }}
      >
        {/* Left: brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Typography
            component="span"
            sx={{
              fontFamily: FONT_BODY,
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: '-0.03em',
              color: 'text.primary',
            }}
          >
            MORE
          </Typography>
          <Typography component="span" sx={{ fontSize: 12, color: 'text.muted' }}>
            © 2026 MORE Markets
          </Typography>
        </Box>

        {/* Center: legal + functional links */}
        <Box
          sx={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {FOOTER_LINKS.map((link) => (
            <StyledLink
              onClick={link.onClick}
              key={link.key}
              href={link.href}
              sx={{ px: '10px', ...link.sx }}
            >
              {link.label}
            </StyledLink>
          ))}
        </Box>

        {/* Right: social icons + theme toggle */}
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {getSocialLinks().map((icon) => (
              <StyledSocialLink href={icon.href} key={icon.title} aria-label={icon.title}>
                {icon.icon}
              </StyledSocialLink>
            ))}
          </Box>
          <DarkModeSwitcher variant="icon" />
        </Box>
      </Box>
    </Box>
  );
}
