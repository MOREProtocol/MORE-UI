import { Trans } from "@lingui/react/macro";
import { ExclamationIcon } from '@heroicons/react/outline';
import { Box } from '@mui/material';
import { AssetCapData } from 'src/hooks/useAssetCaps';

import { Link } from '../primitives/Link';
import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

type SupplyCapMaxedTooltipProps = TextWithTooltipProps & {
  supplyCap: AssetCapData;
};

export const SupplyCapMaxedTooltip = ({ supplyCap, ...rest }: SupplyCapMaxedTooltipProps) => {
  if (!supplyCap || !supplyCap.isMaxed) return null;

  return (
    <Box sx={{ ml: 2 }}>
      <TextWithTooltip {...rest} icon={<ExclamationIcon />} iconColor="warning.main" iconSize={18}>
        <>
          <Trans>Protocol supply cap at 100% for this asset. Further supply unavailable.</Trans>{' '}
          <Link
            href="https://docs.more.markets/developers/whats-new/supply-borrow-caps"
            underline="always"
          >
            <Trans>Learn more</Trans>
          </Link>
        </>
      </TextWithTooltip>
    </Box>
  );
};
