import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SxProps, Theme } from '@mui/system';
import { TIME_PERIODS, TimePeriod } from './timePeriods';

export interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onChange: (period: TimePeriod) => void;
  containerSx?: SxProps<Theme>;
}

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  selectedPeriod,
  onChange,
  containerSx,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        right: 8,
        zIndex: 10,
        display: 'flex',
        gap: 1,
        backgroundColor: theme.palette.background.paper,
        ...(containerSx as object),
      }}
    >
      {TIME_PERIODS.map((period) => (
        <Typography
          key={period}
          variant="caption"
          onClick={() => onChange(period)}
          sx={{
            color: period === selectedPeriod ? theme.palette.primary.main : theme.palette.text.secondary,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: period === selectedPeriod ? 600 : 400,
            px: 0.5,
            py: 0.25,
            borderRadius: 1,
            '&:hover': {
              color: theme.palette.primary.main,
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          {period}
        </Typography>
      ))}
    </Box>
  );
};


