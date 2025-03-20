import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

export type MarketType = 'all' | 'earn' | 'borrow';

export const MarketTypeFilter = ({
  value,
  onChange,
}: {
  value: MarketType;
  onChange: (value: MarketType) => void;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="description" color="text.secondary" gutterBottom flexWrap="wrap">
        Market Type
      </Typography>
      <ToggleButtonGroup
        value={value}
        onChange={(_, newValue) => newValue && onChange(newValue)}
        exclusive
        sx={{
          width: { xs: '100%', sm: 'auto' },
          backgroundColor: 'background.paper',
          borderRadius: '30px',
          '& .MuiToggleButtonGroup-firstButton': {
            borderRadius: '30px 0 0 30px',
          },
          '& .MuiToggleButtonGroup-lastButton': {
            borderRadius: '0 30px 30px 0',
          },
          '& .MuiToggleButton-root': {
            flex: { xs: 1, sm: 'initial' },
            py: 1.5,
            px: 5,
            color: 'text.secondary',
            '&.Mui-selected': {
              backgroundColor: '#F8991D',
              color: 'text.primary',
              fontWeight: '500',
              '&:hover': {
                backgroundColor: '#F8991D',
              },
            },
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          },
        }}
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="earn">Earn</ToggleButton>
        <ToggleButton value="borrow">Borrow</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
