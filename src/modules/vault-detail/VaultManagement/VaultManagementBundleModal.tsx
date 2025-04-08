import { XIcon } from '@heroicons/react/outline';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  SvgIcon,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { TransactionsBundle } from 'src/layouts/TransactionsBundle/TransactionsBundle';

interface VaultManagementBundleModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const VaultManagementBundleModal = ({ open, setOpen }: VaultManagementBundleModalProps) => {
  const {
    transactions,
    removeTransaction,
    submitAndExecuteActions,
    operationsLoading,
    operationsError,
  } = useVault();
  const { reserves } = useAppDataContext();
  const theme = useTheme();

  const handleClose = () => {
    setOpen(false);
  };

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
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', mr: 1 }}>
                      {transaction.action
                        .getCurrencySymbolsForBundleDisplay?.(transaction.inputs)
                        .map((symbol, index) => (
                          <TokenIcon
                            key={index}
                            symbol={symbol}
                            sx={{
                              width: 20,
                              height: 20,
                              ml: index > 0 ? -1 : 0,
                              border: '1px solid',
                              borderColor: 'background.paper',
                              borderRadius: '50%',
                            }}
                          />
                        ))}
                    </Box>
                    <Typography variant="secondary12">
                      {transaction.action
                        .getCurrencySymbolsForBundleDisplay?.(transaction.inputs)
                        .join(' / ')}
                    </Typography>
                  </Box>
                ) : null}
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
                transaction.action.getAmountForBundleDisplay?.(
                  transaction.inputs,
                  {
                    variant: 'main14',
                  },
                  reserves
                )
              ) : (
                <Typography variant="secondary12" fontStyle="italic">
                  No amount to display
                </Typography>
              )}
            </Box>
          </Box>
        ))}

        {operationsError && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'error.light',
              color: 'error.main',
              borderRadius: '4px',
              fontSize: '14px',
              overflow: 'scroll',
            }}
          >
            <Typography variant="secondary12" color="white">
              {operationsError.message || operationsError.toString()}
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={submitAndExecuteActions}
          disabled={operationsLoading}
        >
          {operationsLoading ? <CircularProgress size={20} /> : 'Submit and Execute'}
        </Button>
      </Box>
    </TransactionsBundle>
  );
};
