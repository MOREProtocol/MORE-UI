import { Facet } from './types';

export const origamiFacet: Facet = {
  contractAddress: {
    testnet: '0x72eBEC124864D69a33638c5BA478bd9968798709',
  },
  icon: '/icons/protocols/origami.svg',
  name: 'Origami',
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
      ) external returns (uint256 investmentAmount);`,
      inputs: [],
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
      ) external returns (uint256 toTokenAmount);`,
      inputs: [],
    },
  ],
};
