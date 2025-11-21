export interface FactoryAddresses {
  VAULT_FACTORY: string;
  ORACLE?: string;
}

export interface FactoryConfig {
  addresses: FactoryAddresses;
  subgraphUrl?: string;
}

export interface NetworkVaultConfig {
  isTestnet: boolean;
  factories: FactoryConfig[];
  helperContract?: string;
}

export type VaultsConfig = Record<number, NetworkVaultConfig>;


