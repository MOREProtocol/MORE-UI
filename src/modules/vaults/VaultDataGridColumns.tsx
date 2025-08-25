import {
  Avatar,
  Box,
  Button,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React from 'react';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { ColumnDefinition } from 'src/components/primitives/DataGrid';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { PoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';

// Cell Components
export const VaultCell: React.FC<{ name: string }> = ({ name }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 0.5 : 1.5,
        minWidth: isMobile ? '80px' : '100px',
        maxWidth: isMobile ? '130px' : '180px',
      }}
    >
      <Typography
        variant={isMobile ? 'caption' : 'secondary14'}
        sx={{
          // fontSize: isMobile ? '0.75rem' : undefined,
          lineHeight: isMobile ? 1.2 : undefined,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </Typography>
    </Box>
  );
};

export const CuratorCell: React.FC<{ logo?: string; name: string }> = ({ logo, name }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 0.5 : 1,
        minWidth: isMobile ? '70px' : '90px',
        width: 'auto',
        flex: '0 1 auto',
      }}
    >
      <Avatar
        src={logo}
        sx={{
          width: isMobile ? 20 : 24,
          height: isMobile ? 20 : 24,
          flexShrink: 0,
        }}
      >
        {name}
      </Avatar>
      <Typography
        variant={isMobile ? 'caption' : 'secondary14'}
        sx={{
          lineHeight: isMobile ? 1.2 : undefined,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {name}
      </Typography>
    </Box>
  );
};

export const MyDepositCell: React.FC<{ deposit: string; depositUsd: string; symbol: string }> = ({
  deposit,
  depositUsd,
  symbol,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Only wrap on very small screens (smaller than TVM)
  const shouldWrap = isSmallScreen;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: shouldWrap ? 'column' : 'row',
        gap: shouldWrap ? 0.25 : isMobile ? 0.5 : 1.5,
        alignItems: shouldWrap ? 'flex-start' : 'center',
        minWidth: isMobile ? '70px' : '90px',
        maxWidth: isMobile ? '110px' : '160px',
      }}
    >
      <FormattedNumber
        value={deposit}
        symbol={symbol}
        variant={isMobile ? 'caption' : 'secondary14'}
        compact
        sx={{
          fontWeight: 500,
          fontSize: isMobile ? '0.75rem' : undefined,
          lineHeight: shouldWrap ? 1.1 : isMobile ? 1.2 : undefined,
        }}
      />
      <UsdChip
        value={depositUsd}
        sx={{
          flexShrink: 0,
          fontSize: shouldWrap ? '0.7rem' : undefined,
        }}
      />
    </Box>
  );
};

export const DepositTokenCell: React.FC<{ symbol?: string; address?: string; symbols?: string[] }> = ({ symbol, symbols }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 0.5 : 1,
        minWidth: isMobile ? '60px' : '80px',
        width: 'auto',
        flex: '0 1 auto',
      }}
    >
      {(symbols && symbols.length > 0 ? symbols : [symbol]).slice(0, 3).map((sym, idx) => (
        <Box key={`${sym}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.5 : 0.75 }}>
          <TokenIcon
            symbol={sym || ''}
            sx={{
              fontSize: isMobile ? '16px' : '20px',
              flexShrink: 0,
            }}
          />
          <Typography
            variant={isMobile ? 'caption' : 'secondary14'}
            sx={{
              fontWeight: 500,
              fontSize: isMobile ? '0.7rem' : undefined,
              lineHeight: isMobile ? 1.2 : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sym}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const NetworkCell: React.FC<{ network: string; icon: string }> = ({ network, icon }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 0.5 : 1,
        minWidth: isMobile ? '70px' : '90px',
        width: 'auto', // Allow natural expansion
        flex: '0 1 auto', // Flexible but don't grow unnecessarily
      }}
    >
      <Avatar
        src={icon}
        sx={{
          width: isMobile ? 16 : 20,
          height: isMobile ? 16 : 20,
          bgcolor: 'transparent',
          flexShrink: 0,
        }}
      />
      <Typography
        variant={isMobile ? 'caption' : 'secondary14'}
        sx={{
          fontWeight: 500,
          fontSize: isMobile ? '0.7rem' : undefined,
          lineHeight: isMobile ? 1.2 : undefined,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1, // Take available space
        }}
      >
        {network}
      </Typography>
    </Box>
  );
};

export const APYCell: React.FC<{
  apy: number | undefined;
  incentives?: PoolReservesRewardsHumanized[];
}> = ({ apy, incentives }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Determine layout based on screen size - similar to TVM wrapping logic
  const shouldWrap = isSmallScreen || (isTablet && !isMobile);

  return (
    <Box
      sx={{
        minWidth: isMobile ? '40px' : '50px',
        textAlign: 'left',
      }}
    >
      {apy !== undefined ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: shouldWrap ? 'column' : 'row',
            gap: shouldWrap ? 0.25 : 1,
            alignItems: shouldWrap ? 'flex-start' : 'center',
          }}
        >
          <FormattedNumber
            value={apy}
            percent
            coloredPercent
            variant={isMobile ? 'caption' : 'secondary14'}
            sx={{
              fontSize: isMobile ? '0.75rem' : undefined,
              lineHeight: isMobile ? 1.2 : undefined,
              whiteSpace: 'nowrap',
            }}
          />
          {incentives && incentives.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Typography
                variant="secondary14"
                color="text.secondary"
                sx={{ ml: shouldWrap ? 0 : 1, mr: 1 }}
              >
                +
              </Typography>
              <RewardsButton rewards={incentives} rounded={true} />
            </Box>
          )}
        </Box>
      ) : (
        <Typography
          variant={isMobile ? 'caption' : 'secondary14'}
          color="text.secondary"
          sx={{
            fontSize: isMobile ? '0.7rem' : undefined,
            lineHeight: isMobile ? 1.2 : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          --
        </Typography>
      )}
    </Box>
  );
};

export const TVMCell: React.FC<{ tvm: string; tvmUsd: number; symbol: string }> = ({
  tvm,
  tvmUsd,
  symbol,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Determine layout based on screen size - TVM wraps earlier than other columns
  const shouldWrap = isSmallScreen || (isTablet && !isMobile);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: shouldWrap ? 'column' : 'row',
        gap: shouldWrap ? 0.25 : isMobile ? 0.5 : 1.5,
        alignItems: shouldWrap ? 'flex-start' : 'center',
        minWidth: isMobile ? '70px' : '90px',
        width: 'auto',
      }}
    >
      <FormattedNumber
        value={tvm}
        symbol={symbol}
        variant={isMobile ? 'caption' : 'main14'}
        compact
        sx={{
          fontWeight: 500,
          fontSize: isMobile ? '0.75rem' : undefined,
          lineHeight: shouldWrap ? 1.1 : isMobile ? 1.2 : undefined,
          whiteSpace: shouldWrap ? 'normal' : 'nowrap',
          hyphens: 'none',
        }}
      />
      <UsdChip
        value={tvmUsd}
        sx={{
          flexShrink: 0,
          fontSize: shouldWrap ? '0.7rem' : undefined,
          alignSelf: shouldWrap ? 'flex-start' : 'center',
        }}
      />
    </Box>
  );
};

export const DepositActionCell: React.FC<{ onDeposit: () => void }> = ({ onDeposit }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Button
      variant="gradient"
      onClick={(e) => {
        e.stopPropagation();
        onDeposit();
      }}
      sx={{
        minWidth: 'unset',
        padding: isMobile ? '4px 8px' : '8px 16px',
        minHeight: isMobile ? '28px' : '32px',
      }}
    >
      <Typography
        variant={isMobile ? 'caption' : 'secondary14'}
        fontWeight={600}
        sx={{
          fontSize: isMobile ? '0.7rem' : undefined,
        }}
      >
        Deposit
      </Typography>
    </Button>
  );
};

export const ManageActionCell: React.FC<{ onManage: () => void }> = ({ onManage }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Button
      variant="gradient"
      onClick={(e) => {
        e.stopPropagation();
        onManage();
      }}
      sx={{
        minWidth: 'unset',
        padding: isMobile ? '4px 8px' : '8px 16px',
        minHeight: isMobile ? '28px' : '32px',
      }}
    >
      <Typography
        variant={isMobile ? 'caption' : 'secondary14'}
        fontWeight={600}
        sx={{
          fontSize: isMobile ? '0.7rem' : undefined,
        }}
      >
        Manage
      </Typography>
    </Button>
  );
};

// Vault-specific row interface
export interface VaultGridRow {
  id: string;
  vaultName: string;
  curatorLogo?: string;
  curatorName: string;
  myDeposit?: string;
  myDepositUsd?: string;
  depositToken: string;
  depositTokenSymbol: string;
  depositTokenAddress: string;
  depositTokenSymbols?: string[];
  network: string;
  networkIcon: string;
  apy: number | undefined;
  incentives?: PoolReservesRewardsHumanized[];
  tvm: string;
  tvmUsd: number;
}

// Column Definitions
export const getStandardVaultColumns = (isMobile = false): ColumnDefinition<VaultGridRow>[] => [
  {
    key: 'vaultName',
    label: 'Vault Name',
    sortable: true,
    render: (row) => <VaultCell name={row.vaultName} />,
    skeletonRender: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Skeleton variant="text" width={120} height={20} />
      </Box>
    ),
  },
  {
    key: 'curatorName',
    label: 'Curator',
    sortable: true,
    render: (row) => <CuratorCell logo={row.curatorLogo} name={row.curatorName} />,
    skeletonRender: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={80} height={20} />
      </Box>
    ),
  },
  {
    key: 'depositToken',
    label: isMobile ? 'Tokens' : 'Deposit Tokens',
    sortable: true,
    render: (row) => (
      <DepositTokenCell symbol={row.depositTokenSymbol} address={row.depositTokenAddress} symbols={row.depositTokenSymbols}
      />
    ),
    skeletonRender: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={60} height={20} />
      </Box>
    ),
  },
  {
    key: 'network',
    label: 'Networks',
    sortable: true,
    render: (row) => <NetworkCell network={row.network} icon={row.networkIcon} />,
    skeletonRender: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={40} height={20} />
      </Box>
    ),
  },
  {
    key: 'apy',
    label: 'APY',
    sortable: true,
    render: (row) => <APYCell apy={row.apy} incentives={row.incentives} />,
    skeletonRender: () => <Skeleton variant="text" width={50} height={20} />,
  },
  {
    key: 'tvmUsd',
    label: 'TVM',
    sortable: true,
    render: (row) => <TVMCell tvm={row.tvm} tvmUsd={row.tvmUsd} symbol={row.depositTokenSymbol} />,
    skeletonRender: () => (
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5 }}>
        <Skeleton variant="text" width={80} height={20} />
        <Skeleton variant="text" width={60} height={20} />
      </Box>
    ),
  },
];

export const getUserVaultColumns = (isMobile = false): ColumnDefinition<VaultGridRow>[] => [
  {
    key: 'vaultName',
    label: 'Vault Name',
    sortable: true,
    render: (row) => <VaultCell name={row.vaultName} />,
    skeletonRender: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Skeleton variant="text" width={120} height={20} />
      </Box>
    ),
  },
  {
    key: 'myDeposit',
    label: 'My Deposit',
    sortable: true,
    render: (row) =>
      row.myDeposit && row.myDepositUsd ? (
        <MyDepositCell
          deposit={row.myDeposit}
          depositUsd={row.myDepositUsd}
          symbol={row.depositTokenSymbol}
        />
      ) : (
        <Typography variant="secondary14" color="text.secondary">
          --
        </Typography>
      ),
    skeletonRender: () => (
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5 }}>
        <Skeleton variant="text" width={80} height={20} />
        <Skeleton variant="text" width={60} height={20} />
      </Box>
    ),
  },
  {
    key: 'depositToken',
    label: isMobile ? 'Tokens' : 'Deposit Tokens',
    sortable: true,
    render: (row) => (
      <DepositTokenCell symbol={row.depositTokenSymbol} address={row.depositTokenAddress} symbols={row.depositTokenSymbols}
      />
    ),
    skeletonRender: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={60} height={20} />
      </Box>
    ),
  },
  {
    key: 'network',
    label: isMobile ? 'Network' : 'Networks',
    sortable: true,
    render: (row) => <NetworkCell network={row.network} icon={row.networkIcon} />,
    skeletonRender: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={40} height={20} />
      </Box>
    ),
  },
  {
    key: 'apy',
    label: 'APY',
    sortable: true,
    render: (row) => <APYCell apy={row.apy} incentives={row.incentives} />,
    skeletonRender: () => <Skeleton variant="text" width={50} height={20} />,
  },
  {
    key: 'tvmUsd',
    label: 'TVM',
    sortable: true,
    render: (row) => <TVMCell tvm={row.tvm} tvmUsd={row.tvmUsd} symbol={row.depositTokenSymbol} />,
    skeletonRender: () => (
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5 }}>
        <Skeleton variant="text" width={80} height={20} />
        <Skeleton variant="text" width={60} height={20} />
      </Box>
    ),
  },
];
