import { FormattedNumber } from "src/components/primitives/FormattedNumber";
import { DisplayType, Facet, GetCurrencyDetailsArgs, GetOptionsArgs, InputType, TransactionInput } from "./types";
import { Contract, ethers } from "ethers";
import { Box, Typography, TypographyProps } from "@mui/material";
import { ComputedReserveDataWithMarket } from "src/hooks/app-data-provider/useAppDataProvider";
import { Address } from "src/components/Address";
import { formatUnits } from "viem";

const multiRewardFactory = {
  mainnet: '0xfFDf8d53c737b91423D66cb558B2d15bf6D17f94',
}
const multiRewardsInfoTupleString = `tuple(
  address multiRewards,
  uint256 totalSupply,
  address stakingToken,
  address[] rewardTokens,
  tuple(
    address rewardsDistributor,
    uint256 rewardsDuration,
    uint256 periodFinish,
    uint256 rewardRate,
    uint256 lastUpdateTime,
    uint256 rewardPerTokenStored
  )[] rewardData
)`;

export const multirewardsFacet: Facet = {
  name: 'Multirewards (KittyPunch Farming)',
  icon: '/icons/protocols/kitty.jpg',
  description: 'KittyPunchFarm is a farming contract for KittyPunch (aka MultiRewards).',
  actions: [{
    id: 'stake',
    name: 'Stake',
    actionButtonText: 'Stake',
    description: 'Stake a token to a specific pool',
    abi: `function stake(address staking, uint256 amount) external`,
    getAmountForBundleDisplay: (inputs: TransactionInput, _reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
      const amount = inputs.amount as string;
      const stakingToken = inputs.staking as string;
      const formattedAmount = formatUnits(BigInt(amount), 18).toString();

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
            <Typography variant="helperText">Stake:</Typography>
            <FormattedNumber
              value={formattedAmount}
              {...props}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
            <Typography variant="helperText">In multirewards pool:</Typography>
            <Address
              address={stakingToken}
              link={'#'}
              {...props}
            />
          </Box>
        </Box>
      );
    },
    inputs: [
      {
        id: 'factory',
        name: 'Factory',
        description: 'The factory address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.ADDRESS_INPUT,
        defaultValue: multiRewardFactory,
      },
      {
        id: 'staking',
        name: 'Staking MultiReward Contract Address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.DROPDOWN,
        getOptions: async ({ inputs, provider }: GetOptionsArgs) => {
          const multirewardsFactoryAbi = [
            `function getAllMultiRewardsInfo() external view returns (${multiRewardsInfoTupleString}[] memory)`
          ];
          const multiRewardFactoryContract = new Contract(
            inputs.factory as string,
            multirewardsFactoryAbi,
            provider
          );

          const poolList: {
            multiRewards: string;
            stakingToken: string;
            [key: string]: string;
          }[] = await multiRewardFactoryContract.getAllMultiRewardsInfo();

          if (!poolList || poolList.length === 0) {
            return [];
          }

          const options = await Promise.all(poolList.map(async (pool) => {
            let tokenSymbol = 'N/A';
            try {
              if (pool.stakingToken && ethers.utils.isAddress(pool.stakingToken)) {
                const tokenContract = new Contract(pool.stakingToken, ['function symbol() view returns (string)'], provider);
                tokenSymbol = await tokenContract.symbol();
              }
            } catch (e) {
              console.error(`Failed to fetch symbol for ${pool.stakingToken}:`, e);
              tokenSymbol = `${pool.stakingToken.substring(0, 6)}...${pool.stakingToken.substring(pool.stakingToken.length - 4)}`;
            }
            return {
              label: `${tokenSymbol} Pool (${pool.multiRewards.substring(0, 6)}...${pool.multiRewards.substring(pool.multiRewards.length - 4)})`,
              value: pool.multiRewards,
            };
          }));

          return options;
        },
      },
      {
        id: 'amount',
        name: 'Amount',
        description: 'The amount to stake',
        type: InputType.UINT256,
        isShown: true,
        displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
        relatedInputId: 'staking',
        getCurrencyDetails: async (
          { inputs, provider, vaultAddress }: GetCurrencyDetailsArgs,
        ) => {
          const multirewardsAddress = inputs.staking as string;
          const factoryAddress = inputs.factory as string;
          if (!provider || !multirewardsAddress || !factoryAddress) {
            return { symbol: '', decimals: 18, address: '' };
          }

          const multirewardsFactoryAbi = [
            `function getMultiRewardsInfo(address multiRewards) external view returns (${multiRewardsInfoTupleString})`,
          ];
          const multiRewardFactoryContract = new Contract(factoryAddress, multirewardsFactoryAbi, provider);
          const multiRewardsInfo = await multiRewardFactoryContract.getMultiRewardsInfo(multirewardsAddress);
          const stakingTokenAddress = multiRewardsInfo.stakingToken;

          const stakingTokenAbis = [
            `function symbol() external view returns (string)`,
            `function decimals() external view returns (uint8)`,
            `function balanceOf(address account) external view returns (uint256)`,
          ];
          const stakingTokenContract = new Contract(stakingTokenAddress, stakingTokenAbis, provider);
          const [symbol, decimals, balance] = await Promise.all([
            stakingTokenContract.symbol(),
            stakingTokenContract.decimals(),
            stakingTokenContract.balanceOf(vaultAddress),
          ]);
          return {
            symbol,
            decimals,
            address: stakingTokenAddress,
            balance: balance.toString(),
          };
        },
      },
    ],
  },
  {
    id: 'withdraw',
    name: 'Withdraw',
    actionButtonText: 'Withdraw',
    description: 'Withdraw a token from a specific pool',
    abi: `function withdraw(address staking, uint256 amount) external`,
    getAmountForBundleDisplay: (inputs: TransactionInput, _reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
      const amount = inputs.amount as string;
      const stakingToken = inputs.staking as string;
      const formattedAmount = formatUnits(BigInt(amount), 18).toString();

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
            <Typography variant="helperText">Withdraw:</Typography>
            <FormattedNumber
              value={formattedAmount}
              {...props}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
            <Typography variant="helperText">From multirewards pool:</Typography>
            <Address
              address={stakingToken}
              link={'#'}
              {...props}
            />
          </Box>
        </Box>
      );
    },
    inputs: [
      {
        id: 'factory',
        name: 'Factory',
        description: 'The factory address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.ADDRESS_INPUT,
        defaultValue: multiRewardFactory,
      },
      {
        id: 'staking',
        name: 'Staking MultiReward Contract Address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.DROPDOWN,
        getOptions: async ({ inputs, provider }: GetOptionsArgs) => {
          const multirewardsFactoryAbi = [
            `function getAllMultiRewardsInfo() external view returns (${multiRewardsInfoTupleString}[] memory)`
          ];
          const multiRewardFactoryContract = new Contract(
            inputs.factory as string,
            multirewardsFactoryAbi,
            provider
          );

          const poolList: {
            multiRewards: string;
            stakingToken: string;
            [key: string]: string;
          }[] = await multiRewardFactoryContract.getAllMultiRewardsInfo();

          if (!poolList || poolList.length === 0) {
            return [];
          }

          const options = await Promise.all(poolList.map(async (pool) => {
            let tokenSymbol = 'N/A';
            try {
              if (pool.stakingToken && ethers.utils.isAddress(pool.stakingToken)) {
                const tokenContract = new Contract(pool.stakingToken, ['function symbol() view returns (string)'], provider);
                tokenSymbol = await tokenContract.symbol();
              }
            } catch (e) {
              console.error(`Failed to fetch symbol for ${pool.stakingToken}:`, e);
              tokenSymbol = `${pool.stakingToken.substring(0, 6)}...${pool.stakingToken.substring(pool.stakingToken.length - 4)}`;
            }
            return {
              label: `${tokenSymbol} Pool (${pool.multiRewards.substring(0, 6)}...${pool.multiRewards.substring(pool.multiRewards.length - 4)})`,
              value: pool.multiRewards,
            };
          }));

          return options;
        },
      },
      {
        id: 'amount',
        name: 'Amount',
        description: 'The amount to stake',
        type: InputType.UINT256,
        isShown: true,
        displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
        relatedInputId: 'staking',
        getCurrencyDetails: async (
          { inputs, provider, vaultAddress }: GetCurrencyDetailsArgs,
        ) => {
          const multirewardsAddress = inputs.staking as string;
          const factoryAddress = inputs.factory as string;
          if (!provider || !multirewardsAddress || !factoryAddress) {
            return { symbol: '', decimals: 18, address: '' };
          }

          const multirewardsFactoryAbi = [
            `function getMultiRewardsInfo(address multiRewards) external view returns (${multiRewardsInfoTupleString})`,
          ];
          const multiRewardFactoryContract = new Contract(factoryAddress, multirewardsFactoryAbi, provider);
          const multiRewardsInfo = await multiRewardFactoryContract.getMultiRewardsInfo(multirewardsAddress);
          const stakingTokenAddress = multiRewardsInfo.stakingToken;

          const stakingTokenAbis = [
            `function symbol() external view returns (string)`,
            `function decimals() external view returns (uint8)`,
          ];
          const multiRewardsContract = new Contract(multirewardsAddress, [
            `function balanceOf(address account) external view returns (uint256)`
          ], provider);
          const stakingTokenContract = new Contract(stakingTokenAddress, stakingTokenAbis, provider);
          const [symbol, decimals, balance] = await Promise.all([
            stakingTokenContract.symbol(),
            stakingTokenContract.decimals(),
            multiRewardsContract.balanceOf(vaultAddress),
          ]);
          return {
            symbol,
            decimals,
            address: stakingTokenAddress,
            balance: balance.toString(),
          };
        },
      },
    ],
  },
  {
    id: 'getReward',
    name: 'Get Reward',
    actionButtonText: 'Get Reward',
    description: 'Get reward from a specific pool',
    abi: `function getReward(address staking) external`,
    getAmountForBundleDisplay: (inputs: TransactionInput, _reserves: ComputedReserveDataWithMarket[], props?: TypographyProps) => {
      const stakingToken = inputs.staking as string;

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
          <Typography variant="helperText">From multirewards pool:</Typography>
          <Address
            address={stakingToken}
            link={'#'}
            {...props}
          />
        </Box>
      );
    },
    inputs: [
      {
        id: 'factory',
        name: 'Factory',
        description: 'The factory address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.ADDRESS_INPUT,
        defaultValue: multiRewardFactory,
      },
      {
        id: 'staking',
        name: 'Staking MultiReward Contract Address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.DROPDOWN,
        getOptions: async ({ inputs, provider }: GetOptionsArgs) => {
          const multirewardsFactoryAbi = [
            `function getAllMultiRewardsInfo() external view returns (${multiRewardsInfoTupleString}[] memory)`
          ];
          const multiRewardFactoryContract = new Contract(
            inputs.factory as string,
            multirewardsFactoryAbi,
            provider
          );

          const poolList: {
            multiRewards: string;
            stakingToken: string;
            [key: string]: string;
          }[] = await multiRewardFactoryContract.getAllMultiRewardsInfo();

          if (!poolList || poolList.length === 0) {
            return [];
          }

          const options = await Promise.all(poolList.map(async (pool) => {
            let tokenSymbol = 'N/A';
            try {
              if (pool.stakingToken && ethers.utils.isAddress(pool.stakingToken)) {
                const tokenContract = new Contract(pool.stakingToken, ['function symbol() view returns (string)'], provider);
                tokenSymbol = await tokenContract.symbol();
              }
            } catch (e) {
              console.error(`Failed to fetch symbol for ${pool.stakingToken}:`, e);
              tokenSymbol = `${pool.stakingToken.substring(0, 6)}...${pool.stakingToken.substring(pool.stakingToken.length - 4)}`;
            }
            return {
              label: `${tokenSymbol} Pool (${pool.multiRewards.substring(0, 6)}...${pool.multiRewards.substring(pool.multiRewards.length - 4)})`,
              value: pool.multiRewards,
            };
          }));

          return options;
        },
      },
    ],
  },
  ],
};
