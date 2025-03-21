import { USD_DECIMALS, valueToBigNumber } from '@aave/math-utils';
import { ArrowRightIcon, XIcon } from '@heroicons/react/outline';
import { Box, Button, Drawer, IconButton, Stack, SvgIcon, Typography } from '@mui/material';
import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import { useEffect, useMemo } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { useAccount, useWalletClient } from 'wagmi';

const useSigner = () => {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  if (isConnected && walletClient) {
    const provider = new ethers.providers.Web3Provider(
      walletClient as ethers.providers.ExternalProvider
    );
    const signer = provider.getSigner();
    return signer;
  }
  return null;
};

interface BatchTransactionsModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const BatchTransactionsModal = ({ open, setOpen }: BatchTransactionsModalProps) => {
  const router = useRouter();

  const { batchTransactionGroups, removeBatchItem, getBatchTx, clearBatch, setSigner, signer } =
    useRootStore((state) => ({
      batchTransactionGroups: state.batchTransactionGroups,
      getBatchTx: state.getBatchTx,
      removeBatchItem: state.removeBatchItem,
      clearBatch: state.clearBatch,
      setSigner: state.setSigner,
      signer: state.signer,
    }));
  const { sendTx } = useWeb3Context();
  const { reserves, marketReferencePriceInUsd } = useAppDataContext();

  // Calculate USD values for each transaction
  const transactionsWithUsdValues = useMemo(() => {
    return batchTransactionGroups
      .map((group, index) => {
        return group
          .filter((transaction) =>
            ['supply', 'borrow', 'repay', 'withdraw'].includes(transaction.action)
          )
          .map((transaction) => {
            // Find the reserve that matches this transaction's asset
            const matchingReserve = reserves.find(
              (reserve) => reserve.symbol.toLowerCase() === transaction.symbol.toLowerCase()
            );
            let amountUSD = '0';
            if (matchingReserve) {
              // Calculate USD value using the reserve's price data
              const amountInTokens = valueToBigNumber(transaction.amount);
              amountUSD = amountInTokens
                .multipliedBy(matchingReserve.formattedPriceInMarketReferenceCurrency)
                .multipliedBy(marketReferencePriceInUsd)
                .shiftedBy(-USD_DECIMALS)
                .toString();
            }

            return {
              ...transaction,
              amountUSD,
              groupIndex: index,
            };
          })
          .filter((transaction) => !transaction.isHidden);
      })
      .flat();
  }, [batchTransactionGroups, reserves, marketReferencePriceInUsd]);

  const handleClose = () => {
    setOpen(false);
  };

  const currentWalletSigner = useSigner();
  useEffect(() => {
    if (currentWalletSigner && !signer) {
      setSigner(currentWalletSigner);
    }
  }, [setSigner, currentWalletSigner, signer]);

  const handleExecuteBatch = async () => {
    try {
      console.log('batchTransactionGroups', batchTransactionGroups);
      if (batchTransactionGroups.length === 0) {
        throw new Error('No transactions in batch');
      }

      const approvalTransactions = batchTransactionGroups
        .flat()
        .filter((transaction) => ['approve', 'delegate'].includes(transaction.action));
      console.log('approvalTransactions', approvalTransactions);

      // // Process each delegation sequentially
      // // TODO: can it be done all in once?
      if (approvalTransactions.length > 0) {
        for (const approval of approvalTransactions) {
          console.log('Processing approval:', approval);
          // approval.status = 'pending';
          const approvalResult = await sendTx(approval.tx);
          // TODO: doesn't work, need to use better state management
          // approval.status = 'approved';
          console.log('Approval transaction result:', approvalResult);
        }
      }

      const batchTx = await getBatchTx();
      console.log('batchTx', batchTx);
      const response = await sendTx(batchTx);
      console.log('Batch transaction completed:', response);
      setOpen(false);
      clearBatch();
    } catch (error) {
      console.error('Error executing batch transactions:', error);
    }
  };

  // Generate dynamic button text based on batch transactions
  const getButtonText = () => {
    if (batchTransactionGroups.length === 0) return 'Execute Batch';

    // const hasApprovals = getApprovals().length > 0;
    const actionTypes = new Set(batchTransactionGroups.flat().map((tx) => tx.action));

    const actionTexts = [];
    if (actionTypes.has('supply')) actionTexts.push('Supply');
    if (actionTypes.has('borrow')) actionTexts.push('Borrow');
    if (actionTypes.has('repay')) actionTexts.push('Repay');
    if (actionTypes.has('withdraw')) actionTexts.push('Withdraw');

    // Format with commas and "and" for the last item
    if (actionTexts.length === 1) {
      return actionTexts[0];
    } else if (actionTexts.length === 2) {
      return `${actionTexts[0]} and ${actionTexts[1]}`;
    } else {
      const lastItem = actionTexts.pop();
      return `${actionTexts.join(', ')} and ${lastItem}`;
    }
  };

  // Calculate total gas cost
  const totalGasCost = 0.0023; // ETH
  const totalGasCostUSD = 23.92; // USD

  // Calculate health factor after transactions
  const healthFactorAfter = 4.9;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          paddingX: 3,
          paddingY: 2,
          width: { xs: '100%', sm: 400 },
          maxWidth: '100%',
          bgcolor: 'background.paper',
          overflow: 'auto',
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h2" component="div">
          Batched Transactions
        </Typography>
        <IconButton onClick={handleClose} sx={{ p: 1 }}>
          <SvgIcon>
            <ArrowRightIcon />
          </SvgIcon>
        </IconButton>
      </Box>

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        {batchTransactionGroups.flat().filter((tx) => ['approve', 'delegate'].includes(tx.action))
          .length > 0 && (
          <Box sx={{ mb: 5 }}>
            <Typography variant="h4" color="text.secondary" sx={{ mb: 1 }}>
              Approvals and delegations
            </Typography>
            {batchTransactionGroups
              .flat()
              .filter((tx) => ['approve', 'delegate'].includes(tx.action))
              .map((approval, index) => {
                const tokenReserve = reserves.find(
                  (reserve) =>
                    reserve.underlyingAsset.toLowerCase() === approval.tx?.to?.toLowerCase()
                );
                return (
                  <Box
                    key={`approval-${index}`}
                    sx={{
                      mb: 1,
                      p: 2,
                      borderRadius: '8px',
                      bgcolor:
                        approval.status === 'pending'
                          ? 'warning.200'
                          : approval.status === 'approved'
                          ? 'success.200'
                          : approval.status === 'failed'
                          ? 'error.200'
                          : 'background.surface',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box display="flex" flexDirection="row" alignItems="flex-start">
                      <Typography variant="h3" color="text">
                        {approval.action === 'approve' ? 'Approve ' : 'Delegate '}
                      </Typography>
                      <Typography variant="h3" color="text.secondary">
                        {tokenReserve?.symbol || ''}
                      </Typography>
                    </Box>
                    <TokenIcon symbol={tokenReserve?.symbol || 'TOKEN'} sx={{ fontSize: '24px' }} />
                  </Box>
                );
              })}
          </Box>
        )}
        {transactionsWithUsdValues.length > 0 && (
          <Box sx={{ mb: 5 }}>
            <Typography variant="h4" color="text.secondary" sx={{ mb: 1 }}>
              Transactions
            </Typography>
            {transactionsWithUsdValues.map((transaction, index) => (
              <Box
                key={index}
                sx={{
                  mb: 4,
                  p: 3,
                  borderRadius: '12px',
                  bgcolor:
                    transaction.status === 'pending'
                      ? 'warning.200'
                      : transaction.status === 'approved'
                      ? 'success.200'
                      : transaction.status === 'failed'
                      ? 'error.200'
                      : 'background.surface',
                  position: 'relative',
                }}
              >
                <IconButton
                  onClick={() => removeBatchItem(index)}
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

                <Typography variant="h3" sx={{ mb: 2 }}>
                  {transaction.action === 'supply'
                    ? 'Supply'
                    : transaction.action === 'borrow'
                    ? 'Borrow'
                    : transaction.action === 'repay'
                    ? 'Repay'
                    : transaction.action === 'withdraw'
                    ? 'Withdraw'
                    : transaction.action === 'transfer'
                    ? 'Transfer'
                    : 'Unknown Action'}
                </Typography>
                <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
                  Amount
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box display="flex" flexDirection="column" alignItems="flex-start">
                    <FormattedNumber
                      value={parseFloat(transaction.amount)}
                      symbol={transaction.symbol}
                      variant="h3"
                    />
                    <FormattedNumber
                      value={parseFloat(transaction.amountUSD)}
                      variant="description"
                      color="text.secondary"
                      symbol="USD"
                      prefix="$"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TokenIcon symbol={transaction.symbol} sx={{ fontSize: '32px', mr: 1 }} />
                    {/* <Typography variant="h3">{transaction.symbol}</Typography> */}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <Button
            variant="outlined"
            sx={{ borderRadius: '20px', px: 4 }}
            onClick={() => {
              router.push('/markets');
              setOpen(false);
            }}
          >
            Explore other markets
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          mt: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SvgIcon sx={{ mr: 1, fontSize: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                  </svg>
                </SvgIcon>
                <Typography variant="description" color="text.secondary">
                  Cumulated cost
                </Typography>
              </Box>
              <Typography variant="description">${totalGasCostUSD}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SvgIcon sx={{ mr: 1, fontSize: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-6h2v2h-2zm0-8h2v6h-2z" />
                  </svg>
                </SvgIcon>
                <Typography variant="description" color="text.secondary">
                  Health factor after transactions
                </Typography>
              </Box>
              <Typography variant="description" color="success.main">
                {healthFactorAfter}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SvgIcon sx={{ mr: 1, fontSize: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                  </svg>
                </SvgIcon>
                <Typography variant="description" color="text.secondary">
                  Max gas cost
                </Typography>
              </Box>
              <Typography variant="description">
                {totalGasCost} ETH (${totalGasCostUSD})
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box>
          <Button
            variant={batchTransactionGroups.length === 0 ? 'contained' : 'gradient'}
            fullWidth
            size="large"
            onClick={handleExecuteBatch}
            disabled={batchTransactionGroups.length === 0}
            sx={{ borderRadius: '6px', py: 2 }}
          >
            {getButtonText()}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
