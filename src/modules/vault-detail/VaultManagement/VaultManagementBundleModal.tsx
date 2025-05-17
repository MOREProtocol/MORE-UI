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
import React, { useState } from 'react';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
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
    clearTransactions,
    submitAndExecuteActions,
    operationsLoading,
    operationsError,
  } = useVault();
  const { reserves } = useAppDataContext();
  const theme = useTheme();
  const { currentNetworkConfig } = useProtocolDataContext();
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleClose = () => {
    setOpen(false);
    if (txHash) {
      setTxHash(null);
      clearTransactions();
    }
  };

  const handleSubmitAndExecuteActions = async () => {
    try {
      const result = await submitAndExecuteActions();
      if (result && typeof result === 'object') {
        if ('transactionHash' in result && result.transactionHash) {
          setTxHash(result.transactionHash as string);
        } else if ('safeTxHash' in result && result.safeTxHash) {
          setTxHash(result.safeTxHash as string);
        }
      }
    } catch (error) {
      console.error('Error submitting and executing actions:', error);
    }
  };

  const handleViewOnFlowscan = () => {
    if (txHash) {
      const explorerLink = currentNetworkConfig.explorerLinkBuilder({
        tx: txHash,
      });
      window.open(explorerLink, '_blank');
    }
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
                        .getCurrencySymbolsForBundleDisplay?.(transaction.inputs, reserves)
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
                        .getCurrencySymbolsForBundleDisplay?.(transaction.inputs, reserves)
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
                overflow: 'scroll',
              }}
            >
              {transaction.action?.getAmountForBundleDisplay ? (
                transaction.action.getAmountForBundleDisplay?.(transaction.inputs, reserves, {
                  variant: 'main14',
                })
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
          variant={txHash ? 'contained' : 'gradient'}
          fullWidth
          onClick={txHash ? handleViewOnFlowscan : handleSubmitAndExecuteActions}
          disabled={operationsLoading}
        >
          {operationsLoading ? (
            <CircularProgress size={20} />
          ) : txHash ? (
            'See transaction on Flowscan'
          ) : (
            'Submit and Execute'
          )}
        </Button>
      </Box>
    </TransactionsBundle>
  );
};
