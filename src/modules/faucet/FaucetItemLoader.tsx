import { Box, Skeleton } from '@mui/material';

export const FAUCET_ROW_SX = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '20px',
} as const;

export const FaucetItemLoader = () => {
  return (
    <Box
      sx={{
        ...FAUCET_ROW_SX,
        p: { xs: 2.5, sm: 3 },
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
        <Skeleton variant="circular" width={36} height={36} />
        <Box sx={{ minWidth: 0 }}>
          <Skeleton width={100} height={22} />
          <Skeleton width={60} height={16} sx={{ mt: 0.5 }} />
        </Box>
      </Box>

      <Box sx={{ minWidth: { sm: 140 }, display: { xs: 'none', sm: 'block' } }}>
        <Skeleton width={70} height={22} />
      </Box>

      <Box sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={40}
          sx={{ borderRadius: '9999px', minWidth: { sm: 100 } }}
        />
      </Box>
    </Box>
  );
};
