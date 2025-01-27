import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@mui/material';
import { Trans } from '@lingui/macro';
import { useRootStore } from 'src/store/root';
import { AUTH } from 'src/utils/mixPanelEvents';

export const ConnectWalletButton = () => {
  const trackEvent = useRootStore((store) => store.trackEvent);

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        return (
          <div
            {...(!mounted && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!(account && chain && mounted)) {
                return (
                  <Button
                    variant="gradient"
                    onClick={() => {
                      trackEvent(AUTH.CONNECT_WALLET, { funnel: 'wagmi' });
                      openConnectModal();
                    }}
                  >
                    <Trans>Connect wallet</Trans>
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="text-lg px-5 py-2 wallet-networks ml-3"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex">
                  <Button className="flex wallet-connected" type="button" onClick={openChainModal}>
                    <div className="flex items-center !rounded-[8px] text-[16px] px-5 py-3 wallet-networks wallet-menu bg-[#212121] hover:bg-[#171717]">
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 22,
                            height: 25,
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginRight: 8,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 22, height: 22 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </div>
                  </Button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="text-lg !text-[16px] px-5 py-2 wallet-networks ml-3 hover:bg-[#434343]"
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
