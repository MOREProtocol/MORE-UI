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
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { useVaultProvider } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';

import { Action, DisplayType, Facet, Input } from './facets/types';
import { addressToProtocolMap } from './facets/vaultsConfig';

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
  const { addTransaction, chainId, getVaultAssetBalance, network } = useVault();
  const { reserves } = useAppDataContext();
  const availableTokensDropdownOptions = reserves.map((reserve) => ({
    label: reserve.iconSymbol,
    value: reserve.underlyingAsset,
    icon: reserve.iconSymbol,
    decimals: reserve.decimals,
  }));

  type LoadingState = 'done' | 'dynamicFields' | 'initialValues';
  const [loadingState, setLoadingState] = useState<LoadingState>('initialValues');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [expandedInputs, setExpandedInputs] = useState<Record<string, boolean>>({});
  const [vaultBalances, setVaultBalances] = useState<Record<string, string>>({});
  const provider = useVaultProvider(chainId);
  const baseUrl = useMemo(() => chainId && networkConfigs[chainId].explorerLink, [chainId]);
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, Array<{ label: string; value: string; icon?: string; decimals?: number }>>
  >({});
  const [dynamicCurrencyDetails, setDynamicCurrencyDetails] = useState<
    Record<string, { address: string; symbol: string; decimals: number; balance?: string }>
  >({});

  // Initialize input values with default values when action changes
  useEffect(() => {
    if (action) {
      const defaultValues = action.inputs.reduce((acc, input) => {
        if (input.defaultValue !== undefined) {
          acc[input.id] =
            typeof input.defaultValue === 'string'
              ? input.defaultValue
              : input.defaultValue[network];
        }
        // For now, onBehalfOf and to are the vault address by default
        if (['onBehalfOf', 'to'].includes(input.id)) {
          acc[input.id] = vault?.id || '';
        }
        return acc;
      }, {} as Record<string, string>);

      setInputValues(defaultValues);
      setLoadingState('dynamicFields');
    }
  }, [action, vault?.id]);

  // Load dynamic options for inputs with getOptions
  useEffect(() => {
    if (!action || !provider || !isOpen) return;

    const loadDynamicOptions = async () => {
      const newDynamicOptions: Record<
        string,
        Array<{ label: string; value: string; icon?: string; decimals?: number }>
      > = {};
      const newInputCurrencyDetails: Record<
        string,
        { address: string; symbol: string; decimals: number }
      > = {};

      for (const input of action.inputs) {
        if (input.getOptions && inputValues) {
          try {
            // Check if this input depends on other inputs that have changed
            const dependsOnInputs = input.dependsOnInputs || [];
            const hasDependentInputsChanged = dependsOnInputs.some(
              (depInputId) => inputValues[depInputId] !== undefined
            );

            if (hasDependentInputsChanged || !dynamicOptions[input.id]) {
              const options = await input.getOptions(inputValues, provider, reserves);
              newDynamicOptions[input.id] = options;
            }
          } catch (error) {
            console.error(`Failed to load options for ${input.id}:`, error);
            newDynamicOptions[input.id] = [];
          }
        } else if (input.getCurrencyDetails && inputValues) {
          const currencyDetails = await input.getCurrencyDetails(inputValues, provider, vault?.id);
          newInputCurrencyDetails[input.id] = currencyDetails;
        }
      }

      setDynamicOptions((prev) => ({
        ...prev,
        ...newDynamicOptions,
      }));
      setDynamicCurrencyDetails((prev) => ({
        ...prev,
        ...newInputCurrencyDetails,
      }));
      setLoadingState('done');
    };

    loadingState !== 'initialValues' && loadDynamicOptions();
  }, [action, provider, isOpen, inputValues, loadingState]);

  // Define getRelatedInputCurrencyData before useEffect that uses it
  // Use useMemo to stabilize the function reference based on its dependencies
  const getRelatedInputCurrencyData = useMemo(
    () => (relatedInputId: string) => {
      const inputValue = inputValues[relatedInputId];
      if (!inputValue || inputValue === '') return null;

      // First check dynamic options, then fall back to static options
      const relatedInput = action?.inputs.find((input) => input.id === relatedInputId);
      const options =
        relatedInput?.displayType === DisplayType.TOKEN_DROPDOWN
          ? availableTokensDropdownOptions
          : dynamicOptions[relatedInputId] || relatedInput?.options || [];
      const dropdownOption = options.find((option) => option.value === inputValue);

      return {
        currencyValue: dropdownOption?.value,
        currencyName: dropdownOption?.label,
        currencyIcon: dropdownOption?.icon,
        currencyDecimals: dropdownOption?.decimals?.toString() || '18',
      };
    },
    // Include dynamicOptions in the dependency array
    [action?.inputs, inputValues, dynamicOptions]
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
      if (input.displayType === DisplayType.CURRENCY_AMOUNT_INPUT && dynamicCurrencyDetails[input.id]) {
        const currencyDetails = dynamicCurrencyDetails[input.id];
        const decimals = currencyDetails?.decimals || 18; // Default to 18 if decimals not found
        try {
          // Parse the user input (assumed to be in standard unit) into Wei
          processedValue = parseUnits(value || '0', decimals).toString();
        } catch (error) {
          console.error('Error parsing input value to Wei:', error);
          processedValue = '0'; // Handle invalid input, maybe set to '0' or keep previous value?
        }
      }

      const newValues = {
        ...prev,
        [input.id]: processedValue,
      };

      // If this input is a dependency for other inputs, clear their values
      action?.inputs.forEach((otherInput) => {
        if (otherInput.dependsOnInputs?.includes(input.id)) {
          newValues[otherInput.id] = '';
        }
      });

      return newValues;
    });
  };

  const toggleInputExpansion = (inputId: string) => {
    setExpandedInputs((prev) => ({
      ...prev,
      [inputId]: !prev[inputId],
    }));
  };

  const handleAddToBundle = () => {
    // First, prepare the inputs with any dynamic values
    const preparedInputs = { ...inputValues };

    // For each input that has getOptions, get its current value from dynamicOptions
    action?.inputs.forEach((input) => {
      if (input.getOptions && dynamicOptions[input.id]?.length > 0) {
        // Use the first option's value as the current value
        preparedInputs[input.id] = dynamicOptions[input.id][0].value;
      }
    });

    // Then apply any additional preparation from the action
    const finalInputs = action?.prepareInputs
      ? action.prepareInputs(preparedInputs)
      : preparedInputs;

    addTransaction({ action, facet, inputs: finalInputs, vault });
    setIsOpen(false);
  };

  const renderInput = (input: Input) => {
    switch (input.displayType) {
      case DisplayType.DROPDOWN:
      case DisplayType.TOKEN_DROPDOWN:
        // Use dynamic options if available, otherwise fall back to static options
        const options =
          input.displayType === DisplayType.TOKEN_DROPDOWN
            ? availableTokensDropdownOptions
            : dynamicOptions[input.id] || input.options || [];

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
              {options.map((option) => (
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
                    <TokenIcon
                      key={option.label}
                      symbol={option.label}
                      sx={{
                        width: 24,
                        height: 24,
                        border: '1px solid',
                        borderColor: 'background.paper',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                  <Typography variant="main16">{option.label}</Typography>
                </MenuItem>
              ))}
            </Select>
          </Box>
        );

      case DisplayType.CURRENCY_AMOUNT_INPUT: {
        const relatedInputCurrencyData = getRelatedInputCurrencyData(input.relatedInputId);
        const currencyDetails = dynamicCurrencyDetails[input.id];
        const vaultBalance = vaultBalances[inputValues[input.relatedInputId]] || currencyDetails?.balance || undefined;
        const decimals = relatedInputCurrencyData?.currencyDecimals || currencyDetails?.decimals || 18;
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
              disabled={!relatedInputCurrencyData?.currencyValue && !currencyDetails?.symbol}
              onChange={(i) => handleInputChange(input, i)}
              symbol={relatedInputCurrencyData?.currencyName || currencyDetails?.symbol || ''}
              assets={[
                {
                  balance: vaultBalance,
                  symbol: relatedInputCurrencyData?.currencyName || currencyDetails?.symbol || '',
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

      case DisplayType.CURRENCY_AMOUNT: {
        const relatedInputCurrencyData = getRelatedInputCurrencyData(input.relatedInputId);
        const dynamicOption = dynamicOptions[input.id]?.[0];
        const value = dynamicOption?.label || '0';

        return (
          <Box key={input.id} sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 2,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.default',
              }}
            >
              {relatedInputCurrencyData?.currencyIcon && (
                <TokenIcon
                  key={relatedInputCurrencyData.currencyName}
                  symbol={relatedInputCurrencyData.currencyIcon}
                  sx={{
                    width: 24,
                    height: 24,
                    border: '1px solid',
                    borderColor: 'background.paper',
                    borderRadius: '50%',
                  }}
                />
              )}
              <FormattedNumber
                value={value}
                symbol={relatedInputCurrencyData?.currencyName || ''}
                variant="main16"
              />
            </Box>
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
                : input.defaultValue[network]
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

      case DisplayType.DEADLINE_INPUT:
        const presetDeadlines = [
          { value: 15 * 60, label: '15 minutes' },
          { value: 60 * 60, label: '1 hour' },
          { value: 24 * 60 * 60, label: '24 hours' },
        ];

        // Extract the deadline duration in seconds (not the absolute timestamp)
        const getDeadlineDuration = (valueStr: string): number => {
          if (!valueStr) return 0;
          const value = Number(valueStr);
          return value;
        };

        const deadlineDuration = getDeadlineDuration(inputValues[input.id]);
        const isCustom =
          inputValues[input.id] &&
          !presetDeadlines.some((option) => option.value === deadlineDuration);

        // Calculate relative time display for UI
        const formatDeadlineForDisplay = (seconds: number): string => {
          if (seconds < 60) return `${seconds} seconds`;
          if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
          if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
          return `${Math.floor(seconds / 86400)} days`;
        };

        return (
          <Box key={input.id} sx={{ mb: 3 }}>
            <Typography variant="description" color="text.secondary" sx={{ mb: 1 }}>
              {input.name}
            </Typography>
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                {presetDeadlines.map((option) => (
                  <Button
                    key={option.value}
                    variant={deadlineDuration === option.value ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleInputChange(input, option.value.toString())}
                    sx={{
                      minWidth: 'auto',
                      borderColor: theme.palette.divider,
                      color: deadlineDuration === option.value ? 'white' : 'text.primary',
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
                <Button
                  variant={isCustom && deadlineDuration > 0 ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    // If not already custom, set a default custom value (30 minutes)
                    if (!isCustom || deadlineDuration === 0) {
                      handleInputChange(input, (30 * 60).toString());
                    }
                    toggleInputExpansion(input.id);
                  }}
                  sx={{
                    minWidth: 'auto',
                    borderColor: theme.palette.divider,
                    color: isCustom && deadlineDuration > 0 ? 'white' : 'text.primary',
                  }}
                >
                  Custom
                </Button>
              </Box>

              {(isCustom || expandedInputs[input.id]) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    value={deadlineDuration ? Math.floor(deadlineDuration / 60) : ''}
                    onChange={(e) => {
                      const minutes = e.target.value ? parseInt(e.target.value, 10) : 0;
                      // Convert minutes to seconds
                      const seconds = minutes * 60;
                      handleInputChange(input, seconds.toString());
                    }}
                    variant="outlined"
                    type="number"
                    size="small"
                    sx={{
                      width: '120px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: `1px solid ${theme.palette.divider}`,
                      },
                    }}
                  />
                  <Typography variant="main14">minutes</Typography>
                </Box>
              )}

              <Typography variant="secondary12" color="text.secondary" sx={{ mt: 1 }}>
                Transaction will expire{' '}
                {deadlineDuration > 0 ? formatDeadlineForDisplay(deadlineDuration) : '0 seconds'}{' '}
                after submission
              </Typography>
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

