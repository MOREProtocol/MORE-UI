import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, MenuItem, Select, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';

import { Action, DisplayType, Facet, Input } from './facets/types';

interface VaultManagementActionModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  action: Action | null;
  facet: Facet | null;
}

export const VaultManagementActionModal: React.FC<VaultManagementActionModalProps> = ({
  isOpen,
  setIsOpen,
  action,
  facet,
}) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Initialize input values with default values when action changes
  useEffect(() => {
    if (action) {
      const defaultValues = action.inputs.reduce((acc, input) => {
        if (input.defaultValue !== undefined) {
          acc[input.id] = input.defaultValue;
        }
        return acc;
      }, {} as Record<string, string>);

      setInputValues(defaultValues);
    }
  }, [action]);

  const handleInputChange = (input: Input, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [input.id]: value,
    }));
  };

  const getRelatedInputCurrencyData = (relatedInputId: string) => {
    const inputValue = inputValues[relatedInputId];
    if (inputValue === '') return null;
    const dropdownOption = action?.inputs
      .find((input) => input.id === relatedInputId)
      ?.dropdownOptions?.find((option) => option.value === inputValue);
    return {
      currencyValue: dropdownOption?.value,
      currencyName: dropdownOption?.label,
      currencyIcon: dropdownOption?.icon,
    };
  };

  const renderInput = (input: Input) => {
    if (!input.isShown) return null;

    switch (input.displayType) {
      case DisplayType.DROPDOWN:
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Select
              fullWidth
              value={inputValues[input.id] || ''}
              onChange={(e) => handleInputChange(input, e.target.value)}
              IconComponent={ExpandMoreIcon}
              variant="outlined"
              sx={{
                '& .MuiSelect-outlined': {
                  backgroundColor: '#FFFFFF !important',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                },
              }}
            >
              {input.dropdownOptions?.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {option.icon && (
                    <img src={option.icon} alt={option.label} style={{ width: 24, height: 24 }} />
                  )}
                  <Typography variant="main16">{option.label}</Typography>
                </MenuItem>
              ))}
            </Select>
          </Box>
        );

      case DisplayType.CURRENCY_AMOUNT_INPUT:
        const relatedInputCurrencyData = getRelatedInputCurrencyData(input.relatedInputId);
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <TextField
                placeholder="0.00"
                value={inputValues[input.id] || ''}
                onChange={(e) => handleInputChange(input, e.target.value)}
                variant="outlined"
                disabled={!!input.relatedInputId && !relatedInputCurrencyData.currencyValue}
                size="small"
                InputProps={{
                  disableUnderline: true,
                  endAdornment: relatedInputCurrencyData.currencyIcon ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <img
                        src={relatedInputCurrencyData.currencyIcon}
                        alt={relatedInputCurrencyData.currencyName}
                        style={{ width: 24, height: 24 }}
                      />
                      <Typography variant="main16">
                        {relatedInputCurrencyData.currencyName}
                      </Typography>
                    </Box>
                  ) : null,
                }}
                sx={{ flex: 1, typography: 'main16' }}
              />
            </Box>
            {/* Add wallet balance */}
          </Box>
        );

      case DisplayType.ADDRESS_INPUT:
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="0x..."
                value={inputValues[input.id] || ''}
                onChange={(e) => handleInputChange(input, e.target.value)}
                variant="outlined"
                size="small"
                sx={{
                  fontFamily: 'monospace',
                }}
              />
            </Box>
          </Box>
        );

      case DisplayType.BYTES_INPUT:
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="0x..."
                value={inputValues[input.id] || ''}
                onChange={(e) => handleInputChange(input, e.target.value)}
                variant="outlined"
                multiline
                rows={4}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                }}
              />
            </Box>
          </Box>
        );

      default:
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                value={inputValues[input.id] || ''}
                onChange={(e) => handleInputChange(input, e.target.value)}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>
        );
    }
  };

  if (!action || !facet) return null;

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          pb: 3,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <img src={facet.icon} alt={facet.name} style={{ width: 32, height: 32 }} />
          <Box>
            <Typography variant="main16">{facet.name}</Typography>
            <Typography variant="description">{action.name}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {action.inputs.filter((input) => input.isShown).map((input) => renderInput(input))}
      </Box>

      {/* Transaction Overview */}
      <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="main16" sx={{ mb: 2 }}>
          Transaction overview
        </Typography>
        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
          <Typography variant="description" color="text.secondary">
            👨‍💻 WIP
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button variant="contained" fullWidth>
          {action.name} only
        </Button>
        <Button variant="contained" fullWidth disabled>
          Add {action.name.toLowerCase()} transaction to batch
        </Button>
      </Box>
    </BasicModal>
  );
};
