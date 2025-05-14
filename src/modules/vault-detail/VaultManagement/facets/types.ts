import { TypographyProps } from '@mui/material';
import { ethers } from 'ethers';
import { ReactNode } from 'react';
import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';

export type NetworkDependentString = {
  mainnet?: string;
  testnet?: string;
};

export type Facet = {
  name: string;
  icon: string;
  description: string;
  actions: Action[];
};

export type TransactionInput = Record<string, string | string[] | string[][]>;

export type Action = {
  id: string;
  functionName?: string;
  name: string;
  actionButtonText: string;
  description: string;
  abi: string;
  inputs: Input[];
  getAmountForBundleDisplay?: (
    inputs: TransactionInput,
    reserves: ComputedReserveDataWithMarket[],
    props?: TypographyProps
  ) => ReactNode;
  getCurrencySymbolsForBundleDisplay?: (
    inputs: TransactionInput,
    reserves: ComputedReserveDataWithMarket[]
  ) => string[];
  prepareInputs?: (inputs: TransactionInput) => TransactionInput;
  prepareInputsWithProvider?: (inputs: TransactionInput, provider: ethers.providers.Provider) => Promise<TransactionInput>;
};

export type Input = {
  id: string;
  name?: string;
  description?: string;
  type: InputType;
  isShown: boolean;
  defaultValue?: string | NetworkDependentString;

  displayType?: DisplayType;
  options?: DropdownOption[];
  getOptions?: (
    inputs: TransactionInput,
    provider: ethers.providers.Provider,
    reserves?: ComputedReserveDataWithMarket[]
  ) => Promise<DropdownOption[]>;
  getCurrencyDetails?: (
    inputs: TransactionInput,
    provider: ethers.providers.Provider,
    vaultAddress?: string
  ) => Promise<{ symbol: string; decimals: number; address: string; balance?: string }>;
  relatedInputId?: string;
  dependsOnInputs?: string[];
};

export type DropdownOption = {
  label: string;
  value: string;
  icon?: string;
  decimals?: number;
};

export enum InputType {
  ADDRESS = 'address',
  UINT = 'uint',
  UINT256 = 'uint256',
  UINT16 = 'uint16',
  BOOL = 'bool',
  BYTES = 'bytes',
}

export enum DisplayType {
  DROPDOWN,
  TOKEN_DROPDOWN,
  SWITCH,
  ADDRESS,
  ADDRESS_INPUT,
  CURRENCY_AMOUNT_INPUT,
  CURRENCY_AMOUNT,
  BYTES_INPUT,
  DEADLINE_INPUT,
}
