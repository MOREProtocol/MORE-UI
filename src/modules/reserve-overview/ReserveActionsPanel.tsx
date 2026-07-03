import { API_ETH_MOCK_ADDRESS } from '@aave/contract-helpers';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { ActionSidePanel, ScopedTxContext } from 'src/components/ActionPanel/ActionSidePanel';
import { BorrowModalContent } from 'src/components/transactions/Borrow/BorrowModalContent';
import { ModalWrapper } from 'src/components/transactions/FlowCommons/ModalWrapper';
import { SupplyModalContentWrapper } from 'src/components/transactions/Supply/SupplyModalContent';
import { UserAuthenticated } from 'src/components/UserAuthenticated';
import { ConnectWalletButton } from 'src/components/WalletConnection/ConnectWalletButton';
import {
  ComputedReserveData,
  ExtendedFormattedUser,
  useAppDataContext,
} from 'src/hooks/app-data-provider/useAppDataProvider';
import { useModalContext } from 'src/hooks/useModal';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { GENERAL } from 'src/utils/mixPanelEvents';

/**
 * Inline connect prompt shown inside a panel tab while disconnected.
 * `UserAuthenticated` throws (invariant) when no user is loaded, so we guard on
 * `currentAccount` BEFORE rendering the tx tree.
 */
const InlineConnectPrompt = ({ action }: { action: 'supply' | 'borrow' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 2,
      py: 4,
    }}
  >
    <Typography variant="secondary14" color="text.secondary">
      {`Connect your wallet to ${action} ${action === 'supply' ? 'into' : 'from'} this market.`}
    </Typography>
    <ConnectWalletButton funnel={`Reserve panel: ${action}`} />
  </Box>
);

const InlineSupply = ({
  reserve,
  currentMarket,
}: {
  reserve: ComputedReserveData;
  currentMarket: string;
}) => {
  const { currentNetworkConfig } = useProtocolDataContext();
  // For wrapped-base-asset reserves (e.g. wFLOW) the user may supply either the
  // native base asset or the wrapped token — same choice the mobile fallback's
  // menu offers. Default to the wrapped underlying (previous desktop behaviour).
  const [supplyNative, setSupplyNative] = useState(false);
  const underlyingAsset =
    reserve.isWrappedBaseAsset && supplyNative
      ? API_ETH_MOCK_ADDRESS.toLowerCase()
      : reserve.underlyingAsset;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {reserve.isWrappedBaseAsset && (
        <ToggleButtonGroup
          value={supplyNative ? 'native' : 'wrapped'}
          exclusive
          onChange={(_e, next) => {
            if (next !== null) setSupplyNative(next === 'native');
          }}
          sx={{ width: '100%', '& .MuiToggleButton-root': { flex: 1 } }}
        >
          <ToggleButton value="native">{`Supply ${currentNetworkConfig.baseAssetSymbol}`}</ToggleButton>
          <ToggleButton value="wrapped">{`Supply ${reserve.symbol}`}</ToggleButton>
        </ToggleButtonGroup>
      )}
      {/* resetKey encodes the underlyingAsset, so switching the native/wrapped
          toggle re-inits the scoped tx context for the new asset. */}
      <ScopedTxContext
        resetKey={`supply:${underlyingAsset}`}
        onMount={(ctx) =>
          ctx.openSupply(underlyingAsset, currentMarket, reserve.name, 'reserve-panel', true)
        }
      >
        <ModalWrapper
          action="supply"
          title={<></>}
          hideTitleSymbol
          underlyingAsset={underlyingAsset}
        >
          {(params) => (
            <UserAuthenticated>
              {(user: ExtendedFormattedUser) => (
                <SupplyModalContentWrapper {...params} user={user} />
              )}
            </UserAuthenticated>
          )}
        </ModalWrapper>
      </ScopedTxContext>
    </Box>
  );
};

const InlineBorrow = ({
  underlyingAsset,
  currentMarket,
  name,
}: {
  underlyingAsset: string;
  currentMarket: string;
  name: string;
}) => {
  // Mirrors BorrowModal's unwrap toggle handling (wFLOW <-> FLOW), verbatim.
  const [borrowUnWrapped, setBorrowUnWrapped] = useState(true);
  const trackEvent = useRootStore((store) => store.trackEvent);

  const handleBorrowUnwrapped = (unwrapped: boolean) => {
    trackEvent(GENERAL.OPEN_MODAL, {
      modal: 'Unwrap Asset',
      asset: underlyingAsset,
      assetWrapped: unwrapped,
    });
    setBorrowUnWrapped(unwrapped);
  };

  return (
    <ScopedTxContext
      resetKey={`borrow:${underlyingAsset}`}
      onMount={(ctx) => ctx.openBorrow(underlyingAsset, currentMarket, name, 'reserve-panel', true)}
    >
      <ModalWrapper
        action="borrow"
        title={<></>}
        hideTitleSymbol
        underlyingAsset={underlyingAsset}
        keepWrappedSymbol={!borrowUnWrapped}
      >
        {(params) => (
          <UserAuthenticated>
            {(user: ExtendedFormattedUser) => (
              <BorrowModalContent
                {...params}
                user={user}
                unwrap={borrowUnWrapped}
                setUnwrap={handleBorrowUnwrapped}
              />
            )}
          </UserAuthenticated>
        )}
      </ModalWrapper>
    </ScopedTxContext>
  );
};

const EMODE_BORROW_DISABLED_MESSAGE =
  'In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets';

/**
 * Desktop counterpart to the MOST-mode-disabled `Tooltip` on `MobileTxButtons`.
 * The inline panel has no button to attach a hover tooltip to when the whole
 * Borrow tab content is swapped out, so we surface the same copy as a static
 * notice instead. Styling mirrors the warning tokens used elsewhere
 * (`--status-warning-bg` / `theme.palette.warning['100']`).
 */
const InlineBorrowDisabledNotice = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 1,
      bgcolor: 'rgba(245, 158, 11, 0.12)',
      color: 'warning.100',
      borderRadius: '16px',
      p: 4,
    }}
  >
    <Typography variant="secondary14" color="inherit">
      {EMODE_BORROW_DISABLED_MESSAGE}
    </Typography>
  </Box>
);

const InlineTx = ({
  action,
  reserve,
  currentMarket,
}: {
  action: 'supply' | 'borrow';
  reserve: ComputedReserveData;
  currentMarket: string;
}) => {
  const { currentAccount } = useWeb3Context();
  if (!currentAccount) {
    return <InlineConnectPrompt action={action} />;
  }
  return action === 'supply' ? (
    <InlineSupply reserve={reserve} currentMarket={currentMarket} />
  ) : (
    <InlineBorrow
      underlyingAsset={reserve.underlyingAsset}
      currentMarket={currentMarket}
      name={reserve.name}
    />
  );
};

/**
 * Fallback CTA buttons shown below `lg`. These call the GLOBAL modal context
 * (via `useModalContext()` resolved outside any `ScopedTxContext`) so behaviour
 * matches the previous page's Supply/Borrow buttons exactly, including the
 * wrapped-base-asset supply menu and the MOST-mode borrow-disabled rule.
 */
const MobileTxButtons = ({ reserve }: { reserve: ComputedReserveData }) => {
  const { user } = useAppDataContext();
  const { currentMarket, currentNetworkConfig } = useProtocolDataContext();
  const { openSupply, openBorrow } = useModalContext();
  const [supplyMenuAnchor, setSupplyMenuAnchor] = useState<null | HTMLElement>(null);

  const eModeBorrowDisabled = !!(
    user?.isInEmode && reserve.eModeCategoryId !== (user?.userEmodeCategoryId || 0)
  );
  const eModeTitle = eModeBorrowDisabled
    ? 'In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets'
    : '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {reserve.isWrappedBaseAsset ? (
        <>
          <Button
            variant="gradient"
            color="primary"
            fullWidth
            onClick={(e) => setSupplyMenuAnchor(e.currentTarget)}
          >
            Supply
          </Button>
          <Menu
            anchorEl={supplyMenuAnchor}
            open={Boolean(supplyMenuAnchor)}
            onClose={() => setSupplyMenuAnchor(null)}
            PaperProps={{ sx: { minWidth: 'unset', width: 'auto' } }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          >
            <MenuItem
              onClick={() => {
                openSupply(
                  API_ETH_MOCK_ADDRESS.toLowerCase(),
                  currentMarket,
                  reserve.name,
                  'reserve-page',
                  true
                );
                setSupplyMenuAnchor(null);
              }}
            >
              {`Supply ${currentNetworkConfig.baseAssetSymbol}`}
            </MenuItem>
            <MenuItem
              onClick={() => {
                openSupply(
                  reserve.underlyingAsset,
                  currentMarket,
                  reserve.name,
                  'reserve-page',
                  true
                );
                setSupplyMenuAnchor(null);
              }}
            >
              {`Supply ${reserve.symbol}`}
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button
          variant="gradient"
          color="primary"
          fullWidth
          onClick={() =>
            openSupply(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page', true)
          }
        >
          Supply
        </Button>
      )}
      {reserve.borrowingEnabled && (
        <Tooltip title={eModeTitle} disableHoverListener={!eModeBorrowDisabled} placement="top">
          <span>
            <Button
              variant="gradient"
              color="primary"
              fullWidth
              disabled={eModeBorrowDisabled}
              onClick={() =>
                openBorrow(
                  reserve.underlyingAsset,
                  currentMarket,
                  reserve.name,
                  'reserve-page',
                  true
                )
              }
            >
              Borrow
            </Button>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

export const ReserveActionsPanel = ({ underlyingAsset }: { underlyingAsset: string }) => {
  const { reserves, user } = useAppDataContext();
  const { currentMarket } = useProtocolDataContext();

  const reserve = reserves.find((r) => r.underlyingAsset === underlyingAsset) as
    | ComputedReserveData
    | undefined;

  if (!reserve) return null;

  // Same MOST-mode guard as `MobileTxButtons`, reusing the same `user`/`reserve`
  // fields sourced from `useAppDataContext()`.
  const eModeBorrowDisabled = !!(
    user?.isInEmode && reserve.eModeCategoryId !== (user?.userEmodeCategoryId || 0)
  );

  const tabs = [
    {
      key: 'supply',
      label: 'Supply',
      content: <InlineTx action="supply" reserve={reserve} currentMarket={currentMarket} />,
    },
    ...(reserve.borrowingEnabled
      ? [
          {
            key: 'borrow',
            label: 'Borrow',
            content: eModeBorrowDisabled ? (
              <InlineBorrowDisabledNotice />
            ) : (
              <InlineTx action="borrow" reserve={reserve} currentMarket={currentMarket} />
            ),
          },
        ]
      : []),
  ];

  return <ActionSidePanel tabs={tabs} mobileFallback={<MobileTxButtons reserve={reserve} />} />;
};
