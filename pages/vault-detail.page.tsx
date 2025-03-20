import { Box, Container } from '@mui/material';
import { ReactNode } from 'react';
import { VaultProvider } from 'src/hooks/useVaultInfo';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultTabContent } from 'src/modules/vault-detail/VaultTabContent';
import { VaultTopDetailsWrapper } from 'src/modules/vault-detail/VaultTopDetailsWrapper';

interface ContentContainerProps {
  children: ReactNode;
}

const ContentContainer = ({ children }: ContentContainerProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: '#FFFFFF',
        // mt: { xs: '-32px', lg: '-46px', xl: '-44px', xxl: '-48px' },
      }}
    >
      <Container>{children}</Container>
    </Box>
  );
};

export default function VaultDetail() {
  return (
    <VaultProvider>
      <VaultTopDetailsWrapper />
      <ContentContainer>
        <VaultTabContent />
      </ContentContainer>
    </VaultProvider>
  );
}

VaultDetail.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
