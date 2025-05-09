import { Box, Grid, Skeleton, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { ROUTES } from 'src/components/primitives/Link';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { useDeployedVaults, useVaultsListData } from 'src/hooks/vault/useVaultData';
import * as allChains from 'viem/chains';

import { VaultAssetsListItem } from './VaultAssetsListItem';

const LoadingSkeleton = () => (
  <>
    {[1, 2, 3].map((index) => (
      <Grid item xs={12} sm={12} md={12} key={index}>
        <Skeleton
          variant="rectangular"
          sx={{
            height: 200,
            borderRadius: 2,
          }}
        />
      </Grid>
    ))}
  </>
);

const getChainName = (chainId: number | undefined): string => {
  if (chainId === undefined) {
    return 'Unknown Network';
  }
  for (const chain of Object.values(allChains)) {
    if (typeof chain === 'object' && chain !== null && 'id' in chain && chain.id === chainId) {
      return chain.name;
    }
  }
  return 'Unknown Network';
};

export const VaultAssetsList = () => {
  const router = useRouter();
  const { setSelectedVaultId, chainId } = useVault();

  const deployedVaultsQuery = useDeployedVaults();
  const rawVaultIds = deployedVaultsQuery?.data || [];
  const vaultIds = Array.from(new Set(rawVaultIds));
  const isLoadingVaultIds = deployedVaultsQuery?.isLoading;

  // Only query vaults if vaultIds are available
  const vaultsQuery = useVaultsListData(vaultIds);
  const isLoadingVaults = vaultsQuery?.isLoading;
  const vaults = vaultsQuery?.data;

  // Combined loading state
  const isLoading = isLoadingVaultIds || isLoadingVaults;

  const handleClick = (vault: VaultData) => {
    setSelectedVaultId(vault.id);
    router.push(ROUTES.vaultDetail(vault.id));
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={5} px={6} pb={8}>
        {!vaults || vaults?.length === 0 ? (
          isLoading ? (
            <LoadingSkeleton />
          ) : (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <Typography variant="main14" sx={{ mb: 5 }}>No vaults found</Typography>
                <Typography variant="secondary14">
                  It looks like you&apos;re connected to the wrong network. Please switch to the correct one in your wallet.
                </Typography>
                <Typography variant="secondary14">
                  Current network: {getChainName(chainId)} ({chainId})
                </Typography>
              </Box>
            </Grid>
          )
        ) : (
          vaults.map((vault: VaultData) => (
            <Grid item xs={12} sm={12} md={12} key={vault.id}>
              <VaultAssetsListItem key={vault.id} data={vault} onClick={() => handleClick(vault)} />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};
