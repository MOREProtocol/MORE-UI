import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Avatar, IconButton, Stack, Tooltip, TypographyProps } from '@mui/material';
import { useState } from 'react';
import { CompactableTypography, CompactMode } from 'src/components/CompactableTypography';

interface AddressProps extends TypographyProps {
  address: string;
  link: string;
  isUser?: boolean;
  compactMode?: CompactMode;
  loading?: boolean;
}

export const Address: React.FC<AddressProps> = ({
  address,
  link,
  isUser = false,
  loading = false,
  compactMode = CompactMode.SM,
  ...rest
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternalLink = () => {
    let finalLink = link;

    // Check if the address is already contained in the link
    if (!link.includes(address)) {
      // If not, append the address to the link
      finalLink = link.endsWith('/') ? `${link}${address}` : `${link}/${address}`;
    }

    window.open(finalLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {/* TODO: Add avatar or wallet icon */}
      {isUser && <Avatar sx={{ bgcolor: 'primary.main', width: 18, height: 18 }} />}
      <CompactableTypography loading={loading} compactMode={compactMode} {...rest}>
        {address}
      </CompactableTypography>
      <Tooltip title={copied ? 'Copied!' : 'Copy address'} arrow>
        <IconButton
          size="small"
          onClick={handleCopy}
          aria-label="copy address"
          sx={{ padding: '2px' }}
        >
          <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="View on blockchain explorer" arrow>
        <IconButton
          size="small"
          onClick={handleOpenExternalLink}
          aria-label="open in explorer"
          sx={{ padding: '2px' }}
        >
          <OpenInNewIcon sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};
