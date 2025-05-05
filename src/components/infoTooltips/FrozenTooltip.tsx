import { ExclamationIcon } from '@heroicons/react/outline';
import { Box, SvgIcon } from '@mui/material';

import { ContentWithTooltip } from '../ContentWithTooltip';
import { Link } from '../primitives/Link';

export const getFrozenProposalLink = (): string => {
  return 'https://app.more.markets/governance';
};

export const FrozenTooltip = () => {
  return (
    <ContentWithTooltip
      tooltipContent={
        <Box>
          <>
            {'This asset is frozen due to an Aave Protocol Governance decision. '}
            <Link
              href={getFrozenProposalLink()}
              sx={{ textDecoration: 'underline' }}
            >
              More details
            </Link>
          </>
        </Box>
      }
    >
      <SvgIcon sx={{ fontSize: '20px', color: 'error.main', ml: 2 }}>
        <ExclamationIcon />
      </SvgIcon>
    </ContentWithTooltip>
  );
};
