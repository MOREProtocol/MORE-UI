import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { FONT_BODY, FONT_DISPLAY } from 'src/utils/theme';

export interface MastheadStat {
  label: string; // eyebrow, e.g. 'TOTAL MARKET SIZE'
  value: ReactNode; // typically <FormattedNumber variant="main25" .../>
  sub?: ReactNode; // e.g. '↑ 8.2% past 30d' or '46.9% utilization'
}

interface PageMastheadProps {
  title: string;
  subtitle?: string;
  stats?: MastheadStat[]; // right-aligned hairline-ruled columns
  actions?: ReactNode; // replaces stats slot when provided
}

export const PageMasthead = ({ title, subtitle, stats, actions }: PageMastheadProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'stretch' },
        justifyContent: 'space-between',
        gap: { xs: 4, md: 6 },
        mb: { xs: 5, md: 6 },
      }}
    >
      <Box sx={{ maxWidth: 560 }}>
        <Typography
          sx={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 'clamp(32px, 3vw + 20px, 40px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontFamily: FONT_BODY,
              fontSize: { xs: 14, sm: 15 },
              lineHeight: 1.55,
              color: 'text.secondary',
              mt: 1.25,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          {actions}
        </Box>
      ) : (
        stats &&
        stats.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {stats.map((stat, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  gap: 1.25,
                  minWidth: 150,
                  pl: index === 0 ? 0 : 8,
                  pr: 8,
                  borderLeft: index === 0 ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 12,
                    lineHeight: 1.3,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {stat.label}
                </Typography>

                {typeof stat.value === 'string' || typeof stat.value === 'number' ? (
                  <Typography variant="main25" sx={{ letterSpacing: '-0.02em' }}>
                    {stat.value}
                  </Typography>
                ) : (
                  stat.value
                )}

                {stat.sub && (
                  <Typography variant="secondary12" sx={{ color: 'text.secondary' }}>
                    {stat.sub}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )
      )}
    </Box>
  );
};
