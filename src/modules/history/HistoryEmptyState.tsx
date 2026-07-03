import { Box, SvgIcon, Typography } from '@mui/material';
import React, { ComponentType, ReactNode, SVGProps } from 'react';
import { FONT_DISPLAY } from 'src/utils/theme';

interface HistoryEmptyStateProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

// Centered muted-icon / description / CTA empty state, reused for the disconnected,
// no-transactions, and no-results-for-filter cases on the history table.
export const HistoryEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: HistoryEmptyStateProps) => (
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
