import { useCallback } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import {
  depositAsync,
  getVaultStatus,
  quoteLzFee,
  redeemAsync,
} from '@oydual31/more-vaults-sdk/viem';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asSdkClient = (c: unknown) => c as any;

export const useOmniVaultActions = (
  vaultAddress: string | null,
  hubChainId: number
) => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: hubChainId });

  const omniDeposit = useCallback(
    async (amountInWei: string): Promise<{ txHash: string; guid?: string }> => {
      if (!vaultAddress) throw new Error('No vault address');
      if (!walletClient) throw new Error('No wallet client');
      if (!publicClient) throw new Error('No public client');

      const vault = vaultAddress as `0x${string}`;
      const pc = asSdkClient(publicClient);
      const wc = asSdkClient(walletClient);
      const status = await getVaultStatus(pc, vault);
      const lzFee = await quoteLzFee(pc, vault);
      const feeWithBuffer = (lzFee * BigInt(101)) / BigInt(100);

      const { txHash, guid } = await depositAsync(
        wc,
        pc,
        { vault, escrow: status.escrow },
        BigInt(amountInWei),
        walletClient.account.address,
        feeWithBuffer,
      );

      return { txHash, guid };
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
      const wc = asSdkClient(walletClient);
      const status = await getVaultStatus(pc, vault);
      const lzFee = await quoteLzFee(pc, vault);
      const feeWithBuffer = (lzFee * BigInt(101)) / BigInt(100);

      const owner = walletClient.account.address;
      const { txHash, guid } = await redeemAsync(
        wc,
        pc,
        { vault, escrow: status.escrow },
        BigInt(sharesInWei),
        owner,
        owner,
        feeWithBuffer,
      );

      return { txHash, guid };
    },
    [vaultAddress, walletClient, publicClient]
  );

  return { omniDeposit, omniRedeem };
};
