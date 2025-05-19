import { ethers } from "ethers";
import { DisplayType, DropdownOption, Facet, GetCurrencyDetailsArgs, GetOptionsArgs, InputType, TransactionInput } from "./types";
import { formatUnits, zeroAddress } from "viem";
import { ComputedReserveDataWithMarket } from "src/hooks/app-data-provider/useAppDataProvider";
import { FormattedNumber } from "src/components/primitives/FormattedNumber";
import { Box, Typography, TypographyProps } from "@mui/material";
import { Address } from "src/components/Address";

const kittyRouterNGPoolsOnly = {
  mainnet: "0x87048a97526c4B66b71004927D24F61DEFcD6375"
}
const stableKittyFactoryNG = {
  mainnet: "0x4412140D52C1F5834469a061927811Abb6026dB7"
}

const getCurrencySymbolsForBundleDisplayDefault =
  (inputs: TransactionInput, reserves: ComputedReserveDataWithMarket[]) => {
    return (
      reserves &&
      reserves
        .filter((token) => [inputs._route[0], inputs._route[2]].includes(token.underlyingAsset))
        ?.map((token) => token.symbol)
    );
  };

export const curveFacet: Facet = {
  name: 'Curve (Kitty NG Pools)',
  icon: '/icons/protocols/curve.svg',
  description: '',
  actions: [
    {
      id: 'swap',
      functionName: 'exchangeNg',
      name: 'Swap',
      actionButtonText: 'Swap',
      description: 'Swap tokens using exchangeNg',
      abi: `function exchangeNg(
        address curveRouter,
        address[11] calldata _route,
        uint256[4][5] calldata _swap_params,
        uint256 _amount,
        uint256 _min_dy,
      ) external payable returns (uint256)`,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      getAmountForBundleDisplay: (inputs: TransactionInput, reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
        const amount = inputs._amount as string;
        const tokenA = inputs._route[0] as string;
        const pool = inputs._route[1] as string;
        const reserveAData = reserves?.find((reserve) => reserve.underlyingAsset.toLowerCase() === tokenA.toLowerCase());
        const decimalsA = reserveAData?.decimals || 18;
        const formattedAmountA = formatUnits(BigInt(amount), decimalsA).toString();
        const tokenB = inputs._route[2] as string;
        const reserveBData = reserves?.find((reserve) => reserve.underlyingAsset.toLowerCase() === tokenB.toLowerCase());
        const decimalsB = reserveBData?.decimals || 18;
        const formattedAmountB = formatUnits(BigInt(amount), decimalsB).toString(); // TODO: get the amount of tokenB received

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1, width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
                <Typography variant="helperText">Token in:</Typography>
                <FormattedNumber
                  value={formattedAmountA}
                  symbol={reserveAData?.symbol}
                  {...props}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                <Typography variant="helperText">Token out:</Typography>
                <FormattedNumber
                  value={formattedAmountB}
                  symbol={reserveBData?.symbol}
                  {...props}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
                <Typography variant="helperText">Pool:</Typography>
                <Address
                  address={pool}
                  link={'#'}
                  {...props}
                />
              </Box>
            </Box>
          </Box>
        )
      },
      prepareInputsWithProvider: async (inputs: TransactionInput, provider: ethers.providers.Provider): Promise<TransactionInput> => {
        const { curveRouter, pool, poolType, tokenA, tokenB, amount } = inputs;

        const factory = new ethers.Contract(pool as string, [
          `function coins(uint256 index) external view returns (address)`,
        ], provider);
        const tokenAAddress = await factory.coins(0);
        const route = Array(11).fill(zeroAddress);
        const swapParams: string[][] = Array(5).fill(null).map(() => Array(4).fill('0'));
        route[0] = tokenA;
        route[1] = pool;
        route[2] = tokenB;

        if (String(tokenAAddress).toLowerCase() !== String(tokenA).toLowerCase()) {
          swapParams[0][0] = '1';
        } else {
          swapParams[0][1] = '1';
        }

        swapParams[0][2] = '1'; // action_code: 1 for swap
        swapParams[0][3] = poolType as string;

        const kittyRouter = new ethers.Contract(kittyRouterNGPoolsOnly.mainnet, [
          `function get_dy(
            address[11] calldata _route, 
            uint256[4][5] calldata _swap_params, 
            uint256 _amount
          ) external view returns (uint256)`,
        ], provider);
        const minDy = await kittyRouter.get_dy(route, swapParams, amount);

        const result: TransactionInput = {
          curveRouter,
          _route: route,
          _swap_params: swapParams,
          _amount: amount.toString(),
          _min_dy: minDy.mul(98).div(100).toString(), // to avoid slippage
        };
        return result;
      },
      inputs: [
        {
          id: 'curveRouter',
          name: 'Curve Router',
          description: 'The curve router address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: kittyRouterNGPoolsOnly,
        },
        {
          id: 'factory',
          name: 'Factory',
          description: 'The factory address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: stableKittyFactoryNG,
        },
        {
          id: 'tokenA',
          name: 'Token to swap',
          description: 'The token to swap',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'tokenB',
          name: 'Token to receive',
          description: 'The token to receive',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS,
          dependsOnInputs: ['tokenA', 'tokenB'],
          getOptions: async ({ inputs, provider }: GetOptionsArgs): Promise<DropdownOption[]> => {
            const { tokenA, tokenB, factory: factoryAddress } = inputs;
            if (!tokenA || !tokenB || !factoryAddress) {
              return [];
            }
            const factory = new ethers.Contract(factoryAddress as string, [
              `function find_pool_for_coins(
                address _from,
                address _to,
              ) external view returns (address)`,
            ], provider);
            const pool = await factory.find_pool_for_coins(tokenA, tokenB);
            return [
              {
                label: `Pool`,
                value: pool,
              },
            ];
          },
        },
        {
          id: 'poolType',
          name: 'Pool type',
          description: 'The pool type',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          defaultValue: '10',
          options: [
            {
              label: 'Stable pools (Stableswap algorithm)',
              value: '10',
            },
            {
              label: 'Two-coin Crypto pools (Cryptoswap algorithm)',
              value: '20',
            },
          ],
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount of tokens to swap',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'tokenA',
        }
      ],
    },
    {
      id: 'addLiquidity',
      functionName: 'exchangeNg',
      name: 'Add liquidity and get LP',
      actionButtonText: 'Add liquidity',
      description: 'Add liquidity and get LP using exchangeNg',
      abi: `function exchangeNg(
        address curveRouter,
        address[11] calldata _route,
        uint256[4][5] calldata _swap_params,
        uint256 _amount,
        uint256 _min_dy,
      ) external payable returns (uint256)`,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      getAmountForBundleDisplay: (inputs: TransactionInput, reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
        const amount = inputs._amount as string;
        const tokenA = inputs._route[0] as string;
        const pool = inputs._route[1] as string;
        const reserveAData = reserves?.find((reserve) => reserve.underlyingAsset === tokenA.toLowerCase());
        const decimalsA = reserveAData?.decimals || 18;
        const formattedAmountA = formatUnits(BigInt(amount), decimalsA).toString();

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
              <Typography variant="helperText">Add liquidity:</Typography>
              <FormattedNumber
                value={formattedAmountA}
                symbol={reserveAData?.iconSymbol}
                {...props}
              />

            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
              <Typography variant="helperText">In LP:</Typography>
              <Address
                address={pool}
                link={'#'}
                {...props}
              />

            </Box>
          </Box>
        )
      },
      prepareInputsWithProvider: async (inputs: TransactionInput, provider: ethers.providers.Provider): Promise<TransactionInput> => {
        const { curveRouter, pool, poolType, tokenA, amount } = inputs;

        const factory = new ethers.Contract(pool as string, [
          `function coins(uint256 index) external view returns (address)`,
        ], provider);
        const tokenAAddress = await factory.coins(0);
        const route = Array(11).fill(zeroAddress);
        const swapParams: string[][] = Array(5).fill(null).map(() => Array(4).fill('0'));
        route[0] = tokenA;
        route[1] = pool;
        route[2] = pool;

        if (String(tokenAAddress).toLowerCase() !== String(tokenA).toLowerCase()) {
          swapParams[0][0] = '1';
        }

        swapParams[0][2] = '4'; // action_code: 4 for add liquidity
        swapParams[0][3] = poolType as string;

        const kittyRouter = new ethers.Contract(kittyRouterNGPoolsOnly.mainnet, [
          `function get_dy(
            address[11] calldata _route, 
            uint256[4][5] calldata _swap_params, 
            uint256 _amount
          ) external view returns (uint256)`,
        ], provider);
        const minDy = await kittyRouter.get_dy(route, swapParams, amount);

        const result: TransactionInput = {
          curveRouter,
          _route: route,
          _swap_params: swapParams,
          _amount: amount.toString(),
          _min_dy: minDy.mul(98).div(100).toString(), // to avoid slippage
        };
        console.log(result);
        return result;
      },
      inputs: [
        {
          id: 'curveRouter',
          name: 'Curve Router',
          description: 'The curve router address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: kittyRouterNGPoolsOnly,
        },
        {
          id: 'factory',
          name: 'Factory',
          description: 'The factory address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: stableKittyFactoryNG,
        },
        {
          id: 'tokenA',
          name: 'Token to add to LP',
          description: 'The token to add to LP',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'tokenB',
          name: 'Second token from the pool',
          description: 'The second token from the pool',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS,
          dependsOnInputs: ['tokenA', 'tokenB'],
          getOptions: async ({ inputs, provider }: GetOptionsArgs): Promise<DropdownOption[]> => {
            const { tokenA, tokenB, factory: factoryAddress } = inputs;
            if (!tokenA || !tokenB || !factoryAddress) {
              return [];
            }
            const factory = new ethers.Contract(factoryAddress as string, [
              `function find_pool_for_coins(
                address _from,
                address _to,
              ) external view returns (address)`,
            ], provider);
            const pool = await factory.find_pool_for_coins(tokenA, tokenB);
            return [
              {
                label: `Pool`,
                value: pool,
              },
            ];
          },
        },
        {
          id: 'poolType',
          name: 'Pool type',
          description: 'The pool type',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          defaultValue: '10',
          options: [
            {
              label: 'Stable pools (Stableswap algorithm)',
              value: '10',
            },
            {
              label: 'Two-coin Crypto pools (Cryptoswap algorithm)',
              value: '20',
            },
          ],
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount of tokens to add to LP',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'tokenA',
        }
      ],
    },
    {
      id: 'removeLiquidity',
      functionName: 'exchangeNg',
      name: 'Remove liquidity',
      actionButtonText: 'Remove liquidity',
      description: 'Remove liquidity using exchangeNg',
      abi: `function exchangeNg(
        address curveRouter,
        address[11] calldata _route,
        uint256[4][5] calldata _swap_params,
        uint256 _amount,
        uint256 _min_dy,
      ) external payable returns (uint256)`,
      getCurrencySymbolsForBundleDisplay: getCurrencySymbolsForBundleDisplayDefault,
      getAmountForBundleDisplay: (inputs: TransactionInput, reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
        const amount = inputs._amount as string;
        const tokenA = inputs._route[0] as string;
        const pool = inputs._route[0] as string;
        const reserveAData = reserves?.find((reserve) => reserve.underlyingAsset === tokenA.toLowerCase());
        const decimalsA = reserveAData?.decimals || 18;
        const formattedAmountA = formatUnits(BigInt(amount), decimalsA).toString();

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
              <Typography variant="helperText">Add liquidity:</Typography>
              <FormattedNumber
                value={formattedAmountA}
                symbol={reserveAData?.iconSymbol}
                {...props}
              />

            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
              <Typography variant="helperText">In LP:</Typography>
              <Address
                address={pool}
                link={'#'}
                {...props}
              />

            </Box>
          </Box>
        )
      },
      prepareInputsWithProvider: async (inputs: TransactionInput, provider: ethers.providers.Provider): Promise<TransactionInput> => {
        const { curveRouter, pool, poolType, tokenA, amount } = inputs;

        const factory = new ethers.Contract(pool as string, [
          `function coins(uint256 index) external view returns (address)`,
        ], provider);
        const tokenAAddress = await factory.coins(0);
        const route = Array(11).fill(zeroAddress);
        const swapParams: string[][] = Array(5).fill(null).map(() => Array(4).fill('0'));
        route[0] = pool;
        route[1] = pool;
        route[2] = tokenA;

        if (String(tokenAAddress).toLowerCase() !== String(tokenA).toLowerCase()) {
          swapParams[0][1] = '1';
        }

        swapParams[0][2] = '6'; // action_code: 6 for remove liquidity
        swapParams[0][3] = poolType as string;

        const kittyRouter = new ethers.Contract(kittyRouterNGPoolsOnly.mainnet, [
          `function get_dy(
            address[11] calldata _route, 
            uint256[4][5] calldata _swap_params, 
            uint256 _amount
          ) external view returns (uint256)`,
        ], provider);
        const minDy = await kittyRouter.get_dy(route, swapParams, amount);

        const result: TransactionInput = {
          curveRouter,
          _route: route,
          _swap_params: swapParams,
          _amount: amount.toString(),
          _min_dy: minDy.mul(98).div(100).toString(), // to avoid slippage
        };
        return result;
      },
      inputs: [
        {
          id: 'curveRouter',
          name: 'Curve Router',
          description: 'The curve router address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: kittyRouterNGPoolsOnly,
        },
        {
          id: 'factory',
          name: 'Factory',
          description: 'The factory address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: stableKittyFactoryNG,
        },
        {
          id: 'tokenA',
          name: 'Token from the pool to receive',
          description: 'The token from the pool to receive',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'tokenB',
          name: 'Second token from the pool',
          description: 'The second token from the pool',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.TOKEN_DROPDOWN,
        },
        {
          id: 'pool',
          name: 'Pool',
          description: 'The pool address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS,
          dependsOnInputs: ['tokenA', 'tokenB'],
          getOptions: async ({ inputs, provider }: GetOptionsArgs): Promise<DropdownOption[]> => {
            const { tokenA, tokenB, factory: factoryAddress } = inputs;
            if (!tokenA || !tokenB || !factoryAddress) {
              return [];
            }
            const factory = new ethers.Contract(factoryAddress as string, [
              `function find_pool_for_coins(
                address _from,
                address _to,
              ) external view returns (address)`,
            ], provider);
            const pool = await factory.find_pool_for_coins(tokenA, tokenB);
            return [
              {
                label: `Pool`,
                value: pool,
              },
            ];
          },
        },
        {
          id: 'poolType',
          name: 'Pool type',
          description: 'The pool type',
          type: InputType.UINT,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          defaultValue: '10',
          options: [
            {
              label: 'Stable pools (Stableswap algorithm)',
              value: '10',
            },
            {
              label: 'Two-coin Crypto pools (Cryptoswap algorithm)',
              value: '20',
            },
          ],
        },
        {
          id: 'amount',
          name: 'Amount',
          description: 'The amount of tokens to add to LP',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'pool',
          getCurrencyDetails: async ({ inputs, provider }: GetCurrencyDetailsArgs) => {
            const { pool } = inputs;
            if (!pool) {
              return { symbol: '', decimals: 18, address: '' };
            }

            try {
              const factory = new ethers.Contract(pool as string, [
                `function decimals() external view returns (uint8)`,
                `function symbol() external view returns (string)`,
              ], provider);
              const [symbol, decimals] = await Promise.all([
                factory.symbol(),
                factory.decimals(),
              ]);
              return {
                symbol,
                decimals,
                address: pool as string,
              };
            } catch (error) {
              console.error('Error getting currency details for pool:', error);
              return { symbol: '?', decimals: 18, address: pool as string };
            }
          },
        }
      ],
    },
  ],
};

