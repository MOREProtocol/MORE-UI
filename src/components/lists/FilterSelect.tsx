import { Box, MenuItem, Select, SelectChangeEvent, styled, Typography } from '@mui/material';

const StyledSelect = styled(Select)(({ theme }) => ({
  borderRadius: '9999px',
  height: '36px',
  backgroundColor: theme.palette.background.paper,
  fontSize: '13px',
  fontWeight: 500,
  '& .MuiSelect-select': {
    padding: '0 12px',
    borderRadius: '9999px',
    color: theme.palette.text.primary,
    backgroundColor: 'transparent !important',
    lineHeight: '22px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.text.secondary,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.divider,
  },
}));

export interface FilterSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  onChange: (value: string) => void;
}

export const FilterSelect = ({ label, value, options, ariaLabel, onChange }: FilterSelectProps) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  const menuProps = {
    PaperProps: {
      sx: {
        marginTop: '4px',
        borderRadius: '12px',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
        '& .MuiList-root': {
          padding: '8px 0',
        },
        '& .MuiMenuItem-root': {
          fontSize: '14px',
          padding: '8px 12px',
        },
      },
    },
  };

  return (
    <Box
      sx={{
        width: '130px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="description" color="text.secondary" gutterBottom flexWrap="wrap">
        {label}
      </Typography>
      <StyledSelect
        size="small"
        value={value}
        onChange={handleChange}
        aria-label={ariaLabel}
        MenuProps={menuProps}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </StyledSelect>
    </Box>
  );
};
