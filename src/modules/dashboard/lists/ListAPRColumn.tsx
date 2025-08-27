import { ReserveIncentiveResponse } from '@aave/math-utils/dist/esm/formatters/incentive/calculate-reserve-incentives';
import { Box } from '@mui/material';
import { ReactNode } from 'react';

import { IncentivesCard } from '../../../components/incentives/IncentivesCard';
import { PoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';
import { ListColumn } from '../../../components/lists/ListColumn';

interface ListAPRColumnProps {
  value: number;
  incentives?: ReserveIncentiveResponse[];
  rewards?: PoolReservesRewardsHumanized[];
  symbol: string;
  tooltip?: ReactNode;
  children?: ReactNode;
}

export const ListAPRColumn = ({
  value,
  incentives,
  rewards,
  symbol,
  tooltip,
  children,
}: ListAPRColumnProps) => {
  return (
    <ListColumn>
      <Box sx={{ display: 'flex' }}>
        <IncentivesCard value={value} incentives={incentives} rewards={rewards} symbol={symbol} />
        {tooltip}
      </Box>
      {children}
    </ListColumn>
  );
};
