import { Box, MenuItem, Select, SelectChangeEvent, styled, Typography } from '@mui/material';

const StyledSelect = styled(Select)(({ theme }) => ({
  borderRadius: '18px',
  height: '29px',
  '& .MuiSelect-select': {
    padding: '4px 12px',
    borderRadius: '18px',
    color: theme.palette.text.primary,
    backgroundColor: 'transparent !important',
    lineHeight: '22px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    border: '1px solid #F5871F',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: '1px solid #EAEBEF',
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
