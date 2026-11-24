import { ExclamationIcon } from '@heroicons/react/outline';
import { Box, SvgIcon } from '@mui/material';

import { ContentWithTooltip } from '../ContentWithTooltip';

export const getFrozenProposalLink = (): string => {
  return 'https://app.more.markets/governance';
};

export const FrozenTooltipText = () => (
  <>
    This asset is frozen. Supplying and borrowing are disabled, but you can still withdraw and
    repay.
  </>
);

export const FrozenTooltip = () => {
  return (
    <ContentWithTooltip
      tooltipContent={
        <Box>
          <FrozenTooltipText />
        </Box>
      }
    >
      <SvgIcon sx={{ fontSize: '20px', color: 'error.main', ml: 2 }}>
        <ExclamationIcon />
      </SvgIcon>
    </ContentWithTooltip>
  );
};
