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
    addresses: {
      VAULT_FACTORY: '0xd640db4Ae39b32985CcF91770efd31b9f9b5A419',
    },
    subgraphUrl: 'https://graph.more.markets/subgraphs/name/more-markets/vaults-subgraph',
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
  kittyRouterNGPools: {
    name: 'Kitty Router NG Pools',
    icon: '/icons/protocols/kitty.jpg',
  },
  stableKittyFactoryNG: {
    name: 'Stable Kitty Factory NG',
    icon: '/icons/protocols/kitty.jpg',
  },
};

// Mapping of addresses to their protocol descriptions
export const addressToProtocolMap = {
  '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d': protocolDescriptions.punchSwapV2Router, // mainnet
  '0xeD53235cC3E9d2d464E9c408B95948836648870B': protocolDescriptions.punchSwapV2Router, // testnet
  '0x48Dad407aB7299E0175F39F4Cd12c524DB0AB002': protocolDescriptions.more, // testnet
  '0x87048a97526c4B66b71004927D24F61DEFcD6375': protocolDescriptions.kittyRouterNGPools, // mainnet
  '0x4412140D52C1F5834469a061927811Abb6026dB7': protocolDescriptions.stableKittyFactoryNG, // mainnet
};
