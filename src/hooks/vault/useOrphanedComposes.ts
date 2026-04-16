import { useState, useCallback, useRef } from 'react';
import { getAddress } from 'viem';
import type { PublicClient } from 'viem';
import { LZ_ENDPOINT_ABI, OMNI_FACTORY_ADDRESS, type ComposeData } from '@oydual31/more-vaults-sdk/viem';

/** Standard LZ Endpoint V2 (most EVM chains) */
const LZ_ENDPOINT_DEFAULT = '0x1a44076050125825900e736c501f859c50fe728c' as const;

/** Chain-specific LZ Endpoint overrides — mirrors the SDK's LZ_ENDPOINT_BY_CHAIN */
const LZ_ENDPOINT_BY_CHAIN: Partial<Record<number, `0x${string}`>> = {
  747: '0xcb566e3B6934Fa77258d68ea18E931fa75e1aaAa', // Flow EVM Mainnet
};

function getLzEndpoint(chainId: number): `0x${string}` {
  return LZ_ENDPOINT_BY_CHAIN[chainId] ?? LZ_ENDPOINT_DEFAULT;
}

const EMPTY_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
const RECEIVED_HASH = '0x0000000000000000000000000000000000000000000000000000000000000001' as const;

export const ORPHAN_SCAN_WINDOW = BigInt(100_000);
/** Chunk size for getLogs to avoid RPC range limits */
const CHUNK_SIZE = BigInt(500);

const FACTORY_COMPOSER_ABI = [
  {
    type: 'function' as const,
    name: 'vaultComposer',
    inputs: [{ name: '_vault', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view' as const,
  },
] as const;

/**
 * Scan the LZ Endpoint on the hub chain for ComposeSent events that:
 *  1. Were sent to the vault's MoreVaultsComposer
 *  2. Contain the user's address in the message body
 *  3. Are still pending in composeQueue (not empty, not already delivered)
 *
 * @param toBlock  End of scan range (defaults to latest block). Pass `oldestBlockSearched - 1n`
 *                 to extend the search further back in history.
 * @returns        Found orphaned composes and the startBlock of the window scanned.
 */
export async function scanOrphanedComposes(
  hubPublicClient: PublicClient,
  vaultAddress: `0x${string}`,
  userAddress: `0x${string}`,
  hubChainId: number,
  isCancelled: () => boolean = () => false,
  toBlock?: bigint,
): Promise<{ orphans: ComposeData[]; startBlock: bigint; endBlock: bigint }> {
  // 1. Resolve composer address from factory
  let composerAddress: `0x${string}`;
  try {
    composerAddress = await hubPublicClient.readContract({
      address: OMNI_FACTORY_ADDRESS,
      abi: FACTORY_COMPOSER_ABI,
      functionName: 'vaultComposer',
      args: [vaultAddress],
    }) as `0x${string}`;
  } catch {
    return { orphans: [], startBlock: BigInt(0), endBlock: BigInt(0) };
  }

  const zeroAddr = '0x0000000000000000000000000000000000000000';
  if (!composerAddress || composerAddress.toLowerCase() === zeroAddr) return { orphans: [], startBlock: BigInt(0), endBlock: BigInt(0) };

  const composerChecksummed = getAddress(composerAddress);
  const receiverNeedle = getAddress(userAddress).slice(2).toLowerCase();
  const endpoint = getLzEndpoint(hubChainId);

  // 2. Determine block range
  let endBlock: bigint;
  try {
    endBlock = toBlock ?? await hubPublicClient.getBlockNumber();
  } catch {
    return { orphans: [], startBlock: BigInt(0), endBlock: BigInt(0) };
  }
  const startBlock = endBlock > ORPHAN_SCAN_WINDOW ? endBlock - ORPHAN_SCAN_WINDOW : BigInt(0);

  const orphans: ComposeData[] = [];
  let cursor = startBlock;

  // 3. Scan in 500-block chunks
  while (cursor <= endBlock) {
    if (isCancelled()) break;

    const chunkEnd = cursor + CHUNK_SIZE > endBlock ? endBlock : cursor + CHUNK_SIZE;

    try {
      const logs = await hubPublicClient.getLogs({
        address: endpoint,
        events: [
          {
            type: 'event',
            name: 'ComposeSent',
            inputs: [
              { name: 'from', type: 'address', indexed: false },
              { name: 'to', type: 'address', indexed: false },
              { name: 'guid', type: 'bytes32', indexed: false },
              { name: 'index', type: 'uint16', indexed: false },
              { name: 'message', type: 'bytes', indexed: false },
            ],
          },
        ],
        fromBlock: cursor,
        toBlock: chunkEnd,
      });

      for (const log of logs) {
        const args = log.args as {
          from?: `0x${string}`;
          to?: `0x${string}`;
          guid?: `0x${string}`;
          index?: number;
          message?: `0x${string}`;
        };

        if (!args.to || getAddress(args.to) !== composerChecksummed) continue;
        if (!args.message?.toLowerCase().includes(receiverNeedle)) continue;
        if (!args.from || !args.guid || !args.message) continue;

        try {
          const hash = await hubPublicClient.readContract({
            address: endpoint,
            abi: LZ_ENDPOINT_ABI,
            functionName: 'composeQueue',
            args: [
              getAddress(args.from) as `0x${string}`,
              composerChecksummed as `0x${string}`,
              args.guid,
              args.index ?? 0,
            ],
          }) as `0x${string}`;

          if (hash !== EMPTY_HASH && hash !== RECEIVED_HASH) {
            orphans.push({
              endpoint,
              from: getAddress(args.from) as `0x${string}`,
              to: composerChecksummed as `0x${string}`,
              guid: args.guid,
              index: args.index ?? 0,
              message: args.message,
              isStargate: true,
              hubChainId,
              hubBlockStart: cursor,
            });
          }
        } catch {
          // composeQueue call failed — skip this event
        }
      }
    } catch {
      // getLogs failed for this chunk — skip and continue
    }

    cursor = chunkEnd + BigInt(1);
  }

  return { orphans, startBlock, endBlock };
}

export function useOrphanedComposes() {
  const [orphans, setOrphans] = useState<ComposeData[]>([]);
  const [scanning, setScanning] = useState(false);
  const [oldestBlockSearched, setOldestBlockSearched] = useState<bigint | null>(null);
  const [oldestBlockDate, setOldestBlockDate] = useState<Date | null>(null);

  const cancelledRef = useRef(false);
  // Stored to allow scanMore() without re-passing params
  const clientRef = useRef<PublicClient | null>(null);
  const paramsRef = useRef<{ vaultAddress: string; userAddress: string; hubChainId: number } | null>(null);
  // Counts completed scans so totalBlocksScanned = scanCount * ORPHAN_SCAN_WINDOW
  const scanCountRef = useRef(0);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setScanning(false);
  }, []);

  const _runScan = useCallback(async (
    hubPublicClient: PublicClient,
    vaultAddress: string,
    userAddress: string,
    hubChainId: number,
    toBlock: bigint | undefined,
    append: boolean,
  ) => {
    cancelledRef.current = false;
    clientRef.current = hubPublicClient;
    paramsRef.current = { vaultAddress, userAddress, hubChainId };
    setScanning(true);
    try {
      const { orphans: found, startBlock } = await scanOrphanedComposes(
        hubPublicClient,
        vaultAddress as `0x${string}`,
        userAddress as `0x${string}`,
        hubChainId,
        () => cancelledRef.current,
        toBlock,
      );
      if (cancelledRef.current) return;
      if (!append) {
        scanCountRef.current = 1;
        setOrphans(found);
      } else {
        scanCountRef.current += 1;
        setOrphans((prev) => [...prev, ...found]);
      }
      setOldestBlockSearched(startBlock);
      // Fetch block timestamp so the view can show a human-readable date
      try {
        const block = await hubPublicClient.getBlock({ blockNumber: startBlock });
        if (!cancelledRef.current) {
          setOldestBlockDate(new Date(Number(block.timestamp) * 1000));
        }
      } catch { /* non-critical — date display is optional */ }
    } catch (err) {
      if (!cancelledRef.current) {
        console.error('[useOrphanedComposes] scan failed:', err);
        if (!append) setOrphans([]);
      }
    } finally {
      if (!cancelledRef.current) setScanning(false);
    }
  }, []);

  const scan = useCallback(async (
    hubPublicClient: PublicClient,
    vaultAddress: string,
    userAddress: string,
    hubChainId: number,
  ) => {
    scanCountRef.current = 0;
    setOldestBlockSearched(null);
    setOldestBlockDate(null);
    await _runScan(hubPublicClient, vaultAddress, userAddress, hubChainId, undefined, false);
  }, [_runScan]);

  /** Continue the scan further back in history from where the last scan stopped. */
  const scanMore = useCallback(async () => {
    if (!clientRef.current || !paramsRef.current || oldestBlockSearched === null || oldestBlockSearched === BigInt(0)) return;
    const { vaultAddress, userAddress, hubChainId } = paramsRef.current;
    await _runScan(
      clientRef.current,
      vaultAddress,
      userAddress,
      hubChainId,
      oldestBlockSearched - BigInt(1),
      true, // append to existing results
    );
  }, [oldestBlockSearched, _runScan]);

  const clear = useCallback(() => setOrphans([]), []);
  const removeByGuid = useCallback((guid: string) => {
    setOrphans((prev) => prev.filter((o) => o.guid !== guid));
  }, []);

  const totalBlocksScanned =
    scanCountRef.current > 0 ? BigInt(scanCountRef.current) * ORPHAN_SCAN_WINDOW : null;

  return {
    orphans,
    scanning,
    oldestBlockSearched,
    oldestBlockDate,
    totalBlocksScanned,
    scan,
    scanMore,
    cancel,
    clear,
    removeByGuid,
  };
}
