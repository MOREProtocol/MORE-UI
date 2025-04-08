import { TypographyProps } from '@mui/material';
import { ReactNode } from 'react';
import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';

export type NetworkDependentString = {
  mainnet?: string;
  testnet?: string;
};

export type Facet = {
  contractAddress: NetworkDependentString;
  name: string;
  icon: string;
  description: string;
  actions: Action[];
};

export type TransactionInput = Record<string, string | string[]>;

export type Action = {
  id: string;
  name: string;
  actionButtonText: string;
  description: string;
  abi: string;
  inputs: Input[];
  getAmountForBundleDisplay?: (
    inputs: TransactionInput,
    props?: TypographyProps,
    reserve?: ComputedReserveDataWithMarket[]
  ) => ReactNode;
  getCurrencySymbolsForBundleDisplay?: (inputs: TransactionInput) => string[];
  prepareInputs?: (inputs: TransactionInput) => TransactionInput;
};

export type Input = {
  id: string;
  name?: string;
  description?: string;
  type: InputType;
  isShown: boolean;
  defaultValue?: string | NetworkDependentString;

  displayType?: DisplayType;
  dropdownOptions?: DropdownOption[];
  relatedInputId?: string;
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
  SWITCH,
  ADDRESS_INPUT,
  CURRENCY_AMOUNT_INPUT,
  BYTES_INPUT,
}
