import { Box, Button, Skeleton, Typography } from '@mui/material';
import { useState } from 'react';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useVault } from 'src/hooks/vault/useVault';
import { useUserVaultData, useVaultData } from 'src/hooks/vault/useVaultData';

import { VaultDepositModal } from './VaultDepositModal';
import { VaultWithdrawModal } from './VaultWithdrawModal';

export const VaultTopDetails = () => {
  const { selectedVaultId, accountAddress } = useVault();
  const { data: userVaultData } = useUserVaultData(accountAddress, selectedVaultId);
  const vaultData = useVaultData(selectedVaultId);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const selectedVault = vaultData?.data;
  const isLoading = vaultData?.isLoading;
  const maxWithdraw = userVaultData?.maxWithdraw;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        columnGap: 20,
        rowGap: 5,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
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
                src={`/MOREVault.svg`}
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
                <Typography variant="main21">{selectedVault?.overview?.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TokenIcon
                      symbol={selectedVault?.overview?.shareCurrency || ''}
                      sx={{ fontSize: '16px' }}
                    />
                    <Typography variant="secondary12">
                      {selectedVault?.overview?.shareCurrency}
                    </Typography>
                  </Box>
                  {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TokenIcon
                      symbol={selectedVault?.overview?.shareCurrency || ''}
                      sx={{ fontSize: '16px' }}
                    />
                    <Typography variant="secondary12">
                      {selectedVault?.overview?.roles?.curator}
                    </Typography>
                  </Box> */}
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
          onClick={() => setIsDepositModalOpen(true)}
          disabled={isLoading}
          sx={{ borderRadius: '6px', py: 2 }}
        >
          Deposit
        </Button>
        <Button
          variant="contained"
          fullWidth
          size="medium"
          onClick={() => setIsWithdrawModalOpen(true)}
          disabled={isLoading || (maxWithdraw && !maxWithdraw.gt(0))}
          sx={{ borderRadius: '6px', py: 2 }}
        >
          Withdraw
        </Button>
      </Box>
      <VaultDepositModal isOpen={isDepositModalOpen} setIsOpen={setIsDepositModalOpen} />
      <VaultWithdrawModal isOpen={isWithdrawModalOpen} setIsOpen={setIsWithdrawModalOpen} />
    </Box>
  );
};
