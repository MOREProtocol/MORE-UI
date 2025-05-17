// import { getDefaultConfig } from '@rainbow-me/rainbowkit';
// import {
//   metaMaskWallet,
//   coinbaseWallet,
//   walletConnectWallet,
//   safeWallet
// } from "@rainbow-me/rainbowkit/wallets";
import { flowMainnet, flowTestnet } from 'viem/chains';
import { createConfig, CreateConnectorFn, http, injected } from 'wagmi';
import { walletConnect, metaMask, safe } from 'wagmi/connectors';


// export const config = getDefaultConfig({
//   appName: 'MORE Markets',
//   projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
//   chains: [flowMainnet, flowTestnet],
//   wallets: [
//     {
//       groupName: "Suggested",
//       wallets: [
//         metaMaskWallet,
//         coinbaseWallet,
//         walletConnectWallet,
//         safeWallet
//       ],
//     },
//   ],
//   ssr: true
// });

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

let connectors: CreateConnectorFn[] = [safe(), metaMask(), injected()];

if (WALLETCONNECT_PROJECT_ID) {
  // A WalletConnect ID is provided so we add the Connector for testing purposes
  connectors = [...connectors, walletConnect({ projectId: WALLETCONNECT_PROJECT_ID })];
}

export const config = createConfig({
  chains: [flowMainnet, flowTestnet],
  transports: {
    [flowMainnet.id]: http(),
    [flowTestnet.id]: http(),
  },
  connectors: connectors,
  ssr: true
});