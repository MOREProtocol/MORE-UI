import { ReserveIncentiveResponse } from '@aave/math-utils/dist/esm/formatters/incentive/calculate-reserve-incentives';
import { Box } from '@mui/material';
import { ReactNode } from 'react';

import { FormattedNumber } from '../primitives/FormattedNumber';
import { NoData } from '../primitives/NoData';
import { IncentivesButton, RewardsButton } from './IncentivesButton';
import { PoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';

interface IncentivesCardProps {
  symbol: string;
  value: string | number;
  incentives?: ReserveIncentiveResponse[];
  rewards?: PoolReservesRewardsHumanized[];
  variant?: 'main14' | 'main16' | 'secondary14';
  symbolsVariant?: 'secondary14' | 'secondary16';
  align?: 'center' | 'flex-end' | 'flex-start';
  color?: string;
  tooltip?: ReactNode;
}

export const IncentivesCard = ({
  symbol,
  value,
  incentives,
  rewards,
  variant = 'secondary14',
  symbolsVariant,
  align,
  color,
  tooltip,
}: IncentivesCardProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'row', md: 'column' },
        gap: { xs: 1.5, md: 0 },
        alignItems: align || { xs: 'flex-end', xsm: 'center' },
        justifyContent: 'center',
        textAlign: align === 'flex-start' ? 'left' : 'center',
      }}
    >
      {value.toString() !== '-1' ? (
        <Box sx={{ display: 'flex' }}>
          <FormattedNumber
            data-cy={`apy`}
            value={value}
            percent
            variant={variant}
            symbolsVariant={symbolsVariant}
            color={color}
            symbolsColor={color}
          />
          {tooltip}
        </Box>
      ) : (
        <NoData variant={variant} color={color || 'text.secondary'} />
      )}

      <IncentivesButton incentives={incentives} symbol={symbol} />
      <RewardsButton rewards={rewards} />
    </Box>
  );
};