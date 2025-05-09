import { ExclamationIcon } from '@heroicons/react/outline';
import { Typography } from '@mui/material';
import { ReactNode } from 'react';
import { MigrationDisabled } from 'src/store/v3MigrationSelectors';

import { Link } from '../primitives/Link';
import { TextWithTooltip } from '../TextWithTooltip';

interface MigrationDisabledTooltipProps {
  dashboardLink?: string;
  marketName?: string;
  warningType: MigrationDisabled;
  isolatedV3?: boolean;
}

export const MigrationDisabledTooltip = ({
  dashboardLink,
  marketName,
  warningType,
  isolatedV3,
}: MigrationDisabledTooltipProps) => {
  const warningText: Record<MigrationDisabled, ReactNode> = {
    [MigrationDisabled.EModeBorrowDisabled]: (
      <>
        {`Asset cannot be migrated to ${marketName} V3 Market due to E-mode restrictions. You can disable or manage E-mode categories in your `}
        <Link href={dashboardLink || ''} target="_blank" underline="always">
          V3 Dashboard
        </Link>
      </>
    ),
    [MigrationDisabled.AssetNotFlashloanable]: (
      <>{'Flashloan is disabled for this asset, hence this position cannot be migrated.'}</>
    ),
    [MigrationDisabled.InsufficientLiquidity]: (
      <>
        {`Asset cannot be migrated due to insufficient liquidity or borrow cap limitation in ${marketName} v3 market.`}
      </>
    ),
    [MigrationDisabled.NotEnoughtSupplies]: (
      <>{`Asset cannot be migrated due to supply cap restriction in ${marketName} v3 market.`}</>
    ),
    [MigrationDisabled.ReserveFrozen]: (
      <>{`Asset is frozen in ${marketName} v3 market, hence this position cannot be migrated.`}</>
    ),
    [MigrationDisabled.IsolationModeBorrowDisabled]: isolatedV3 ? (
      <>
        {`Asset cannot be migrated because you have isolated collateral in ${marketName} v3 Market which limits borrowable assets. You can manage your collateral in `}
        <Link href={dashboardLink || ''} target="_blank" underline="always">
          {marketName} V3 Dashboard
        </Link>{' '}
      </>
    ) : (
      <>
        {`Asset cannot be migrated to ${marketName} v3 Market since collateral asset will enable isolation mode.`}
      </>
    ),
    [MigrationDisabled.V3AssetMissing]: (
      <>
        {`Underlying asset does not exist in ${marketName} v3 Market, hence this position cannot be migrated.`}
      </>
    ),
  };

  return (
    <TextWithTooltip iconSize={16} color="error.main" icon={<ExclamationIcon />}>
      <Typography variant="caption" color="text.secondary">
        {warningText[warningType]}
      </Typography>
    </TextWithTooltip>
  );
};
