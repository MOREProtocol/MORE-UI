import { calculateHealthFactorFromBalancesBigUnits, valueToBigNumber } from '@aave/math-utils';
import { ArrowNarrowRightIcon } from '@heroicons/react/outline';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import { Box, Stack, SvgIcon, Typography } from '@mui/material';
import { HealthFactorNumber } from 'src/components/HealthFactorNumber';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { ExtendedFormattedUser } from 'src/hooks/app-data-provider/useAppDataProvider';
import { BatchTransaction } from 'src/store/batchTransactionsSlice';

interface TransactionWithUsdValue extends BatchTransaction {
  amountUSD: string;
  groupIndex: number;
}

interface ModalFooterProps {
  transactionsWithUsdValues: TransactionWithUsdValue[];
  user: ExtendedFormattedUser;
  totalGasCost: string;
  totalGasCostUSD: string;
}

export const ModalFooter = ({
  totalGasCost,
  totalGasCostUSD,
  transactionsWithUsdValues,
  user,
}: ModalFooterProps) => {
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
    <Box sx={{ mb: 3 }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'top' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon sx={{ mr: 1, fontSize: '16px' }}>
              <DeviceThermostatIcon />
            </SvgIcon>
            <Typography variant="description" color="text.secondary">
              Health factor after transactions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HealthFactorNumber value={user.healthFactor} variant="secondary14" />
            {transactionsWithUsdValues.length > 0 ? (
              <>
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
              </>
            ) : (
              <></>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon sx={{ mr: 1, fontSize: '16px' }}>
              <LocalGasStationIcon />
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
  );
};
