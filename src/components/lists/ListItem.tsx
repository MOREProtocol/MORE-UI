import { Box, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

interface ListItemProps extends BoxProps {
  children: ReactNode;
  minHeight?: number;
  px?: number;
  button?: boolean;
  card?: boolean;
}

export const ListItem = ({
  children,
  minHeight = 71,
  px = 4,
  button,
  card,
  ...rest
}: ListItemProps) => {
  const hover = {
    ...(card ? { borderColor: 'var(--brand-300)' } : {}),
    ...(button ? { bgcolor: 'action.hover' } : {}),
  };

  return (
    <Box
      {...rest}
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: card ? 72 : minHeight,
        px,
        ...(card
          ? {
              bgcolor: 'background.paper',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: 'divider',
              mb: 3,
              transition: 'border-color 150ms ease',
            }
          : {
              '&:not(:last-child)': {
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
            }),
        ...(card || button ? { '&:hover': hover } : {}),
        ...rest.sx,
      }}
    >
      {children}
    </Box>
  );
};
