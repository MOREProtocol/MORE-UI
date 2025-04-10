import { Contract, ethers } from 'ethers';
import { TOKEN_LIST } from 'src/ui-config/TokenList';

import { DisplayType, Facet, InputType, TransactionInput } from './types';

export const origamiFacet: Facet = {
  contractAddress: {
    testnet: '0x72eBEC124864D69a33638c5BA478bd9968798709',
  },
  icon: '/icons/protocols/morigami.svg',
  name: 'MORigami',
  description: 'Origami is a decentralized exchange for trading cryptocurrencies.',
  actions: [
    {
      id: 'investWithToken',
      name: 'Invest with Token',
      actionButtonText: 'Invest',
      description: 'Invest with a token',
      abi: `function investWithToken(
        address lovToken,
        uint256 fromTokenAmount,
        address fromToken,
        uint256 maxSlippageBps,
        uint256 deadline
      ) external;`,
      inputs: [
        {
          id: 'lovToken',
          name: 'lovToken',
          description: 'The lovToken address',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.ADDRESS_INPUT,
          defaultValue: '0x87fDa685d17865825474d99d5153b8a17c402bA5',
        },
        {
          id: 'fromToken',
          name: 'From Token',
          description: 'The token to invest from',
          type: InputType.ADDRESS,
          isShown: true,
          displayType: DisplayType.DROPDOWN,
          getOptions: async (inputs: TransactionInput, provider: ethers.providers.Provider) => {
            const lovToken = inputs.lovToken as string;
            if (!provider || !lovToken) {
              return [];
            }
            const loveTokenAbi = `function acceptedInvestTokens() external view returns (address[])`;
            const lovTokenContract = new Contract(lovToken, [loveTokenAbi], provider);
            const acceptedInvestTokens = await lovTokenContract.acceptedInvestTokens();
            return acceptedInvestTokens.map((token) => ({
              icon: TOKEN_LIST?.tokens?.find((t) => t.address === token)?.logoURI || '',
              label: TOKEN_LIST?.tokens?.find((t) => t.address === token)?.name || token,
              decimals: TOKEN_LIST?.tokens?.find((t) => t.address === token)?.decimals || 18,
              value: token,
            }));
          },
        },
        {
          id: 'fromTokenAmount',
          name: 'From Token Amount',
          description: 'The amount of tokens to invest',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.CURRENCY_AMOUNT_INPUT,
          relatedInputId: 'fromToken',
        },
        {
          id: 'maxSlippageBps',
          name: 'Max Slippage Bps',
          description: 'The max slippage bps',
          type: InputType.UINT256,
          isShown: true,
          defaultValue: '100',
        },
        {
          id: 'deadline',
          name: 'Deadline',
          description: 'The deadline',
          type: InputType.UINT256,
          isShown: true,
          displayType: DisplayType.DEADLINE_INPUT,
          defaultValue: '900',
        },
      ],
    },
    {
      id: 'exitToToken',
      name: 'Exit to Token',
      actionButtonText: 'Exit',
      description: 'Exit to a token',
      abi: `function exitToToken(
        address lovToken,
        uint256 investmentAmount,
        address toToken,
        uint256 maxSlippageBps,
        uint256 deadline
      ) external;`,
      inputs: [],
    },
  ],
};
