import { Box, Grid, Skeleton, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { ROUTES } from 'src/components/primitives/Link';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { useDeployedVaults, useVaultsListData } from 'src/hooks/vault/useVaultData';

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

export const VaultAssetsList = () => {
  const router = useRouter();
  const { setSelectedVaultId } = useVault();

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
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography variant="main14">No vaults found</Typography>
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
