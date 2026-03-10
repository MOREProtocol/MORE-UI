import { useCallback } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import {
  asSdkClient,
  depositAsync,
  quoteLzFee,
  redeemAsync,
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
      const lzFee = await quoteLzFee(pc, vault);
      const feeWithBuffer = (lzFee * BigInt(101)) / BigInt(100);

      const { txHash, guid } = await depositAsync(
        wc,
        pc,
        { vault, hubChainId },
        BigInt(amountInWei),
        walletClient.account.address,
        feeWithBuffer,
      );

      return { txHash, guid };
    },
    [vaultAddress, walletClient, publicClient, hubChainId]
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
      const lzFee = await quoteLzFee(pc, vault);
      const feeWithBuffer = (lzFee * BigInt(101)) / BigInt(100);

      const owner = walletClient.account.address;
      const { txHash, guid } = await redeemAsync(
        wc,
        pc,
        { vault, hubChainId },
        BigInt(sharesInWei),
        owner,
        owner,
        feeWithBuffer,
      );

      return { txHash, guid };
    },
    [vaultAddress, walletClient, publicClient, hubChainId]
  );

  return { omniDeposit, omniRedeem };
};
