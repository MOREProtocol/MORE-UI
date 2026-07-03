import { XIcon } from '@heroicons/react/outline';
import { Box, IconButton, Modal, Paper, SvgIcon } from '@mui/material';
import React from 'react';

export interface BasicModalProps {
  open: boolean;
  children: React.ReactNode;
  setOpen: (value: boolean) => void;
  withCloseButton?: boolean;
  contentMaxWidth?: number;
}

export const BasicModal = ({
  open,
  setOpen,
  withCloseButton = true,
  contentMaxWidth = 420,
  children,
  ...props
}: BasicModalProps) => {
  const handleClose = () => setOpen(false);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        '.MuiPaper-root': {
          outline: 'none',
        },
        '.MuiBackdrop-root': {
          backgroundColor: 'rgba(20, 15, 8, 0.45)',
          backdropFilter: 'blur(5px)',
        },
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      {...props}
      data-cy={'Modal'}
    >
      <Paper
        sx={{
          position: 'relative',
          margin: '10px',
          overflowY: 'auto',
          width: '100%',
          maxWidth: { xs: '359px', xsm: `${contentMaxWidth}px` },
          maxHeight: 'calc(100vh - 20px)',
          p: 6,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '24px',
        }}
      >
        {children}

        {withCloseButton && (
          <Box sx={{ position: 'absolute', top: '16px', right: '16px', zIndex: 5 }}>
            <IconButton
              sx={{
                width: '36px',
                height: '36px',
                borderRadius: '9999px',
                p: 0,
                minWidth: 0,
                bgcolor: 'transparent',
                color: 'text.secondary',
                border: '1px solid transparent',
                transition:
                  'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
                '&:hover': {
                  bgcolor: 'background.surface',
                  borderColor: 'divider',
                  color: 'text.primary',
                },
              }}
              onClick={handleClose}
              data-cy={'close-button'}
            >
              <SvgIcon sx={{ fontSize: '16px' }}>
                <XIcon data-cy={'CloseModalIcon'} />
              </SvgIcon>
            </IconButton>
          </Box>
        )}
      </Paper>
    </Modal>
  );
};
