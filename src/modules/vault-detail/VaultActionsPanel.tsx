import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { type InboundRouteWithBalance } from '@oydual31/more-vaults-sdk/viem';
import { ReactNode, useEffect, useState } from 'react';
import { ActionSidePanel } from 'src/components/ActionPanel/ActionSidePanel';

import { VaultDepositContent } from './VaultDepositModal';

interface VaultActionsPanelProps {
  whitelistAmount?: string;
  inboundRoutes: InboundRouteWithBalance[];
  mobileFallback: ReactNode;
  /**
   * Opens the shared `VaultRedeemModal` owned by `VaultDetail` — the real,
   * omni-capable redeem flow (`requestRedeem`). The desktop Withdraw tab reuses
   * exactly the same open mechanism as the mobile fallback rather than mounting
   * a separate (dead) withdraw form.
   */
  onOpenRedeem: () => void;
  /**
   * Whether the vault's core data (asset symbol / depositable assets) is loaded.
   * The extracted deposit content mounts eagerly (it is "always open"), so we
   * must not render it until the asset symbol has resolved — otherwise
   * `AssetInput` reads `asset.symbol` on a not-yet-selected asset and throws.
   * This only gates the initial paint; it does NOT touch the content's own
   * transaction logic.
   */
  ready?: boolean;
}

const LoadingContent = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
    <CircularProgress size={24} />
  </Box>
);

// Inline right-rail action panel for the vault detail page. Unlike the market
// panel, the vault Deposit content holds ALL its own state (see Task 15
// extraction) — so there is NO ScopedTxContext here: the content is mounted
// directly, "always open".
//
// Close/reset semantics: the deposit content renders a post-tx "Close" button
// (and its OFT-compose stepper has its own onClose) that calls `setIsOpen(false)`.
// We hold a real `depositOpen` boolean and pass it as `isOpen` so that flipping
// it to false actually runs the content's `isOpen === false` cleanup effect
// (wallet chain switch-back after a cross-chain deposit, flow/orphan-scan state
// reset). An effect then bumps an "instance" key to remount a brand-new content
// (resetting all internal state) and re-opens it — the same end result as
// closing and reopening a modal, but without an actual modal.
//
// Withdraw: withdrawals are processed as redeem requests, so the tab shows a
// slim prompt + a full-width CTA that opens the existing `VaultRedeemModal`
// (via `onOpenRedeem`) — the same omni-capable flow the mobile fallback uses.
// We do NOT mount the legacy `VaultWithdrawContent` (dead `requestWithdraw`).
//
// Estimated-returns box (mockup): OMITTED. The mockup computes per-month /
// per-year figures from the entered amount, but `VaultDepositContent` keeps its
// `amount` state internal and does not expose it. Per the brief, we do NOT
// plumb new state through the content components, so the box is skipped rather
// than shown empty.
export const VaultActionsPanel = ({
  whitelistAmount,
  inboundRoutes,
  mobileFallback,
  onOpenRedeem,
  ready = true,
}: VaultActionsPanelProps) => {
  const [depositInstance, setDepositInstance] = useState(0);
  const [depositOpen, setDepositOpen] = useState(true);

  // When the deposit content requests close (`setIsOpen(false)`), `depositOpen`
  // flips to false — the render commits with `isOpen={false}` so the content's
  // cleanup effect runs — then this effect remounts a fresh instance (bump key)
  // and re-opens it. Child effects run before parent effects, so the cleanup
  // fires before the remount.
  useEffect(() => {
    if (!depositOpen) {
      setDepositInstance((k) => k + 1);
      setDepositOpen(true);
    }
  }, [depositOpen]);

  const tabs = [
    {
      key: 'deposit',
      label: 'Deposit',
      content: ready ? (
        <VaultDepositContent
          key={depositInstance}
          isOpen={depositOpen}
          setIsOpen={(open) => {
            if (!open) setDepositOpen(false);
          }}
          whitelistAmount={whitelistAmount}
          inboundRoutes={inboundRoutes}
          hideTitle
        />
      ) : (
        <LoadingContent />
      ),
    },
    {
      key: 'withdraw',
      label: 'Withdraw',
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
            Withdrawals are processed as redeem requests.
          </Typography>
          <Button
            variant="gradient"
            fullWidth
            size="large"
            onClick={onOpenRedeem}
            sx={{ minHeight: '44px' }}
          >
            Withdraw
          </Button>
        </Box>
      ),
    },
  ];

  return <ActionSidePanel tabs={tabs} mobileFallback={mobileFallback} />;
};
