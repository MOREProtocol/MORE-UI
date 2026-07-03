import { Box, Button, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { Link, ROUTES } from 'src/components/primitives/Link';
import { FONT_DISPLAY, FONT_MONO } from 'src/utils/theme';

interface ErrorPageStateProps {
  code: string | number;
  title: string;
  description: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode; // secondary actions/links rendered below the primary CTA
}

// Centered mono-code / message / CTA empty state shared by the 404, 500, and
// generic error pages.
export const ErrorPageState = ({
  code,
  title,
  description,
  actionLabel = 'Back to Vaults',
  actionHref = ROUTES.dashboard,
  children,
}: ErrorPageStateProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      maxWidth: 480,
      mx: 'auto',
      minHeight: '60vh',
      px: 3,
      py: { xs: 8, md: 12 },
    }}
  >
    <Typography
      sx={{
        fontFamily: FONT_MONO,
        fontWeight: 600,
        fontSize: { xs: 40, md: 56 },
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: 'text.secondary',
        mb: 2.5,
      }}
    >
      {code}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        fontSize: { xs: 22, md: 26 },
        lineHeight: 1.25,
        letterSpacing: '-0.01em',
        color: 'text.primary',
        mb: 1.5,
      }}
    >
      {title}
    </Typography>
    <Typography variant="secondary16" sx={{ color: 'text.secondary', mb: 5 }}>
      {description}
    </Typography>
    <Button component={Link} href={actionHref} variant="contained" color="primary">
      {actionLabel}
    </Button>
    {children}
  </Box>
);
