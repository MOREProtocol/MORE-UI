import { Box, Button, Skeleton, Typography } from '@mui/material';
import { useVaultInfo } from 'src/hooks/useVaultInfo';

export const VaultTopDetails = () => {
  const { vault, isLoading } = useVaultInfo();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 20, alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'end' }}>
        {
          <Box
            mr={3}
            sx={{ mr: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isLoading ? (
              <Skeleton variant="circular" width={40} height={40} sx={{ background: '#383D51' }} />
            ) : (
              <img
                src={`/icons/tokens/usdc.e.svg`}
                width="45px"
                height="45px"
                alt="token-svg"
                style={{ borderRadius: '50%' }}
              />
            )}
          </Box>
        }
        <Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
            {isLoading ? (
              <Skeleton width={60} height={28} sx={{ background: '#383D51' }} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
                <Typography variant="main21">{vault?.overview.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <img
                      src={`/icons/tokens/usdc.e.svg`}
                      width="15px"
                      height="15px"
                      alt="token-svg"
                      style={{ borderRadius: '50%' }}
                    />
                    <Typography variant="secondary12">{vault?.overview.shareCurrency}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <img
                      src={`/icons/tokens/default.svg`}
                      width="15px"
                      height="15px"
                      alt="token-svg"
                      style={{ borderRadius: '50%' }}
                    />
                    <Typography variant="secondary12">{vault?.overview.curator}</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
        <Button
          variant="gradient"
          fullWidth
          size="medium"
          onClick={() => console.log('deposit')}
          disabled={isLoading}
          sx={{ borderRadius: '6px', py: 2 }}
        >
          Deposit
        </Button>
        {/* <Button
          variant="contained"
          fullWidth
          size="medium"
          onClick={() => setSelectedTab('manage')}
          disabled={isLoading}
          sx={{ borderRadius: '6px', py: 2 }}
        >
          Manage
        </Button> */}
      </Box>
    </Box>
  );
};
