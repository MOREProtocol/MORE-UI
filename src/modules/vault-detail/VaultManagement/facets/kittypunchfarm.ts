import { DisplayType, Facet, InputType, TransactionInput } from "./types";
import { Contract, ethers } from "ethers";

export const kittypunchfarmFacet: Facet = {
  name: 'KittyPunch Farm',
  icon: '/icons/protocols/kitty.jpg',
  description: 'KittyPunchFarm is a farming contract for KittyPunch (aka MultiRewards).',
  actions: [{
    id: 'stake',
    name: 'Stake',
    actionButtonText: 'Stake',
    description: 'Stake a token to a specific pool',
    abi: `function stake(address staking, uint256 amount) external`,
    inputs: [
      {
        id: 'staking',
        name: 'Staking MultiReward Contract Address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.ADDRESS_INPUT,
      },
      {
        id: 'amount',
        name: 'Amount',
        description: 'The amount to stake',
        type: InputType.UINT256,
        isShown: true,
        displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
        getCurrencyDetails: async (inputs: TransactionInput, provider: ethers.providers.Provider, vaultAddress: string) => {
          const stakingAddress = inputs.staking as string;
          if (!provider || !stakingAddress) {
            return { symbol: '', decimals: 18, address: '' };
          }
          const stakingAbi = `function stakingToken() external view returns (address)`;
          const stakingContract = new Contract(stakingAddress, [stakingAbi], provider);
          const stakingTokenAddress = await stakingContract.stakingToken();

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
    inputs: [
      {
        id: 'staking',
        name: 'Staking MultiReward Contract Address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.ADDRESS_INPUT,
      },
      {
        id: 'amount',
        name: 'Amount',
        description: 'The amount to withdraw',
        type: InputType.UINT256,
        isShown: true,
        displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
        getCurrencyDetails: async (inputs: TransactionInput, provider: ethers.providers.Provider) => {
          const stakingAddress = inputs.staking as string;
          if (!provider || !stakingAddress) {
            return { symbol: '', decimals: 18, address: '' };
          }
          const stakingAbi = `function stakingToken() external view returns (address)`;
          const stakingContract = new Contract(stakingAddress, [stakingAbi], provider);
          const stakingTokenAddress = await stakingContract.stakingToken();

          const stakingTokenAbis = [
            `function symbol() external view returns (string)`,
            `function decimals() external view returns (uint8)`,
            // `function balanceOf(address account) external view returns (uint256)`,
          ];
          const stakingTokenContract = new Contract(stakingTokenAddress, stakingTokenAbis, provider);
          const [symbol, decimals] = await Promise.all([
            stakingTokenContract.symbol(),
            stakingTokenContract.decimals(),
            // stakingTokenContract.balanceOf(selectedVaultId),
          ]);
          return {
            symbol,
            decimals,
            address: stakingTokenAddress,
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
    inputs: [
      {
        id: 'staking',
        name: 'Staking MultiReward Contract Address',
        type: InputType.ADDRESS,
        isShown: true,
        displayType: DisplayType.ADDRESS_INPUT,
      },
    ],
  },
  ],
};
