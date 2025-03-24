import {
  calculateHealthFactorFromBalancesBigUnits,
  USD_DECIMALS,
  valueToBigNumber,
} from '@aave/math-utils';
import { ArrowNarrowRightIcon, ArrowRightIcon, XIcon } from '@heroicons/react/outline';
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  SvgIcon,
  Typography,
} from '@mui/material';
// import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { HealthFactorNumber } from 'src/components/HealthFactorNumber';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import {
  ExtendedFormattedUser,
  useAppDataContext,
} from 'src/hooks/app-data-provider/useAppDataProvider';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { BatchTransaction } from 'src/store/batchTransactionsSlice';
import { useRootStore } from 'src/store/root';

interface BatchTransactionsModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  user: ExtendedFormattedUser;
}

export const BatchTransactionsModal = ({ open, setOpen, user }: BatchTransactionsModalProps) => {
  const router = useRouter();
  const [txCallResult, setTxCallResult] = useState<string | null>(null);
  const [isBatchTransactionsLoading, setIsBatchTransactionsLoading] = useState<boolean>(false);
  const { currentNetworkConfig } = useProtocolDataContext();

  const {
    batchTransactionGroups,
    removeBatchItem,
    getBatchTx,
    getGasLimit,
    clearBatch,
    updateBatchItemStatus,
  } = useRootStore((state) => ({
    batchTransactionGroups: state.batchTransactionGroups,
    getBatchTx: state.getBatchTx,
    getGasLimit: state.getGasLimit,
    removeBatchItem: state.removeBatchItem,
    clearBatch: state.clearBatch,
    updateBatchItemStatus: state.updateBatchItemStatus,
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
              (reserve) =>
                reserve.underlyingAsset.toLowerCase() === transaction.poolAddress.toLowerCase()
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

  const handleApproveOrDelegate = async (
    approval: BatchTransaction,
    groupIndex: number,
    approvalIndex: number
  ) => {
    console.log('Approving:', approval);
    updateBatchItemStatus(groupIndex, approvalIndex, 'pending');
    const approvalResult = await sendTx(approval.tx);
    console.log('Approval transaction result:', approvalResult);
    updateBatchItemStatus(groupIndex, approvalIndex, 'approved');
  };

  const handleExecuteBatch = async () => {
    if (txCallResult) {
      const explorerLink = currentNetworkConfig.explorerLinkBuilder({
        tx: txCallResult,
      });
      window.open(explorerLink, '_blank');
      return;
    }
    try {
      setIsBatchTransactionsLoading(true);
      console.log('batchTransactionGroups', batchTransactionGroups);
      if (batchTransactionGroups.length === 0) {
        throw new Error('No transactions in batch');
      }

      const batchTx = await getBatchTx();
      console.log('batchTx', batchTx);
      const response = await sendTx(batchTx);
      console.log('Batch transaction completed:', response);
      setTxCallResult(response);
      // setOpen(false);
      setTimeout(() => {
        clearBatch();
      }, 30000);
    } catch (error) {
      console.error('Error executing batch transactions:', error);
    } finally {
      setIsBatchTransactionsLoading(false);
    }
  };

  // Generate dynamic button text based on batch transactions
  const getButtonText = () => {
    if (txCallResult) return 'See transaction on Flowscan';

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
  const totalGasCost = getGasLimit();
  const nativeTokenPriceInUSD = useMemo(
    () =>
      reserves.find(
        (reserve) => reserve.symbol.toLowerCase() === 'wflow' // TODO: make it dynamic to chain
      )?.priceInUSD,
    [reserves]
  );
  const totalGasCostUSD = Number(totalGasCost) * Number(nativeTokenPriceInUSD);

  // Calculate health factor after transactions
  const totalCollateralAmountInUsd = transactionsWithUsdValues.flat().reduce((acc, tx) => {
    if (tx.action === 'supply') {
      return acc.plus(tx.amountUSD);
    }
    if (tx.action === 'withdraw') {
      return acc.minus(tx.amountUSD);
    }
    return acc;
  }, valueToBigNumber(0));
  const totalBorrowAmountInUsd = transactionsWithUsdValues.flat().reduce((acc, tx) => {
    if (tx.action === 'borrow') {
      return acc.plus(tx.amountUSD);
    }
    if (tx.action === 'repay') {
      return acc.minus(tx.amountUSD);
    }
    return acc;
  }, valueToBigNumber(0));

  const newHealthFactor = calculateHealthFactorFromBalancesBigUnits({
    collateralBalanceMarketReferenceCurrency: valueToBigNumber(user.totalCollateralUSD).plus(
      totalCollateralAmountInUsd
    ),
    borrowBalanceMarketReferenceCurrency: valueToBigNumber(user.totalBorrowsUSD).plus(
      totalBorrowAmountInUsd
    ),
    currentLiquidationThreshold: user.currentLiquidationThreshold,
  });

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
            {batchTransactionGroups.map((group, groupIndex) => {
              return group
                .filter((tx) => ['approve', 'delegate'].includes(tx.action))
                .map((approval, approvalIndex) => {
                  return (
                    <Box
                      key={`approval-${groupIndex}-${approvalIndex}`}
                      sx={{
                        mb: 1,
                        p: 2,
                        borderRadius: '4px',
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
                      <Box display="flex" flexDirection="row" alignItems="center" gap={2}>
                        <TokenIcon symbol={approval.symbol || 'TOKEN'} sx={{ fontSize: '24px' }} />
                        <Typography variant="h3" color="text">
                          {approval.action === 'approve' ? 'Approve' : 'Delegate'}
                        </Typography>
                        <Typography variant="h3" color="text.secondary">
                          {approval.symbol || ''}
                        </Typography>
                      </Box>
                      {approval.status !== 'approved' && (
                        <Button
                          variant="contained"
                          onClick={() => {
                            handleApproveOrDelegate(approval, groupIndex, approvalIndex);
                          }}
                        >
                          {approval.action === 'approve' ? 'Approve' : 'Delegate'}
                          {approval.status === 'pending' && (
                            <CircularProgress color="inherit" size="16px" sx={{ ml: 2 }} />
                          )}
                        </Button>
                      )}
                    </Box>
                  );
                });
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
                  borderRadius: '4px',
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
            sx={{ borderRadius: '4px', px: 4 }}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'top' }}>
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HealthFactorNumber value={user.healthFactor} variant="secondary14" />
                <SvgIcon color="primary" sx={{ fontSize: '14px', mx: 1 }}>
                  <ArrowNarrowRightIcon />
                </SvgIcon>
                <HealthFactorNumber
                  value={
                    isNaN(Number(newHealthFactor.toString()))
                      ? user.healthFactor
                      : newHealthFactor.toString()
                  }
                  variant="secondary14"
                />
              </Box>
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
              <Box>
                <FormattedNumber value={totalGasCost} symbol="FLOW" variant="description" />
                {' ('}
                <FormattedNumber value={totalGasCostUSD} symbol="USD" variant="description" />
                {')'}
              </Box>
            </Box>
          </Stack>
        </Box>

        <Box>
          <Button
            variant={batchTransactionGroups.length === 0 || txCallResult ? 'contained' : 'gradient'}
            fullWidth
            size="large"
            onClick={handleExecuteBatch}
            disabled={batchTransactionGroups.length === 0}
            sx={{ borderRadius: '6px', py: 2 }}
          >
            {isBatchTransactionsLoading ? (
              <CircularProgress color="inherit" size="24px" sx={{ mr: 2 }} />
            ) : (
              getButtonText()
            )}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
