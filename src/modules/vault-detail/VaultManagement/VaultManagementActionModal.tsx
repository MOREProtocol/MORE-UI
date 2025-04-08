import { ExpandLess, ExpandMore } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import BigNumber from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { Address } from 'src/components/Address';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { ENABLE_TESTNET, networkConfigs } from 'src/utils/marketsAndNetworksConfig';

import { Action, DisplayType, Facet, Input } from './facets/types';
import { addressToProtocolMap } from './facets/vaultsConfig';

const NETWORK = ENABLE_TESTNET ? 'testnet' : 'mainnet';

interface VaultManagementActionModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  action: Action | null;
  facet: Facet | null;
  vault: VaultData | null;
}

export const VaultManagementActionModal: React.FC<VaultManagementActionModalProps> = ({
  isOpen,
  setIsOpen,
  action,
  facet,
  vault,
}) => {
  const theme = useTheme();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [expandedInputs, setExpandedInputs] = useState<Record<string, boolean>>({});
  const [vaultBalances, setVaultBalances] = useState<Record<string, string>>({});
  const { addTransaction, chainId, getVaultAssetBalance } = useVault();
  const baseUrl = useMemo(() => chainId && networkConfigs[chainId].explorerLink, [chainId]);

  // Initialize input values with default values when action changes
  useEffect(() => {
    if (action) {
      const defaultValues = action.inputs.reduce((acc, input) => {
        if (input.defaultValue !== undefined) {
          acc[input.id] =
            typeof input.defaultValue === 'string'
              ? input.defaultValue
              : input.defaultValue[NETWORK];
        }
        // For now, onBehalfOf and to are the vault address by default
        if (['onBehalfOf', 'to'].includes(input.id)) {
          acc[input.id] = vault?.id || '';
        }
        return acc;
      }, {} as Record<string, string>);

      setInputValues(defaultValues);
    }
  }, [action, vault?.id]);

  // Define getRelatedInputCurrencyData before useEffect that uses it
  // Use useMemo to stabilize the function reference based on its dependencies
  const getRelatedInputCurrencyData = useMemo(
    () => (relatedInputId: string) => {
      const inputValue = inputValues[relatedInputId];
      if (!inputValue || inputValue === '') return null;
      const dropdownOption = action?.inputs
        .find((input) => input.id === relatedInputId)
        ?.dropdownOptions?.find((option) => option.value === inputValue);
      return {
        currencyValue: dropdownOption?.value,
        currencyName: dropdownOption?.label,
        currencyIcon: dropdownOption?.icon,
        currencyDecimals: dropdownOption?.decimals,
      };
      // Dependency on action?.inputs and inputValues
    },
    [action?.inputs, inputValues]
  );

  // Effect to fetch vault balances for currency inputs
  useEffect(() => {
    if (!action || !isOpen) {
      setVaultBalances({}); // Reset balances when modal closes or action changes
      return;
    }

    const fetchBalances = async () => {
      const newVaultBalances: Record<string, string> = {};

      for (const input of action.inputs) {
        if (input.displayType === DisplayType.CURRENCY_AMOUNT_INPUT && input.relatedInputId) {
          const relatedInputCurrencyData = getRelatedInputCurrencyData(input.relatedInputId);
          if (
            inputValues[input.relatedInputId] &&
            !(inputValues[input.relatedInputId] in newVaultBalances)
          ) {
            // Check if already fetched/fetching
            try {
              // Direct fetch and store
              const vaultBalance = await getVaultAssetBalance(inputValues[input.relatedInputId]);
              newVaultBalances[inputValues[input.relatedInputId]] = formatUnits(
                vaultBalance,
                relatedInputCurrencyData.currencyDecimals || '18'
              );
            } catch (error) {
              console.error(
                `Failed to fetch balance for ${inputValues[input.relatedInputId]}:`,
                error
              );
              newVaultBalances[inputValues[input.relatedInputId]] = '0'; // Set default on error
            }
          }
        }
      }
      setVaultBalances(newVaultBalances);
    };

    fetchBalances();
    // Dependencies: Fetch when action, modal visibility, fetch function, or the function to get currency data changes.
  }, [action, isOpen, getVaultAssetBalance, getRelatedInputCurrencyData, inputValues]);

  const handleInputChange = (input: Input, value: string) => {
    setInputValues((prev) => {
      let processedValue = value;
      if (input.displayType === DisplayType.CURRENCY_AMOUNT_INPUT && input.relatedInputId) {
        const relatedInputCurrencyData = getRelatedInputCurrencyData(input.relatedInputId);
        const decimals = relatedInputCurrencyData?.currencyDecimals || 18; // Default to 18 if decimals not found
        try {
          // Parse the user input (assumed to be in standard unit) into Wei
          processedValue = parseUnits(value || '0', decimals).toString();
        } catch (error) {
          console.error('Error parsing input value to Wei:', error);
          processedValue = '0'; // Handle invalid input, maybe set to '0' or keep previous value?
        }
      }
      return {
        ...prev,
        [input.id]: processedValue,
      };
    });
  };

  const toggleInputExpansion = (inputId: string) => {
    setExpandedInputs((prev) => ({
      ...prev,
      [inputId]: !prev[inputId],
    }));
  };

  const handleAddToBundle = () => {
    const inputs = action?.prepareInputs ? action.prepareInputs(inputValues) : inputValues;
    addTransaction({ action, facet, inputs, vault });
    setIsOpen(false);
  };

  const renderInput = (input: Input) => {
    switch (input.displayType) {
      case DisplayType.DROPDOWN:
        return (
          <Box key={input.id} sx={{ mb: 3 }}>
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
                '&:hover .MuiOutlinedInput-notchedOutline, .MuiOutlinedInput-notchedOutline': {
                  border: `1px solid ${theme.palette.divider}`,
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

      case DisplayType.CURRENCY_AMOUNT_INPUT: {
        const relatedInputCurrencyData = getRelatedInputCurrencyData(input.relatedInputId);
        const vaultBalance = vaultBalances[inputValues[input.relatedInputId]] ?? '0';
        const decimals = relatedInputCurrencyData?.currencyDecimals || 18;
        const valueInWei = inputValues[input.id] || '0';
        let formattedValue = '';

        try {
          // If value is negative, use the max (vault balance)
          if (new BigNumber(valueInWei).isLessThan(0)) {
            formattedValue = vaultBalance; // Use the vault balance (already formatted)
          } else if (new BigNumber(valueInWei).isZero()) {
            formattedValue = '';
          } else {
            // It's a Wei value, format it to standard units
            formattedValue = formatUnits(valueInWei, decimals);
          }
        } catch (error) {
          console.error('Error formatting value:', error);
          formattedValue = ''; // Handle potential errors
        }

        return (
          <Box key={input.id} sx={{ mb: 3 }}>
            <AssetInput
              inputTitle={input.name}
              value={formattedValue}
              disabled={!relatedInputCurrencyData?.currencyValue}
              onChange={(i) => handleInputChange(input, i)}
              symbol={relatedInputCurrencyData?.currencyName || ''}
              assets={[
                {
                  balance: vaultBalance,
                  symbol: relatedInputCurrencyData?.currencyName || '',
                  iconSymbol: relatedInputCurrencyData?.currencyIcon || '',
                },
              ]}
              isMaxSelected={
                new BigNumber(valueInWei).isLessThan(0) ||
                (vaultBalance !== '0' && formattedValue === vaultBalance)
              }
              maxValue={vaultBalance}
              balanceText={'Vault balance'}
            />
          </Box>
        );
      }

      case DisplayType.ADDRESS_INPUT:
        // Get the default value, either from defaultValue or onBehalfOf
        const defaultAddress =
          input.id === 'onBehalfOf' && vault?.id
            ? vault.id
            : input.defaultValue
            ? typeof input.defaultValue === 'string'
              ? input.defaultValue
              : input.defaultValue[NETWORK]
            : null;

        // If we have a default value and it's not expanded, show the simplified view
        if (defaultAddress && !expandedInputs[input.id]) {
          return (
            <Box key={input.id} sx={{ mb: 3 }}>
              <Typography variant="description" color="text.secondary">
                {input.name}
              </Typography>
              <Box
                key={input.id}
                sx={{
                  mt: 1,
                  px: 2,
                  py: 0.2,
                  borderRadius: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  '&:hover': {
                    '& .address': {
                      display: 'block',
                    },
                    '& .protocol': {
                      display: 'none',
                    },
                    '& .change-text': {
                      display: 'flex',
                    },
                  },
                }}
                onClick={() => toggleInputExpansion(input.id)}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="main14" color="text">
                        Default:{' '}
                      </Typography>
                      <Box onClick={(e) => e.stopPropagation()} sx={{ position: 'relative' }}>
                        <Box
                          className="address"
                          sx={{
                            py: 1.75,
                            display: addressToProtocolMap[String(defaultAddress)]
                              ? 'none'
                              : 'block',
                          }}
                        >
                          <Address
                            address={String(defaultAddress)}
                            link={`${baseUrl}/address/${String(defaultAddress)}`}
                            variant="secondary14"
                          />
                        </Box>
                        {addressToProtocolMap[String(defaultAddress)] && (
                          <Box
                            className="protocol"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              py: 1.75,
                              gap: 1,
                            }}
                          >
                            <img
                              src={addressToProtocolMap[String(defaultAddress)].icon}
                              alt={addressToProtocolMap[String(defaultAddress)].name}
                              style={{ width: 20, height: 20, borderRadius: '50%' }}
                            />
                            <Typography variant="secondary14">
                              {addressToProtocolMap[String(defaultAddress)].name}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box
                    className="change-text"
                    sx={{
                      display: 'none',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="secondary12" color="text.muted">
                      Click to change
                    </Typography>
                    <IconButton size="small">
                      <ExpandMore />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        }

        // Expanded view or no default value
        return (
          <Box key={input.id} sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="0x..."
                value={inputValues[input.id] || defaultAddress || ''}
                onChange={(e) => handleInputChange(input, e.target.value)}
                variant="outlined"
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: `1px solid ${theme.palette.divider}`,
                  },
                }}
              />
              {defaultAddress && (
                <IconButton
                  size="small"
                  onClick={() => toggleInputExpansion(input.id)}
                  sx={{ ml: 1 }}
                >
                  <ExpandLess />
                </IconButton>
              )}
            </Box>
          </Box>
        );

      case DisplayType.BYTES_INPUT:
        return (
          <Box key={input.id} sx={{ mb: 3 }}>
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
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: `1px solid ${theme.palette.divider}`,
                  },
                }}
              />
            </Box>
          </Box>
        );

      default:
        return (
          <Box key={input.id} sx={{ mb: 3 }}>
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
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: `1px solid ${theme.palette.divider}`,
                  },
                }}
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
        <Button variant="contained" fullWidth onClick={handleAddToBundle}>
          Add {action.actionButtonText.toLowerCase()} transaction to bundle
        </Button>
      </Box>
    </BasicModal>
  );
};
