import { useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { asSdkClient, getAsyncRequestStatusLabel } from '@oydual31/more-vaults-sdk/viem';
import { OmniRequestStatus, useOmniRequestStore } from 'src/store/omniRequestStore';
import { networkConfigs } from 'src/ui-config/networksConfig';

const TERMINAL: OmniRequestStatus[] = ['completed', 'refunded'];
const POLL_INTERVAL_MS = 15000;

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
            const rpcUrl = netConfig.privateJsonRPCUrl || netConfig.publicJsonRPCUrl[0];
            const client = createPublicClient({ transport: http(rpcUrl) });
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
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length, updateOmniRequestStatus]);
}
