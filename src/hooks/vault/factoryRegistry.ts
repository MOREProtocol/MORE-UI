// Lightweight in-memory registry to map vault IDs to their factory-specific metadata
// Scope by chainId to avoid collisions across networks

export type VaultFactoryInfo = {
  subgraphUrl?: string;
  oracleAddress?: string;
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


