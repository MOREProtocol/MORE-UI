import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ActionTextMap } from './actions/ActionDetails';

export type StatusPillVariant = 'success' | 'danger' | 'info' | 'neutral';

// Semantic mapping per the design contract: supply=success, withdraw=danger,
// borrow=info, repay/collateral usage=neutral. Liquidation is a loss event (danger);
// rate changes are informational only (neutral). Reuses the existing action labels —
// no new transaction types are introduced.
export const getActionStatusVariant = (action: string): StatusPillVariant => {
  switch (action) {
    case 'Supply':
    case 'Deposit':
      return 'success';
    case 'RedeemUnderlying':
      return 'danger';
    case 'Borrow':
      return 'info';
    case 'LiquidationCall':
      return 'danger';
    case 'Repay':
    case 'UsageAsCollateral':
    case 'SwapBorrowRate':
    case 'Swap':
    default:
      return 'neutral';
  }
};

interface TransactionStatusPillProps {
  action: string;
}

export const TransactionStatusPill = ({ action }: TransactionStatusPillProps) => {
  const theme = useTheme();
  const variant = getActionStatusVariant(action);

  const dotColor =
    variant === 'success'
      ? theme.palette.success.main
      : variant === 'danger'
      ? theme.palette.error.main
      : variant === 'info'
      ? theme.palette.info.main
      : theme.palette.text.muted;

  const bgColor = variant === 'neutral' ? theme.palette.background.surface : alpha(dotColor, 0.12);
  const textColor = variant === 'neutral' ? theme.palette.text.secondary : dotColor;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 24,
        px: 1.25,
        borderRadius: '9999px',
        bgcolor: bgColor,
        maxWidth: '100%',
      }}
    >
      <Box
        component="span"
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }}
      />
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: textColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <ActionTextMap action={action} />
      </Typography>
    </Box>
  );
};
