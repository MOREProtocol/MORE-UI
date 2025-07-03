import { Box, Container, useTheme } from '@mui/material';
import { ReactNode } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultDetail } from 'src/modules/vault-detail/VaultDetail';

interface ContentContainerProps {
  children: ReactNode;
}

const ContentContainer = ({ children }: ContentContainerProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: theme.palette.background.paper,
        // mt: { xs: '-32px', lg: '-46px', xl: '-44px', xxl: '-48px' },
      }}
    >
      <Container>{children}</Container>
    </Box>
  );
};

export default function VaultDetailPage() {
  return (
    <ContentContainer>
      <VaultDetail />
    </ContentContainer>
  );
}

VaultDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
