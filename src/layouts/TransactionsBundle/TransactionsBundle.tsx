import { ArrowRightIcon } from '@heroicons/react/outline';
import { Box, Drawer, IconButton, SvgIcon, Typography } from '@mui/material';

interface TransactionsBundleProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  showCloseIcon?: boolean;
}

export const TransactionsBundle = ({
  isOpen,
  setIsOpen,
  title,
  children,
  onClose,
  showCloseIcon = true,
}: TransactionsBundleProps) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    setIsOpen(false);
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={handleClose}
      PaperProps={{
        sx: {
          paddingX: 3,
          paddingY: 2,
          width: { xs: '100%', sm: 400 },
          maxWidth: '100%',
          bgcolor: 'background.paper',
          overflow: 'auto',
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h2" component="div">
          {title}
        </Typography>
        {showCloseIcon && (
          <IconButton onClick={handleClose} sx={{ p: 1 }}>
            <SvgIcon>{<ArrowRightIcon />}</SvgIcon>
          </IconButton>
        )}
      </Box>

      {children}
    </Drawer>
  );
};
