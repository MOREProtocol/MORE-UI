import { TOKEN_LIST } from 'src/ui-config/TokenList';
import { ChainIds } from 'src/utils/const';

import { DropdownOption } from './types';

const availableTokens = TOKEN_LIST.tokens.filter(
  (token) => token.chainId === ChainIds.flowEVMTestnet
);
export const availableTokensDropdownOptions = availableTokens.map((token) => ({
  label: token.symbol,
  value: token.address,
  icon: token.logoURI,
}));

export const deadlineDropdownOptions: DropdownOption[] = [
  {
    label: '10s',
    value: '10000',
  },
  {
    label: '1m',
    value: '60000',
  },
  {
    label: '30m',
    value: '1800000',
  },
  {
    label: '1h',
    value: '3600000',
  },
];

export const interestRateModeDropdownOptions: DropdownOption[] = [
  {
    label: 'Variable',
    value: '2',
  },
];
