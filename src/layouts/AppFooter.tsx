import { Box, styled, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'src/components/primitives/Link';
import { useRootStore } from 'src/store/root';
import { getSocialLinks } from './socialLinks';

interface StyledLinkProps {
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

const StyledLink = styled(Link)<StyledLinkProps>(({ theme }) => ({
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
  const isFlowTheme = process.env.NEXT_PUBLIC_UI_THEME === 'flow';

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
    () => {
      const links = [
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
        // Send feedback (hidden on Flow theme)
        !isFlowTheme
          ? {
            href: 'https://discord.gg/XnU7hHQgYF',
            label: 'Send feedback',
            key: 'Send feedback',
          }
          : null,
        {
          href: '/',
          label: 'Manage analytics',
          key: 'Manage analytics',
          onClick: (event: React.MouseEvent) => {
            event.preventDefault();
            setAnalyticsConfigOpen(true);
          },
        },
        // Deprecated (hidden on Flow theme)
        !isFlowTheme
          ? {
            href: 'https://deprecated.more.markets/',
            label: 'Deprecated',
            key: 'Deprecated',
          }
          : null,
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
      ];

      return links.filter(Boolean) as typeof links[number][];
    },
    [isStatusDown, setAnalyticsConfigOpen, isFlowTheme]
  );

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        padding: ['22px 0px 40px 0px', '0 22px 0 40px', '20px 22px'],
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '22px',
        flexDirection: ['column', 'column', 'row'],
        boxShadow:
          theme.palette.mode === 'light'
            ? 'inset 0px 1px 0px rgba(0, 0, 0, 0.04)'
            : 'inset 0px 1px 0px rgba(255, 255, 255, 0.12)',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: ['wrap', 'wrap', 'nowrap'],
          justifyContent: ['center', 'center', 'flex-start'],
        }}
      >
        {FOOTER_LINKS.map((link) => (
          <StyledLink onClick={link.onClick} key={link.key} href={link.href} sx={link.sx}>
            <Typography variant="caption">{link.label}</Typography>
          </StyledLink>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: ['center', 'center', 'flex-end'] }}>
        <Box sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {getSocialLinks().map((icon) => (
            <StyledLink href={icon.href} key={icon.title} aria-label={icon.title}>
              {icon.icon}
            </StyledLink>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
