export const ChainIds = {
  ethereum: 1,
  flowEVMTestnet: 545,
  flowEVMMainnet: 747,
  base: 8453,
  arbitrum: 42161,
};

// LayerZero Endpoint IDs
export const LZ_EIDS = {
  base: 30184,
  ethereum: 30101,
  arbitrum: 30110,
  flowMainnet: 30336,
};

// Reverse lookup: EID → chainId
export const EID_TO_CHAIN_ID: Record<number, number> = {
  [LZ_EIDS.base]: ChainIds.base,
  [LZ_EIDS.ethereum]: ChainIds.ethereum,
  [LZ_EIDS.arbitrum]: ChainIds.arbitrum,
  [LZ_EIDS.flowMainnet]: ChainIds.flowEVMMainnet,
};

// Forward lookup: chainId → LZ EID
export const CHAIN_ID_TO_LZ_EID: Record<number, number> = {
  [ChainIds.base]: LZ_EIDS.base,
  [ChainIds.ethereum]: LZ_EIDS.ethereum,
  [ChainIds.arbitrum]: LZ_EIDS.arbitrum,
  [ChainIds.flowEVMMainnet]: LZ_EIDS.flowMainnet,
};

export const OMNI_FACTORY_ADDRESS = '0x7bDB8B17604b03125eFAED33cA0c55FBf856BB0C';
export const OMNI_REGISTRY_ADDRESS = '0x6a0B3724AF49Ce6f14669D07823650Ec26553890';
export const OMNI_EXTRA_OPTIONS = '0x';

export const feeClaimer = '';

export const multicalls = {
  testnet: '0xF7d11c74B5706155d7C6DBe931d590611a371a8a',
  mainnet: '0x8358d18E99F44E39ea90339c4d6E8C36101f8161',
};

export const strictlySanctionedCountries: string[] = [
  "CU",  // Cuba
  "KP",  // North Korea
  "IR",  // Iran
  "IQ",  // Iraq
  "SD",  // Sudan
  "SY",  // Syria
  "UA"   // Ukraine
];
export const sanctionedCountries: string[] = [
  "BD",  // Bangladesh
  "BY",  // Belarus
  "BO",  // Bolivia
  "CA",  // Canada
  "CI",  // Côte d’Ivoire
  "LR",  // Liberia
  "NL",  // Netherlands
  "CN",  // China
  "RU",  // Russia
  "GB",  // United Kingdom
  "US"   // United States of America
];
