export type Facet = {
  contractId: string;
  name: string;
  icon: string;
  description: string;
  actions: Action[];
};

export type Action = {
  id: string;
  name: string;
  actionButtonText: string;
  description: string;
  abi: string;
  inputs: Input[];
};

export type Input = {
  id: string;
  name?: string;
  description?: string;
  type: InputType;
  isShown: boolean;
  defaultValue?: string;

  displayType?: DisplayType;
  dropdownOptions?: DropdownOption[];
  currencyAmountInput?: CurrencyAmountInput;
  relatedInputId?: string;
};

export type DropdownOption = {
  label: string;
  value: string;
  icon?: string;
};

export type CurrencyAmountInput = {
  value: string;
  currency: string;
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
