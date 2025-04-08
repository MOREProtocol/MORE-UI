import { Box, TypographyProps } from '@mui/material';
import BigNumber from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import React from 'react';
import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';

import { FormattedNumber } from '../../../../components/primitives/FormattedNumber';
import { availableTokensDropdownOptions, interestRateModeDropdownOptions } from './constants';
import { DisplayType, Facet, InputType } from './types';

const getCurrencySymbolsForBundleDisplayDefault = (inputs: Record<string, string>) => {
  return [availableTokensDropdownOptions.find((token) => token.value === inputs['asset'])?.label];
};

const defaultContractAddress = {
  mainnet: '0xbC92aaC2DBBF42215248B5688eB3D3d2b32F2c8d',
  testnet: '0x48Dad407aB7299E0175F39F4Cd12c524DB0AB002',
};

const getAmountForBundleDisplayDefault = (
  inputs: Record<string, string>,
  props?: TypographyProps,
  reserves?: ComputedReserveDataWithMarket[]
) => {
  const reserveData =
    reserves && reserves.length > 0
      ? reserves?.find((reserve) => reserve.underlyingAsset === inputs['asset'].toLowerCase())
      : null;

  // inputs['amount'] is already in Wei (base units) string format
  const amountInWei = new BigNumber(inputs['amount'] || '0');
  const decimals = reserveData?.decimals || 18;

  // Price is assumed to be in USD per standard unit, scaled by 8 decimals
  const priceInUsd = new BigNumber(reserveData?.formattedPriceInMarketReferenceCurrency || '0');

  // Calculate USD value: (amountInWei * priceInUsd) / 10^decimals
  // The result will be scaled by 8 decimals
  const amountInUsd = amountInWei.times(priceInUsd).dividedBy(new BigNumber(10).pow(decimals));

  // Format the Wei amount into standard units for display
  const formattedAmount = formatUnits(inputs['amount'] || '0', decimals);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
      <FormattedNumber
        value={formattedAmount} // Display formatted standard unit amount
        symbol={
          availableTokensDropdownOptions.find((token) => token.value === inputs['asset'])?.label
        }
        {...props}
      />
      {amountInUsd.gt(0) && (
        <FormattedNumber
          value={amountInUsd.toString()} // Display calculated USD value (scaled by 8)
          symbol="USD"
          {...props}
          variant="secondary12"
        />
      )}
    </Box>
  );
};

export const moreFacet: Facet = {
  contractAddress: defaultContractAddress,
  name: 'MORE Markets',
  icon: '/loveMore.svg',
  description: 'MORE is a decentralized exchange for trading cryptocurrencies.',
  actions: [
    {
      id: 'supply',
      name: 'Supply',
      actionButtonText: 'Supply',
      description: 'Supply a token to a specific pool',
      abi: `function supply(
        address pool,
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
      ) external;`,
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      inputs: [
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultContractAddress,
        },
        {
          id: 'asset',
          name: 'Asset',
          description: 'The asset to supply',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          dropdownOptions: availableTokensDropdownOptions,
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount to supply',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'asset',
        },
        {
          id: 'onBehalfOf',
          name: 'On Behalf Of',
          description: 'The address to supply the tokens on behalf of',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
        },
        {
          id: 'referralCode',
          name: 'Referral Code',
          description: 'The referral code to use',
          type: InputType.UINT,
          isShown: true,
        },
      ],
    },
    {
      id: 'withdraw',
      name: 'Withdraw',
      actionButtonText: 'Withdraw',
      description: 'Withdraw a token from a specific pool',
      abi: `function withdraw(
        address pool,
        address asset,
        uint256 amount,
        address to
      ) external;`,
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      inputs: [
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool to withdraw from',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultContractAddress,
        },
        {
          id: 'asset',
          name: 'Asset',
          description: 'The asset to withdraw',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          dropdownOptions: availableTokensDropdownOptions,
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount to withdraw',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'asset',
        },
        {
          id: 'to',
          name: 'To',
          description: 'The address to send the withdrawn tokens to',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
        },
      ],
    },
    {
      id: 'borrow',
      name: 'Borrow',
      actionButtonText: 'Borrow',
      description: 'Borrow a token from a specific pool',
      abi: `function borrow(
        address pool,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
      ) external;`,
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      inputs: [
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool to borrow from',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultContractAddress,
        },
        {
          id: 'asset',
          name: 'Asset',
          description: 'The asset to borrow',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          dropdownOptions: availableTokensDropdownOptions,
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount to borrow',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'asset',
        },
        {
          id: 'interestRateMode',
          name: 'Interest Rate Mode',
          description: 'The interest rate mode to use',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          defaultValue: '2',
          dropdownOptions: interestRateModeDropdownOptions,
        },
        {
          id: 'referralCode',
          name: 'Referral Code',
          description: 'The referral code to use',
          type: InputType.UINT16,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          defaultValue: '0',
          dropdownOptions: [{ label: '0', value: '0' }],
        },
        {
          id: 'onBehalfOf',
          name: 'On Behalf Of',
          description: 'The address to borrow the tokens on behalf of',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
        },
      ],
    },
    {
      id: 'repay',
      name: 'Repay',
      actionButtonText: 'Repay',
      description: 'Repay a token from a specific pool',
      abi: `function repay(
        address pool,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
      ) external;`,
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      inputs: [
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool to repay to',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultContractAddress,
        },
        {
          id: 'asset',
          name: 'Asset',
          description: 'The asset to repay',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          dropdownOptions: availableTokensDropdownOptions,
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount to repay',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'asset',
        },
        {
          id: 'interestRateMode',
          name: 'Interest Rate Mode',
          description: 'The interest rate mode to use',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          defaultValue: '2',
          dropdownOptions: interestRateModeDropdownOptions,
        },
        {
          id: 'onBehalfOf',
          name: 'On Behalf Of',
          description: 'The address to repay the tokens on behalf of',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
        },
      ],
    },
    {
      id: 'flashLoanSimple',
      name: 'Flash Loan Simple',
      actionButtonText: 'Flash Loan',
      description: 'Flash loan a token from a specific pool',
      abi: `function flashLoanSimple(
        address pool,
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
      ) external;`,
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      inputs: [
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool to flash loan from',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultContractAddress,
        },
        {
          id: 'receiverAddress',
          name: 'Receiver Address',
          description: 'The address to receive the flash loan',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
        },
        {
          id: 'asset',
          name: 'Asset',
          description: 'The asset to flash loan',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          dropdownOptions: availableTokensDropdownOptions,
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount to flash loan',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'asset',
        },
        {
          id: 'params',
          name: 'Params',
          description: 'The params to pass to the flash loan',
          type: InputType.BYTES,
          isShown: true,
          displayType: DisplayType.BYTES_INPUT,
        },
        {
          id: 'referralCode',
          name: 'Referral Code',
          description: 'The referral code to use',
          type: InputType.UINT16,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          defaultValue: '0',
          dropdownOptions: [{ label: '0', value: '0' }],
        },
      ],
    },
  ],
};
