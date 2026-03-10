import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  safeWallet
} from "@rainbow-me/rainbowkit/wallets";
import { fallback, http } from 'viem';
import { flowMainnet, flowTestnet, mainnet, base, arbitrum } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'MORE Markets',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: [flowMainnet, flowTestnet, mainnet, base, arbitrum],
  transports: {
    [flowMainnet.id]: fallback([
      http('https://mainnet.evm.nodes.onflow.org'),
    ]),
    [flowTestnet.id]: fallback([
      http('https://testnet.evm.nodes.onflow.org'),
    ]),
    [mainnet.id]: fallback([
      http('https://eth.llamarpc.com'),
      http('https://0xrpc.io/eth'),
      http('https://eth-mainnet.public.blastapi.io'),
      http('https://mainnet.gateway.tenderly.co'),
      http('https://eth.drpc.org'),
      http('https://ethereum.publicnode.com'),
    ]),
    [base.id]: fallback([
      http('https://base.rpc.subquery.network/public'),
      http('https://base.rpc.blxrbdn.com'),
      http('https://gateway.tenderly.co/public/base'),
      http('https://1rpc.io/base'),
      http('https://base-rpc.publicnode.com'),
      http('https://base.llamarpc.com'),
      http('https://base.drpc.org'),
      http('https://mainnet.base.org'),
    ]),
    [arbitrum.id]: fallback([
      http('https://arbitrum.public.blockpi.network/v1/rpc/public'),
      http('https://public-arb-mainnet.fastnode.io'),
      http('https://arbitrum-one-rpc.publicnode.com'),
      http('https://arbitrum.publicnode.com'),
    ]),
  },
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
