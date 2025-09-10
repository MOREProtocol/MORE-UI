import {
  Avatar,
  Box,
  Button,
  Skeleton,
  Typography,
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
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, md: 1.5 },
        minWidth: { xs: 0, md: '100px' },
        maxWidth: { xs: 'unset', md: '180px' },
        width: '100%',
        justifyContent: { xs: 'flex-end', md: 'flex-start' },
        overflow: 'hidden',
      }}
    >
      <Typography
        variant='secondary14'
        sx={{
          overflow: { xs: 'visible', md: 'hidden' },
          textOverflow: { xs: 'clip', md: 'ellipsis' },
          whiteSpace: { xs: 'normal', md: 'nowrap' },
          wordBreak: { xs: 'break-word', md: 'normal' },
          textAlign: { xs: 'right', md: 'left' },
          maxWidth: '100%',
        }}
      >
        {name}
      </Typography>
    </Box>
  );
};

export const CuratorCell: React.FC<{ logo?: string; name: string }> = ({ logo, name }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: { xs: 'unset', md: '90px' },
        width: '100%',
        flex: '0 1 auto',
        justifyContent: { xs: 'flex-end', md: 'flex-start' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, justifyContent: { xs: 'flex-end', md: 'flex-start' } }}>
        <Avatar
          src={logo}
          sx={{
            width: { xs: 20, md: 24 },
            height: { xs: 20, md: 24 },
            flexShrink: 0,
          }}
        >
          {name}
        </Avatar>
        <Typography
          variant='secondary14'
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            textAlign: { xs: 'right', md: 'left' },
          }}
        >
          {name}
        </Typography>
      </Box>
    </Box>
  );
};

export const MyDepositCell: React.FC<{ deposit: string; depositUsd: string; symbol: string }> = ({
  deposit,
  depositUsd,
  symbol,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 0.5, md: 1 },
        alignItems: { xs: 'flex-end', md: 'center' },
        minWidth: { xs: 'unset', md: '90px' },
        maxWidth: { xs: 'unset', md: '160px' },
        width: '100%',
        justifyContent: { xs: 'flex-end', md: 'flex-start' },
        textAlign: 'right',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormattedNumber
          value={deposit}
          symbol={symbol}
          variant='secondary14'
          compact
          sx={{
            fontWeight: 500,
            lineHeight: { xs: 1.2, md: undefined },
            textAlign: { xs: 'right', md: 'left' },
          }}
        />
        <UsdChip
          value={depositUsd}
          sx={{
            flexShrink: 0,
          }}
        />
      </Box>
    </Box>
  );
};

export const DepositTokenCell: React.FC<{ symbol?: string; address?: string; symbols?: string[] }> = ({ symbol, symbols }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, md: 1 },
        minWidth: { xs: 'unset', md: '80px' },
        width: '100%',
        flex: '0 1 auto',
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        justifyContent: { xs: 'flex-end', md: 'flex-start' },
      }}
    >
      {(symbols && symbols.length > 0 ? symbols : [symbol]).slice(0, 3).map((sym, idx) => (
        <Box key={`${sym}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 } }}>
          <TokenIcon
            symbol={sym || ''}
            sx={{
              fontSize: { xs: '16px', md: '20px' },
              flexShrink: 0,
            }}
          />
          <Typography
            variant='secondary14'
            sx={{
              fontWeight: 500,
              overflow: { xs: 'visible', md: 'hidden' },
              textOverflow: { xs: 'clip', md: 'ellipsis' },
              whiteSpace: { xs: 'normal', md: 'nowrap' },
              wordBreak: { xs: 'break-word', md: 'normal' },
              textAlign: { xs: 'right', md: 'left' },
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
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: { xs: 'unset', md: '90px' },
        width: '100%',
        flex: '0 1 auto',
        justifyContent: { xs: 'flex-end', md: 'flex-start' },
      }}
    >
      <Avatar
        src={icon}
        sx={{
          width: { xs: 16, md: 20 },
          height: { xs: 16, md: 20 },
          bgcolor: 'transparent',
          flexShrink: 0,
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-end', md: 'flex-start' }, minWidth: 0 }}>
        <Typography
          variant='secondary14'
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            textAlign: { xs: 'right', md: 'left' },
          }}
        >
          {network}
        </Typography>
      </Box>
    </Box>
  );
};

export const APYCell: React.FC<{
  apy: number | undefined;
  incentives?: PoolReservesRewardsHumanized[];
}> = ({ apy, incentives }) => {
  return (
    <Box
      sx={{
        minWidth: { xs: 'unset', md: '50px' },
        textAlign: { xs: 'right', md: 'left' },
        width: '100%',
        display: 'flex',
        justifyContent: { xs: 'flex-end', md: 'flex-start' },
        alignItems: 'center',
      }}
    >
      {apy !== undefined ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 0.25, lg: 1 },
            alignItems: { xs: 'flex-start', lg: 'center' },
          }}
        >
          <FormattedNumber
            value={apy}
            percent
            coloredPercent
            variant='secondary14'
            sx={{
              whiteSpace: 'nowrap',
            }}
          />
          {incentives && incentives.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Typography
                variant="secondary14"
                color="text.secondary"
                sx={{ ml: { xs: 0, lg: 1 }, mr: 1 }}
              >
                +
              </Typography>
              <RewardsButton rewards={incentives} rounded={true} />
            </Box>
          )}
        </Box>
      ) : (
        <Typography
          color="text.secondary"
          sx={{
            typography: { xs: 'caption', md: 'secondary14' },
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
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 1.5,
        alignItems: { xs: 'flex-start', md: 'center' },
        minWidth: { xs: '70px', md: '90px' },
        width: 'auto',
      }}
    >
      <FormattedNumber
        value={tvm}
        symbol={symbol}
        variant='secondary14'
        compact
        sx={{
          fontWeight: 500,
          hyphens: 'none',
        }}
      />
      <UsdChip
        value={tvmUsd}
        sx={{
          flexShrink: 0,
          alignSelf: { xs: 'flex-start', md: 'center' },
        }}
      />
    </Box>
  );
};

export const DepositActionCell: React.FC<{ onDeposit: () => void }> = ({ onDeposit }) => {
  return (
    <Button
      variant="gradient"
      size="medium"
      sx={{ width: { xs: '100%', md: 'auto' } }}
      onClick={(e) => {
        e.stopPropagation();
        onDeposit();
      }}
    >
      Deposit
    </Button>
  );
};

export const ManageActionCell: React.FC<{ onManage: () => void }> = ({ onManage }) => {
  return (
    <Button
      variant="gradient"
      size="medium"
      sx={{ width: { xs: '100%', md: 'auto' } }}
      onClick={(e) => {
        e.stopPropagation();
        onManage();
      }}
    >
      Manage
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
