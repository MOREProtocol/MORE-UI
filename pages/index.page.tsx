import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from 'src/layouts/MainLayout';
import { Box } from '@mui/material';
import { VaultDetail } from 'src/modules/vault-detail/VaultDetail';

const onePageVaultId = process.env.NEXT_PUBLIC_ONEPAGE_VAULT_ID;

function OnePageVault() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <VaultDetail />
    </Box>
  );
}

OnePageVault.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

function RedirectToVaults() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/vaults');
  }, [router]);
  return null;
}

RedirectToVaults.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

export default onePageVaultId ? OnePageVault : RedirectToVaults;
