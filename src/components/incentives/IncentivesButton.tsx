import { valueToBigNumber } from '@aave/math-utils';
import { ReserveIncentiveResponse } from '@aave/math-utils/dist/esm/formatters/incentive/calculate-reserve-incentives';
import { DotsHorizontalIcon } from '@heroicons/react/solid';
import { Box, SvgIcon, Typography } from '@mui/material';
import { useState } from 'react';
import { useRootStore } from 'src/store/root';
import { DASHBOARD } from 'src/utils/mixPanelEvents';

import { ContentWithTooltip } from '../ContentWithTooltip';
import { FormattedNumber } from '../primitives/FormattedNumber';
import { TokenIcon } from '../primitives/TokenIcon';
import { IncentivesTooltipContent } from './IncentivesTooltipContent';
import { RewardsIncentivesTooltipContent } from './MeritIncentivesTooltipContent';
import { PoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';

interface IncentivesButtonProps {
  symbol: string;
  incentives?: ReserveIncentiveResponse[];
  displayBlank?: boolean;
}

interface RewardsButtonProps {
  rewards?: PoolReservesRewardsHumanized[];
  displayBlank?: boolean;
  rounded?: boolean;
  side?: 'supply' | 'borrow';
}

const BlankIncentives = () => {
  return (
    <Box
      sx={{
        p: { xs: '0 4px', xsm: '3.625px 4px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="main12" color="text.secondary">
        &nbsp;
      </Typography>
    </Box>
  );
};

export const IncentivesButton = ({ incentives, symbol, displayBlank }: IncentivesButtonProps) => {
  const [open, setOpen] = useState(false);

  if (!(incentives && incentives.length > 0)) {
    if (displayBlank) {
      return <BlankIncentives />;
    } else {
      return null;
    }
  }

  const isIncentivesInfinity = incentives.some(
    (incentive) => incentive.incentiveAPR === 'Infinity'
  );
  const incentivesAPRSum = isIncentivesInfinity
    ? 'Infinity'
    : incentives.reduce((aIncentive, bIncentive) => aIncentive + +bIncentive.incentiveAPR, 0);

  const incentivesNetAPR = isIncentivesInfinity
    ? 'Infinity'
    : incentivesAPRSum !== 'Infinity'
      ? valueToBigNumber(incentivesAPRSum || 0).toNumber()
      : 'Infinity';

  return (
    <ContentWithTooltip
      tooltipContent={
        <IncentivesTooltipContent
          incentives={incentives}
          incentivesNetAPR={incentivesNetAPR}
          symbol={symbol}
        />
      }
      withoutHover
      setOpen={setOpen}
      open={open}
    >
      <Content
        incentives={incentives}
        incentivesNetAPR={incentivesNetAPR}
        displayBlank={displayBlank}
      />
    </ContentWithTooltip>
  );
};

export const RewardsButton = ({ rewards, displayBlank, side }: RewardsButtonProps) => {
  const [open, setOpen] = useState(false);

  if (!(rewards && rewards.length > 0)) {
    if (displayBlank) {
      return <BlankIncentives />;
    } else {
      return null;
    }
  }

  // Determine side if not provided (fallback heuristic)
  const derivedSide: 'supply' | 'borrow' = (() => {
    if (side) return side;
    const hasBorrowOnly = (rewards || []).some((r) => r.tracked_token_type === 'borrow');
    if (hasBorrowOnly) return 'borrow';
    return 'supply';
  })();

  const aprForReward = (r: PoolReservesRewardsHumanized): number => {
    if (r.tracked_token_type === 'supply') return r.incentive_apr_supply || 0;
    if (r.tracked_token_type === 'borrow') return r.incentive_apr_borrow || 0;
    // supply_and_borrow
    return derivedSide === 'borrow' ? (r.incentive_apr_borrow || 0) : (r.incentive_apr_supply || 0);
  };

  const apy = (rewards || []).reduce((acc, r) => acc + aprForReward(r), 0);

  return (
    <ContentWithTooltip
      tooltipContent={
        <RewardsIncentivesTooltipContent
          incentiveAPR={apy.toString()}
          rewardTokenSymbol={rewards[0].reward_token_symbol}
        />
      }
      withoutHover
      setOpen={setOpen}
      open={open}
    >
      <Content
        incentives={rewards ? rewards.map(r => ({
          incentiveAPR: aprForReward(r).toString(),
          rewardTokenAddress: r.reward_token_address,
          rewardTokenSymbol: r.reward_token_symbol || '',
        })) : []}
        incentivesNetAPR={apy}
        displayBlank={displayBlank}
      />
    </ContentWithTooltip>
  );
};

const Content = ({
  incentives,
  incentivesNetAPR,
  displayBlank,
  plus,
}: {
  incentives: ReserveIncentiveResponse[];
  incentivesNetAPR: number | 'Infinity';
  displayBlank?: boolean;
  plus?: boolean;
  rounded?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const trackEvent = useRootStore((store) => store.trackEvent);

  if (!(incentives && incentives.length > 0)) {
    if (displayBlank) {
      return <BlankIncentives />;
    } else {
      return null;
    }
  }

  if (incentivesNetAPR === 0) {
    if (displayBlank) {
      return <BlankIncentives />;
    } else {
      return null;
    }
  }

  const incentivesButtonValue = () => {
    if (incentivesNetAPR !== 'Infinity' && incentivesNetAPR < 10000) {
      return (
        <FormattedNumber
          value={incentivesNetAPR}
          percent
          variant="secondary12"
          color="common.white"
          symbolsColor="common.white"
        />
      );
    } else if (incentivesNetAPR !== 'Infinity' && incentivesNetAPR > 9999) {
      return (
        <FormattedNumber
          value={incentivesNetAPR}
          percent
          compact
          variant="secondary12"
          color="common.white"
          symbolsColor="common.white"
        />
      );
    } else if (incentivesNetAPR === 'Infinity') {
      return (
        <Typography variant="main12" color="common.white">
          ∞
        </Typography>
      );
    }
  };

  const iconSize = 12;

  return (
    <Box
      sx={(theme) => ({
        p: { xs: '0 4px', xsm: '1px 6px' },
        // border: `1px solid ${open ? theme.palette.action.disabled : theme.palette.divider}`,
        borderRadius: '20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'filter 0.2s ease, opacity 0.2s ease',
        background: theme.palette.gradients.newGradient,
        filter: open ? 'brightness(0.95)' : 'brightness(1.03)',
        '&:hover': {
          filter: 'brightness(0.95)',
          borderColor: 'action.disabled',
        },
      })}
      onClick={() => {
        // TODO: How to handle this for event props?
        trackEvent(DASHBOARD.VIEW_LM_DETAILS_DASHBOARD, {});
        setOpen(!open);
      }}
    >
      <Box sx={{ mr: 2, color: 'common.white' }}>
        {plus ? '+' : ''} {incentivesButtonValue()}
      </Box>
      <Box sx={{ display: 'inline-flex' }}>
        <>
          {incentives.length < 5 ? (
            <>
              {incentives.map((incentive, index) => (
                <TokenIcon
                  symbol={incentive.rewardTokenSymbol}
                  sx={{ fontSize: `${iconSize}px`, ml: -1 }}
                  key={`${incentive.rewardTokenSymbol}-${index}`}
                />
              ))}
            </>
          ) : (
            <>
              {incentives.slice(0, 3).map((incentive, index) => (
                <TokenIcon
                  symbol={incentive.rewardTokenSymbol}
                  sx={{ fontSize: `${iconSize}px`, ml: -1 }}
                  key={`${incentive.rewardTokenSymbol}-${index}-slice`}
                />
              ))}
              <SvgIcon
                sx={{
                  fontSize: `${iconSize}px`,
                  borderRadius: '50%',
                  bgcolor: 'common.white',
                  color: 'common.black',
                  ml: -1,
                  zIndex: 5,
                }}
              >
                <DotsHorizontalIcon />
              </SvgIcon>
            </>
          )}
        </>
      </Box>
    </Box>
  );
};