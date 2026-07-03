import { Box, SvgIcon, Typography } from '@mui/material';
import { ComponentType, ReactNode, SVGProps } from 'react';
import { FONT_DISPLAY } from 'src/utils/theme';

interface FaucetEmptyStateProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

// Centered muted-icon / title / description / CTA empty state for the faucet list
// (disconnected wallet, loading). Mirrors the recipe in src/modules/history/HistoryEmptyState.tsx.
export const FaucetEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: FaucetEmptyStateProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      maxWidth: 420,
      mx: 'auto',
      py: { xs: 10, md: 14 },
      px: 3,
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        borderRadius: '50%',
        bgcolor: 'background.surface',
        color: 'text.disabled',
        mb: 3,
      }}
    >
      <SvgIcon sx={{ fontSize: 26 }}>
        <Icon />
      </SvgIcon>
    </Box>
    <Typography
      sx={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, color: 'text.primary', mb: 1 }}
    >
      {title}
    </Typography>
    {description && (
      <Typography variant="secondary14" sx={{ color: 'text.secondary', mb: action ? 4 : 0 }}>
        {description}
      </Typography>
    )}
    {action}
  </Box>
);
