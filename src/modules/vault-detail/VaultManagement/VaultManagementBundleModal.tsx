import { XIcon } from '@heroicons/react/outline';
import { Box, IconButton, SvgIcon, Typography, useTheme } from '@mui/material';
import React from 'react';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useVaultBundle } from 'src/hooks/useVaultBundle';
import { TransactionsBundle } from 'src/layouts/TransactionsBundle/TransactionsBundle';

interface VaultManagementBundleModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const VaultManagementBundleModal = ({ open, setOpen }: VaultManagementBundleModalProps) => {
  const { transactions, removeTransaction } = useVaultBundle();
  const theme = useTheme();

  const handleClose = () => {
    setOpen(false);
  };

  console.log(
    'transaction',
    transactions.map((tx) => tx.action.getAmountForBundleDisplay?.(tx.inputs))
  );

  return (
    <TransactionsBundle
      isOpen={open}
      setIsOpen={setOpen}
      title="Batched Transactions"
      onClose={handleClose}
    >
      <Box sx={{ mb: 5, p: 2 }}>
        {transactions.map((transaction, index) => (
          <Box
            key={index}
            sx={{
              mb: 4,
              p: 3,
              borderRadius: '4px',
              bgcolor: 'background.surface',
              position: 'relative',
            }}
          >
            <IconButton
              onClick={() => removeTransaction(transaction.id)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                p: 0.5,
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                },
              }}
              size="small"
              aria-label="remove transaction"
            >
              <SvgIcon fontSize="small">
                <XIcon />
              </SvgIcon>
            </IconButton>

            <Typography variant="h4" sx={{ mb: 4 }}>
              {transaction.action.actionButtonText}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {transaction.action?.getCurrencySymbolsForBundleDisplay ? (
                  transaction.action
                    .getCurrencySymbolsForBundleDisplay?.(transaction.inputs)
                    .map((symbol, index, arr) => (
                      <React.Fragment key={index}>
                        <TokenIcon symbol={symbol} sx={{ ml: 1, width: 15, height: 15 }} />
                        <Typography variant="secondary12">
                          {symbol}
                          {index < arr.length - 1 ? ' / ' : ''}
                        </Typography>
                      </React.Fragment>
                    ))
                ) : (
                  <Typography variant="secondary12" fontStyle="italic">
                    No currency symbols to display
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <img
                  src={transaction.facet.icon}
                  alt={transaction.facet.name}
                  style={{ width: 15, height: 15 }}
                />
                <Typography variant="secondary12">{transaction.facet.name}</Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 3,
                borderRadius: '4px',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              {transaction.action?.getAmountForBundleDisplay ? (
                transaction.action.getAmountForBundleDisplay?.(transaction.inputs, {
                  variant: 'h4',
                })
              ) : (
                <Typography variant="secondary12" fontStyle="italic">
                  No amount to display
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </TransactionsBundle>
  );
};
