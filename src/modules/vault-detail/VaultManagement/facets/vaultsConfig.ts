import { ChainIds } from 'src/utils/const';

const flowSubgraphURL = process.env.NEXT_PUBLIC_FLOW_SUBGRAPH_URL
const crosschainFlowSubgraphURL = process.env.NEXT_PUBLIC_CROSSCHAIN_FLOW_SUBGRAPH_URL
const ethereumSubgraphURL = process.env.NEXT_PUBLIC_ETHEREUM_SUBGRAPH_URL

export const vaultsConfig = {
  [ChainIds.flowEVMTestnet]: {
    isTestnet: true,
    factories: [
      {
        addresses: {
          VAULT_FACTORY: '0x7aBd84194628BD2E66F751468DE7b048e5526F15',
        },
      }
    ],
  },
  [ChainIds.flowEVMMainnet]: {
    isTestnet: false,
    factories: [
      {
        addresses: {
          VAULT_FACTORY: '0xd640db4Ae39b32985CcF91770efd31b9f9b5A419',
          ORACLE: '0x7287f12c268d7Dff22AAa5c2AA242D7640041cB1'
        },
        subgraphUrl: flowSubgraphURL,
      },
      {
        addresses: {
          VAULT_FACTORY: '0x7bDB8B17604b03125eFAED33cA0c55FBf856BB0C',
          ORACLE: '0xA7b968ca75eb0224a396cA5cD482d18D4ca2041a'
        },
        subgraphUrl: crosschainFlowSubgraphURL,
      }
    ],
    helperContract: "0xbCd01024b59a7FbAb76d0c806aB590ABa01F6126"
  },
  [ChainIds.ethereum]: {
    isTestnet: false,
    factories: [
      {
        addresses: {
          VAULT_FACTORY: '0x88a70bc7a8e691d7558c60a35bf58ed68f00e3f4',
          ORACLE: '0x76DFB167956152620f47334A9E7De06E9bd1A4BC'
        },
        subgraphUrl: ethereumSubgraphURL,
      }
    ],
    helperContract: "0x0000000000000000000000000000000000000000"
  },
};

// Protocol descriptions for known addresses
const protocolDescriptions = {
  punchSwapV2Router: {
    name: 'PunchSwapV2',
    icon: 'https://swap.kittypunch.xyz/Punch1.png',
  },
  more: {
    name: 'MORE Markets',
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
