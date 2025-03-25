import { Box, Typography } from '@mui/material';

export const ModalEmpty = () => {
  return (
    <Box sx={{ p: 5, margin: 5, border: '1px solid #E0E0E0', borderRadius: 2 }}>
      <Typography variant="secondary12" align="center" sx={{ mb: 2 }}>
        The MORE Batch Transactions feature allows you to execute multiple transactions in a single
        call. This is useful for saving gas and time when performing multiple actions on the
        platform.
      </Typography>
      <Typography variant="secondary12" align="center">
        For example: use Bridged USDC collateral to borrow USD Flow, and then supply USD Flow into a
        vault.
      </Typography>
    </Box>
  );
};
