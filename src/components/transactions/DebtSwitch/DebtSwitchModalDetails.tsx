import { valueToBigNumber } from '@aave/math-utils';
import { ArrowNarrowRightIcon } from '@heroicons/react/solid';
import { Box, Skeleton, Stack, SvgIcon, Typography } from '@mui/material';
import React, { JSX } from 'react';
import { FixedAPYTooltip } from 'src/components/infoTooltips/FixedAPYTooltip';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { Row } from 'src/components/primitives/Row';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { TextWithTooltip } from 'src/components/TextWithTooltip';
import { DetailsIncentivesLine } from 'src/components/transactions/FlowCommons/TxModalDetails';
import { weightedAverageAPY } from 'src/utils/ghoUtilities';

import { ComputedUserReserveData } from '../../../hooks/app-data-provider/useAppDataProvider';
import { GhoRange } from './DebtSwitchModalContent';

export type DebtSwitchModalDetailsProps = {
  switchSource: ComputedUserReserveData;
  switchTarget: ComputedUserReserveData;
  toAmount: string;
  fromAmount: string;
  loading: boolean;
  sourceBalance: string;
  sourceBorrowAPY: string;
  targetBorrowAPY: string;
  showAPYTypeChange: boolean;
  ghoData?: GhoRange;
};
const ArrowRightIcon = (
  <SvgIcon color="primary" sx={{ fontSize: '14px', mx: 1 }}>
    <ArrowNarrowRightIcon />
  </SvgIcon>
);

export const DebtSwitchModalDetails = ({
  switchSource,
  switchTarget,
  toAmount,
  fromAmount,
  loading,
  sourceBalance,
  sourceBorrowAPY,
  targetBorrowAPY,
  showAPYTypeChange,
  ghoData,
}: DebtSwitchModalDetailsProps) => {
  // if there is an inputAmount + GHO -> re-calculate max
  const sourceAmountAfterSwap = valueToBigNumber(sourceBalance).minus(valueToBigNumber(fromAmount));

  const targetAmountAfterSwap = valueToBigNumber(switchTarget.variableBorrows).plus(
    valueToBigNumber(toAmount)
  );

  const skeleton: JSX.Element = (
    <>
      <Skeleton variant="rectangular" height={20} width={100} sx={{ borderRadius: '4px' }} />
      <Skeleton
        variant="rectangular"
        height={15}
        width={80}
        sx={{ borderRadius: '4px', marginTop: '4px' }}
      />
    </>
  );

  let switchToApy = 0;
  let switchToRange = ghoData?.ghoApyRange;
  if (switchTarget.reserve.symbol === 'GHO' && ghoData) {
    switchToApy = weightedAverageAPY(
      ghoData.ghoVariableBorrowApy,
      ghoData.userCurrentBorrowBalance + ghoData.inputAmount,
      ghoData.userGhoAvailableToBorrowAtDiscount,
      ghoData.ghoBorrowAPYWithMaxDiscount
    );
    if (switchToRange) {
      switchToRange = [switchToRange[0], switchToApy];
    }
  }

  return (
    <>
      <Row caption={'Borrow apy'} captionVariant="description" mb={4}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {loading ? (
            <Skeleton variant="rectangular" height={20} width={100} sx={{ borderRadius: '4px' }} />
          ) : (
            <>
              <FormattedNumber value={sourceBorrowAPY} variant="secondary14" percent />
              {ArrowRightIcon}
              <FormattedNumber value={targetBorrowAPY} variant="secondary14" percent />
            </>
          )}
        </Box>
      </Row>
      {showAPYTypeChange && (
        <Row
          caption={
            <Stack direction="row">
              APY type
              <TextWithTooltip>
                <>
                  You can only switch to tokens with variable APY types. After this transaction, you
                  may change the variable rate to a stable one if available.
                </>
              </TextWithTooltip>
            </Stack>
          }
          captionVariant="description"
          mb={4}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={20}
                width={100}
                sx={{ borderRadius: '4px' }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {switchSource.reserve.symbol === 'GHO' ? (
                  <FixedAPYTooltip text={'Fixed'} typography="secondary14" />
                ) : (
                  <Typography variant="secondary14">Stable</Typography>
                )}
                <SvgIcon color="primary" sx={{ fontSize: '14px', mx: 1 }}>
                  <ArrowNarrowRightIcon />
                </SvgIcon>
                {switchTarget.reserve.symbol === 'GHO' ? (
                  <FixedAPYTooltip text={'Fixed'} typography="secondary14" />
                ) : (
                  <Typography variant="secondary14">Variable</Typography>
                )}
              </Box>
            )}
          </Box>
        </Row>
      )}
      <DetailsIncentivesLine
        incentives={switchSource.reserve.aIncentivesData}
        symbol={switchSource.reserve.symbol}
        futureIncentives={switchSource.reserve.aIncentivesData}
        futureSymbol={switchSource.reserve.symbol}
        loading={loading}
      />

      <Row
        caption={'Borrow balance after switch'}
        captionVariant="description"
        mb={4}
        align="flex-start"
      >
        <Box sx={{ textAlign: 'right' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              skeleton
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TokenIcon
                    symbol={switchSource.reserve.iconSymbol}
                    sx={{ mr: 2, ml: 4, fontSize: '16px' }}
                  />
                  <FormattedNumber
                    value={sourceAmountAfterSwap.toString()}
                    variant="secondary14"
                    compact
                  />
                </Box>
                <FormattedNumber
                  value={sourceAmountAfterSwap
                    .multipliedBy(valueToBigNumber(switchSource.reserve.priceInUSD))
                    .toString()}
                  variant="helperText"
                  compact
                  symbol="USD"
                  symbolsColor="text.secondary"
                  color="text.secondary"
                />
              </>
            )}
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
            mt={2}
          >
            {loading ? (
              skeleton
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TokenIcon
                    symbol={switchTarget.reserve.iconSymbol}
                    sx={{ mr: 2, ml: 4, fontSize: '16px' }}
                  />
                  <FormattedNumber
                    value={targetAmountAfterSwap.toString()}
                    variant="secondary14"
                    compact
                  />
                </Box>
                <FormattedNumber
                  value={targetAmountAfterSwap
                    .multipliedBy(valueToBigNumber(switchTarget.reserve.priceInUSD))
                    .toString()}
                  variant="helperText"
                  compact
                  symbol="USD"
                  symbolsColor="text.secondary"
                  color="text.secondary"
                />
              </>
            )}
          </Box>
        </Box>
      </Row>
    </>
  );
};
