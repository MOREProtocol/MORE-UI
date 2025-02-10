import { Trans } from '@lingui/react/macro';
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
          <Trans>
            This asset is frozen due to an More Protocol Governance decision.{' '}
            <Link
              href={getFrozenProposalLink()}
              sx={{ textDecoration: 'underline' }}
            >
              <Trans>More details</Trans>
            </Link>
          </Trans>
        </Box>
      }
    >
      <SvgIcon sx={{ fontSize: '20px', color: 'error.main', ml: 2 }}>
        <ExclamationIcon />
      </SvgIcon>
    </ContentWithTooltip>
  );
};
