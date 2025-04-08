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
  const { isLoading: vaultContextLoading, setSelectedVaultId } = useVault();

  const deployedVaultsQuery = useDeployedVaults();
  const vaultIds = deployedVaultsQuery?.data || [];
  const isLoadingVaultIds = deployedVaultsQuery?.isLoading;

  // Only query vaults if vaultIds are available
  const vaultsQuery = useVaultsListData(vaultIds);
  const vaults = vaultsQuery?.map((vault) => vault.data).filter(Boolean) || [];
  const isLoadingVaults = vaultsQuery?.some((vault) => vault.isLoading);

  // Combined loading state
  const isLoading = vaultContextLoading || isLoadingVaultIds || isLoadingVaults;

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
              <VaultAssetsListItem data={vault} onClick={() => handleClick(vault)} />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};
