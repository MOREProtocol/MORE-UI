// Lightweight in-memory registry to map vault IDs to their factory-specific metadata
// Scope by chainId to avoid collisions across networks

import type { SpokeVaultInfo } from './types';

export type VaultFactoryInfo = {
  subgraphUrl?: string;
  oracleAddress?: string;
  isOmniHub?: boolean;
  isOmniSpoke?: boolean;
  hubChainId?: number;
  hubAddress?: string;
  spokeVaults?: SpokeVaultInfo[];
};

const registry = new Map<number, Map<string, VaultFactoryInfo>>();

const ensureChainMap = (chainId: number) => {
  if (!registry.has(chainId)) {
    registry.set(chainId, new Map());
  }
  return registry.get(chainId)!;
};

export const registerVaultFactoryInfo = (
  chainId: number,
  vaultId: string,
  info: VaultFactoryInfo
) => {
  if (!chainId || !vaultId) return;
  const chainMap = ensureChainMap(chainId);
  const key = (vaultId || '').toLowerCase();
  const existing = chainMap.get(key) || {};
  chainMap.set(key, { ...existing, ...info });
};

export const getVaultFactoryInfo = (
  chainId: number,
  vaultId: string
): VaultFactoryInfo | undefined => {
  if (!chainId || !vaultId) return undefined;
  const chainMap = registry.get(chainId);
  if (!chainMap) return undefined;
  return chainMap.get((vaultId || '').toLowerCase());
};

export const markVaultAsOmniHub = (
  chainId: number,
  vaultId: string,
  spokeVaults: SpokeVaultInfo[]
) => {
  registerVaultFactoryInfo(chainId, vaultId, { isOmniHub: true, spokeVaults });
};

export const markVaultAsOmniSpoke = (
  chainId: number,
  vaultId: string,
  hubChainId: number,
  hubAddress: string
) => {
  registerVaultFactoryInfo(chainId, vaultId, { isOmniSpoke: true, hubChainId, hubAddress });
};

export const isOmniHubVault = (chainId: number, vaultId: string): boolean => {
  return getVaultFactoryInfo(chainId, vaultId)?.isOmniHub === true;
};

export const isOmniSpokeVault = (chainId: number, vaultId: string): boolean => {
  return getVaultFactoryInfo(chainId, vaultId)?.isOmniSpoke === true;
};

/** Returns all unique oracle addresses registered for a given chain (from omni vault discovery). */
export const getOracleAddressesForChain = (chainId: number): string[] => {
  const chainMap = registry.get(chainId);
  if (!chainMap) return [];
  const oracles = new Set<string>();
  for (const info of chainMap.values()) {
    if (info.oracleAddress) oracles.add(info.oracleAddress.toLowerCase());
  }
  return Array.from(oracles);
};


