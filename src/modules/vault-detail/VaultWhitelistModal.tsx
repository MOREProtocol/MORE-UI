import { Box, Button, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { Address } from 'src/components/Address';
import { useVault } from 'src/hooks/vault/useVault';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { CompactMode } from 'src/components/CompactableTypography';

interface VaultWhitelistModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const VaultWhitelistModal: React.FC<VaultWhitelistModalProps> = ({
  isOpen,
  setIsOpen,
}) => {
  const { selectedVaultId, accountAddress, chainId } = useVault();
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  const handleSubmit = async () => {
    if (!accountAddress || !selectedVaultId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/send-whitelist-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vaultId: selectedVaultId,
          walletAddress: accountAddress,
          contactInfo: contactInfo.trim() || null,
        }),
      });

      if (response.ok) {
        // Show success message or close modal
        setIsOpen(false);
        setContactInfo('');
      } else {
        console.error('Failed to send whitelist notification');
      }
    } catch (error) {
      console.error('Error sending whitelist notification:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setContactInfo('');
  };

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen} withCloseButton>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Typography variant="h2">
          Ask to whitelist your wallet
        </Typography>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
              This wallet address
            </Typography>
            <Address
              address={accountAddress}
              link={`${baseUrl}/address/${accountAddress}`}
              variant="secondary14"
              compactMode={CompactMode.MD}
              sx={{ color: 'text.secondary', pl: 1 }}
            />
            <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
              is <strong>not currently whitelisted to deposit</strong> into this vault. Share your contact details to be notified by the curators once you&apos;re added to the whitelist.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Telegram alias or email (optional)"
            placeholder="@telegram_username or email@example.com"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            helperText="Enter your contact info to receive a notification when whitelisted"
            variant="outlined"
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </Box>
      </Box>
    </BasicModal>
  );
}; 