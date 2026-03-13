import { useCallback } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import {
  asSdkClient,
  smartDeposit,
  smartRedeem,
} from '@oydual31/more-vaults-sdk/viem';

export const useOmniVaultActions = (
  vaultAddress: string | null,
  hubChainId: number
) => {
  const { data: walletClient } = useWalletClient({ chainId: hubChainId });
  const publicClient = usePublicClient({ chainId: hubChainId });

  const omniDeposit = useCallback(
    async (amountInWei: string): Promise<{ txHash: string; guid?: string }> => {
      if (!vaultAddress) throw new Error('No vault address');
      if (!walletClient) throw new Error('No wallet client');
      if (!publicClient) throw new Error('No public client');

      const vault = vaultAddress as `0x${string}`;
      const pc = asSdkClient(publicClient);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wc = walletClient as any;

      const result = await smartDeposit(
        wc,
        pc,
        { vault },
        BigInt(amountInWei),
        walletClient.account.address,
      );

      return { txHash: result.txHash, guid: 'guid' in result ? result.guid : undefined };
    },
    [vaultAddress, walletClient, publicClient]
  );

  const omniRedeem = useCallback(
    async (sharesInWei: string): Promise<{ txHash: string; guid?: string }> => {
      if (!vaultAddress) throw new Error('No vault address');
      if (!walletClient) throw new Error('No wallet client');
      if (!publicClient) throw new Error('No public client');

      const vault = vaultAddress as `0x${string}`;
      const pc = asSdkClient(publicClient);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wc = walletClient as any;

      const owner = walletClient.account.address;
      const result = await smartRedeem(
        wc,
        pc,
        { vault },
        BigInt(sharesInWei),
        owner,
        owner,
      );

      return { txHash: result.txHash, guid: 'guid' in result ? result.guid : undefined };
    },
    [vaultAddress, walletClient, publicClient]
  );

  return { omniDeposit, omniRedeem };
};
