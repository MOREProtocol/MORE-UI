import { Alert, Box, useTheme } from '@mui/material';
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
        background: theme.palette.background.default,
      }}
    >
      {children}
    </Box>
  );
};

export default function VaultDetailPage() {
  return (
    <ContentContainer>
      <Alert severity="warning" sx={{ borderRadius: '18px', m: 2 }}>
        MORE is currently investigating an issue affecting metric calculations. APY and share price calculations may be incorrect.
      </Alert>
      <VaultDetail />
    </ContentContainer>
  );
}

VaultDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
