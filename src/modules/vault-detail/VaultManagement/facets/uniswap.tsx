import { Box, Typography, TypographyProps } from '@mui/material';
import { BigNumber } from 'bignumber.js';
import { Contract } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';

import { DisplayType, Facet, GetOptionsArgs, InputType, TransactionInput } from './types';
import { addressToProtocolMap } from './vaultsConfig';

const defaultRouter = {
  // PunchSwapV2Router
  testnet: '0xeD53235cC3E9d2d464E9c408B95948836648870B',
  mainnet: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
};

const getAmountForBundleDisplayDefault =
  <T extends TransactionInput>(
    getAssetA: (inputs: T) => string,
    getAssetB: (inputs: T) => string,
    getAmountA: (inputs: T) => string,
    getAmountB: (inputs: T) => string,
    getRouterAddress: (inputs: T) => string
  ) =>
    (inputs: T, reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
      const routerAddress = String(getRouterAddress(inputs));
      const assetA = getAssetA(inputs);
      const assetB = getAssetB(inputs);
      const reserveAData =
        reserves && reserves.length > 0
          ? reserves?.find((reserve) => reserve.underlyingAsset === getAssetA(inputs).toLowerCase())
          : null;
      const reserveBData =
        reserves && reserves.length > 0
          ? reserves?.find((reserve) => reserve.underlyingAsset === getAssetB(inputs).toLowerCase())
          : null;

      // Assume getAmountA/B return amount in Wei string format
      const amountAInWei = new BigNumber(getAmountA(inputs) || '0');
      const amountBInWei = new BigNumber(getAmountB(inputs) || '0');
      const decimalsA = reserveAData?.decimals || 18;
      const decimalsB = reserveBData?.decimals || 18;

      // Price is assumed to be in USD per standard unit
      const priceAInUsd = new BigNumber(reserveAData?.formattedPriceInMarketReferenceCurrency || '0');
      const priceBInUsd = new BigNumber(reserveBData?.formattedPriceInMarketReferenceCurrency || '0');

      // Calculate USD value: (amountInWei * price) / 10^decimals
      const amountAInUsd = amountAInWei
        .times(priceAInUsd)
        .dividedBy(new BigNumber(10).pow(decimalsA));
      const amountBInUsd = amountBInWei
        .times(priceBInUsd)
        .dividedBy(new BigNumber(10).pow(decimalsB));

      // Format Wei amounts into standard units for display
      const formattedAmountA = formatUnits(getAmountA(inputs) || '0', decimalsA);
      const formattedAmountB = formatUnits(getAmountB(inputs) || '0', decimalsB);

      return (
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
            <FormattedNumber
              value={formattedAmountA}
              symbol={reserves?.find((token) => token.underlyingAsset === assetA)?.iconSymbol}
              {...props}
            />
            {amountAInUsd.gt(0) && (
              <FormattedNumber
                value={amountAInUsd.toString()}
                symbol="USD"
                {...props}
                variant="secondary12"
              />
            )}
          </Box>
          {addressToProtocolMap[routerAddress] ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <img
                src={addressToProtocolMap[routerAddress].icon}
                alt={addressToProtocolMap[routerAddress].name}
                style={{ width: 20, height: 20, borderRadius: '50%' }}
              />
              <Typography variant="helperText">{addressToProtocolMap[routerAddress].name}</Typography>
            </Box>
          ) : (
            <Typography variant="helperText">Custom router</Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
            <FormattedNumber
              value={formattedAmountB}
              symbol={reserves?.find((token) => token.underlyingAsset === assetB)?.iconSymbol}
              {...props}
            />
            {amountBInUsd.gt(0) && (
              <FormattedNumber
                value={amountBInUsd.toString()}
                symbol="USD"
                {...props}
                variant="secondary12"
              />
            )}
          </Box>
        </Box>
      );
    };

const getCurrencySymbolsForBundleDisplayDefault =
  (assetAKey: string, assetBKey: string) =>
    (inputs: TransactionInput, reserves: ComputedReserveDataWithMarket[]) => {
      return (
        reserves &&
        reserves
          .filter((token) => [inputs[assetAKey], inputs[assetBKey]].includes(token.underlyingAsset))
          ?.map((token) => token.iconSymbol)
      );
    };

export const uniswapFacet: Facet = {
  name: 'Uniswap v2 (PunchSwapV2 Router)',
  icon: '/icons/protocols/uniswap.svg',
  description: 'Uniswap is a decentralized exchange for trading cryptocurrencies.',
  actions: [
    {
      id: 'addLiquidity',
      name: 'Add Liquidity',
      actionButtonText: 'Add Liquidity',
      description: 'Add liquidity to a pool',
      abi: `function addLiquidity(
        address router,
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
      ) external;`,
      isBundled: true,
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault(
        (inputs) => inputs.tokenA as string,
        (inputs) => inputs.tokenB as string,
        (inputs) => inputs.amountADesired as string,
        (inputs) => inputs.amountBDesired as string,
        (inputs) => inputs.router as string
      ),
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault(
        'tokenA',
        'tokenB'
      ),
      inputs: [
        {
          id: 'router',
          name: 'Router',
          description: 'The router address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultRouter,
        },
        {
          id: 'tokenA',
          name: 'Token A',
          description: 'The token A address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'tokenB',
          name: 'Token B',
          description: 'The token B address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'amountADesired',
          name: 'Amount A Desired',
          description: 'The amount of token A desired',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'tokenA',
        },
        {
          id: 'amountBDesired',
          name: 'Amount B Desired',
          description: 'The amount of token B desired',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'tokenB',
        },
        {
          id: 'to',
          name: 'To',
          description: 'The address to send the tokens to',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
        },
        {
          id: 'deadline',
          name: 'Deadline',
          description: 'The deadline of the transaction',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.DEADLINE_INPUT,
          defaultValue: '900',
        },
      ],
    },
    {
      id: 'removeLiquidity',
      name: 'Remove Liquidity',
      actionButtonText: 'Remove Liquidity',
      description: 'Remove liquidity from a pool',
      abi: `function removeLiquidity(
        address router,
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
      ) external;`,
      isBundled: true,
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault(
        (inputs) => inputs.tokenA as string,
        (inputs) => inputs.tokenB as string,
        (inputs) => inputs.amountAMin as string,
        (inputs) => inputs.amountBMin as string,
        (inputs) => inputs.router as string
      ),
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault(
        'tokenA',
        'tokenB'
      ),
      inputs: [
        {
          id: 'router',
          name: 'Router',
          description: 'The router address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultRouter,
        },
        {
          id: 'tokenA',
          name: 'Token A',
          description: 'The token A address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'tokenB',
          name: 'Token B',
          description: 'The token B address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'liquidity',
          name: 'Liquidity',
          description: 'The liquidity to remove',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
        },
        {
          id: 'amountAMin',
          name: 'Amount A Min',
          description: 'The minimum amount of token A desired',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'tokenA',
        },
        {
          id: 'amountBMin',
          name: 'Amount B Min',
          description: 'The minimum amount of token B desired',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'tokenB',
        },
        {
          id: 'to',
          name: 'To',
          description: 'The address to send the tokens to',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: '',
        },
        {
          id: 'deadline',
          name: 'Deadline',
          description: 'The deadline of the transaction',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.DEADLINE_INPUT,
          defaultValue: '900',
        },
      ],
    },
    {
      id: 'swapExactTokensForTokens',
      name: 'Swap Exact Tokens For Tokens',
      actionButtonText: 'Swap',
      description: 'Swap exact tokens for tokens using a call data path',
      abi: `function swapExactTokensForTokens(
        address router,
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
      ) external;`,
      isBundled: true,
      prepareInputs: (inputs: TransactionInput): TransactionInput => {
        const { tokenIn, tokenOut, ...restInputs } = inputs;
        const result: TransactionInput = {
          ...restInputs,
          path: [tokenIn as string, tokenOut as string],
        };
        return result;
      },
      getAmountForBundleDisplay: getAmountForBundleDisplayDefault(
        (inputs) => inputs.path[0] as string,
        (inputs) => inputs.path[1] as string,
        (inputs) => inputs.amountIn as string,
        (inputs) => inputs.amountOutMin as string,
        (inputs) => inputs.router as string
      ),
      getCurrencySymbolsForBundleDisplay: (
        inputs: TransactionInput,
        reserves: ComputedReserveDataWithMarket[]
      ) => {
        return (
          reserves &&
          reserves
            .filter((token) => [inputs.path[0], inputs.path[1]].includes(token.underlyingAsset))
            ?.map((token) => token.iconSymbol)
        );
      },
      inputs: [
        {
          id: 'router',
          name: 'Router',
          description: 'The router address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: defaultRouter,
        },
        {
          id: 'tokenIn',
          name: 'Token In',
          description: 'The token to swap',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'tokenOut',
          name: 'Token Out',
          description: 'The token to receive',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'amountIn',
          name: 'Amount In',
          description: 'The amount of tokens to swap',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'tokenIn',
        },
        {
          id: 'amountOutMin',
          name: 'Amount Out Min',
          description: 'The minimum amount of tokens to receive',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT,
          relatedInputId: 'tokenOut',
          dependsOnInputs: ['router', 'tokenIn', 'tokenOut', 'amountIn'],
          getOptions: async ({ inputs, provider }: GetOptionsArgs) => {
            if (
              !provider ||
              !inputs.router ||
              !inputs.tokenIn ||
              !inputs.tokenOut ||
              !inputs.amountIn
            ) {
              return [];
            }
            const routerAddress = String(inputs.router);
            const tokenIn = String(inputs.tokenIn);
            const tokenOut = String(inputs.tokenOut);
            const amountIn = String(inputs.amountIn);
            const path = [tokenIn, tokenOut];

            const uniswapV2RouterAbi = `function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)`;
            const routerContract = new Contract(routerAddress, [uniswapV2RouterAbi], provider);
            const amountsOut = await routerContract.getAmountsOut(amountIn, path);

            const tokenContract = new Contract(tokenOut, [
              `function decimals() external view returns (uint8)`,
            ], provider);
            const decimals = await tokenContract.decimals();

            return [
              {
                label: formatUnits(amountsOut[1], decimals || 18).toString(),
                value: amountsOut[1].toString(),
              },
            ];
          },
        },
        {
          id: 'to',
          name: 'To',
          description: 'The address to send the tokens to',
          type: InputType.ADDRESS,
          isShown: false,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: '',
        },
        {
          id: 'deadline',
          name: 'Deadline',
          description: 'The deadline of the transaction',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.DEADLINE_INPUT,
          defaultValue: '900',
        },
      ],
    },
  ],
};
