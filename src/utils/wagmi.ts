import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  safeWallet
} from "@rainbow-me/rainbowkit/wallets";
import { flowMainnet, flowTestnet } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'MORE Markets',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: [flowMainnet, flowTestnet],
  wallets: [
    {
      groupName: "Suggested",
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
        safeWallet
      ],
    },
  ],
  ssr: true
});
