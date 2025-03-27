import { ChainIds } from "src/utils/const";

export const vaultsConfig = {
  [ChainIds.flowEVMTestnet]: {
    isTestnet: true,
    addresses: {
      VAULT_REGISTRY: '0x3A9f98CCC66a76C8EE40583853390e302784330C',
      MULTICALL_FACET: '0x55082Fd0DCc232020dB39970862b5F7fFa828CAb'
    }
  },
  [ChainIds.flowEVMMainnet]: {
    isTestnet: false,
  },
};
