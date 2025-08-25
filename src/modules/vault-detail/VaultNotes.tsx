import { Box } from '@mui/material';
import React from 'react';
import { MarkdownRenderer } from 'src/components/primitives/MarkdownRenderer';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';

export const VaultNotes: React.FC = () => {
  const { selectedVaultId } = useVault();
  const vd = useVaultData(selectedVaultId);
  const content = vd?.data?.overview?.descriptionMarkdown || '';

  if (!content) return null;

  return (
    <Box sx={{ width: '100%', mt: 5, p: 7, backgroundColor: 'background.paper', borderRadius: 2 }}>
      <MarkdownRenderer content={content} />
    </Box>
  );
};

export default VaultNotes;


