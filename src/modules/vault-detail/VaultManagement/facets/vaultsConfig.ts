import { ChainIds } from 'src/utils/const';

export const vaultsConfig = {
  [ChainIds.flowEVMTestnet]: {
    isTestnet: true,
    addresses: {
      VAULT_FACTORY: '0x7aBd84194628BD2E66F751468DE7b048e5526F15',
    },
  },
  [ChainIds.flowEVMMainnet]: {
    isTestnet: false,
  },
};

// Protocol descriptions for known addresses
const protocolDescriptions = {
  punchSwapV2Router: {
    name: 'PunchSwapV2',
    icon: 'https://swap.kittypunch.xyz/Punch1.png',
  },
  more: {
    name: 'More Markets',
    icon: '/loveMore.svg',
  },
};

// Mapping of addresses to their protocol descriptions
export const addressToProtocolMap = {
  '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d': protocolDescriptions.punchSwapV2Router, // mainnet
  '0xeD53235cC3E9d2d464E9c408B95948836648870B': protocolDescriptions.punchSwapV2Router, // testnet
  '0x48Dad407aB7299E0175F39F4Cd12c524DB0AB002': protocolDescriptions.more, // testnet
};
