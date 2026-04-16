import {
  asSdkClient,
  getAsyncRequestStatusLabel,
  LZ_TIMEOUTS,
} from '@oydual31/more-vaults-sdk/viem';
import { useEffect } from 'react';
import { OmniRequestStatus, useOmniRequestStore } from 'src/store/omniRequestStore';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { createPublicClient, fallback, http } from 'viem';

const TERMINAL: OmniRequestStatus[] = ['completed', 'refunded'];

export function useGlobalOmniPolling() {
  const omniRequests = useOmniRequestStore((s) => s.omniRequests);
  const updateOmniRequestStatus = useOmniRequestStore((s) => s.updateOmniRequestStatus);

  const active = Object.values(omniRequests).filter((r) => !TERMINAL.includes(r.status));

  useEffect(() => {
    if (active.length === 0) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await Promise.allSettled(
        active.map(async (req) => {
          try {
            const netConfig = networkConfigs[req.chainId];
            if (!netConfig) return;
            const client = createPublicClient({
              transport: fallback(netConfig.publicJsonRPCUrl.map((url) => http(url))),
            });
            const label = await getAsyncRequestStatusLabel(
              asSdkClient(client),
              req.vaultId as `0x${string}`,
              req.guid as `0x${string}`
            );
            if (!cancelled) updateOmniRequestStatus(req.guid, label.status);
          } catch (e) {
            console.warn('[OmniPolling] poll error for guid', req.guid, e);
          }
        })
      );
    };

    poll();
    const interval = setInterval(poll, LZ_TIMEOUTS.POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length, updateOmniRequestStatus]);
}
