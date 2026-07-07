import { Box, ToggleButton, ToggleButtonGroup, useMediaQuery, useTheme } from '@mui/material';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { HEADER_HEIGHT } from 'src/layouts/AppHeader';
import {
  ModalArgsType,
  ModalContextProvider,
  ModalContextType,
  useModalContext,
} from 'src/hooks/useModal';

export interface ActionTab {
  key: string;
  label: string;
  content: ReactNode;
}

interface ActionSidePanelProps {
  tabs: ActionTab[];
  initialTab?: string;
  onTabChange?: (key: string) => void;
  mobileFallback: ReactNode;
}

/**
 * Inline right-rail action panel used on the vault / market detail pages.
 *
 * On lg+ viewports it renders a sticky card with a segmented two-tab control
 * (Task 4 `ToggleButton` theme styling) and the active tab's content below.
 * Below lg it renders `mobileFallback` instead (typically CTA buttons that
 * open the existing global modals).
 *
 * This component holds NO transaction logic. Tabs pass their own content in;
 * transaction wiring lives in `ScopedTxContext` (below) + the caller.
 *
 * SSR: `useMediaQuery(breakpoints.up('lg'))` with default options returns
 * `false` on the server and on the first client render, then updates in an
 * effect after hydration. So `mobileFallback` is server-rendered and swaps to
 * the desktop panel on lg+ once hydrated. First client render matches the
 * server render, so there is no hydration mismatch (we intentionally do NOT
 * pass `noSsr`, which would force a matchMedia read before paint).
 */
export const ActionSidePanel = ({
  tabs,
  initialTab,
  onTabChange,
  mobileFallback,
}: ActionSidePanelProps) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [activeTab, setActiveTab] = useState<string | undefined>(initialTab ?? tabs[0]?.key);

  if (!isDesktop) {
    return <>{mobileFallback}</>;
  }

  const handleChange = (_event: React.MouseEvent<HTMLElement>, next: string | null) => {
    if (!next || next === activeTab) return;
    setActiveTab(next);
    onTabChange?.(next);
  };

  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  return (
    <Box
      component="aside"
      sx={{
        position: 'sticky',
        top: `${HEADER_HEIGHT + 20}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        p: '22px',
        borderRadius: '24px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: (t) =>
          t.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(20, 15, 8, 0.06)',
      }}
    >
      <ToggleButtonGroup
        value={activeTab}
        onChange={handleChange}
        exclusive
        sx={{
          width: '100%',
          '& .MuiToggleButton-root': {
            flex: 1,
          },
        }}
      >
        {tabs.map((tab) => (
          <ToggleButton key={tab.key} value={tab.key}>
            {tab.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box>{active?.content}</Box>
    </Box>
  );
};

interface ScopedTxInitProps {
  children: ReactNode;
  onMount: (ctx: ModalContextType<ModalArgsType>) => void;
  resetKey?: string;
}

/**
 * Bridges the panel-local `ModalContextProvider` to the caller: it hands the
 * scoped context to `onMount` so the caller can open the desired inline action
 * (e.g. `ctx.openSupply(...)`).
 *
 * Re-open semantics — `onMount` is (re)invoked when:
 *  1. the panel first mounts (`initialized` is false), or
 *  2. inline content calls `ctx.close()` (e.g. after a successful tx), which
 *     resets the local state and sets `type` back to `undefined`. Because the
 *     panel stays mounted, we re-open the action so the form is immediately
 *     usable again instead of showing an empty context, or
 *  3. the caller switches tabs / navigates to a new asset (`resetKey` changes)
 *     — we reset then re-open (see below).
 *
 * `type`-triggered re-opens are guarded to `type === undefined` so we never
 * clobber an action that is mid-flight. `ctx` and `onMount` are read through
 * refs so a fresh render closure never, by itself, re-triggers the action; the
 * effect depends only on `[type, resetKey]`.
 *
 * resetKey change — reset FIRST, then re-open: a prior tx on this scoped
 * context can leave `mainTxState`/`approvalTxState` populated (e.g. a success
 * screen the user never dismissed). `onMount` (openSupply/openBorrow) only sets
 * `type`+`args`, so that stale success state would leak into the new asset's
 * form. We call `ctx.close()` first — it resets ALL tx state (main/approval/gas/
 * error) and clears `type` — then immediately re-open for the new `resetKey`.
 * Both state updates batch into a single render: `type` ends defined again and
 * `resetKey` is unchanged from what this effect run already saw, so the
 * `[type, resetKey]` effect does not re-fire (no loop, no double onMount). We
 * keep the explicit `onMount` call rather than relying purely on a
 * close()→`type === undefined`→re-run chain, because when `type` is already
 * `undefined` at navigation time `setType(undefined)` is a no-op that would not
 * re-run the effect — leaving the new tab uninitialised.
 */
const ScopedTxInit = ({ children, onMount, resetKey }: ScopedTxInitProps) => {
  const ctx = useModalContext();
  const { type } = ctx;

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;

  const initializedRef = useRef(false);
  const lastKeyRef = useRef<string | undefined>(resetKey);

  useEffect(() => {
    const tabChanged = initializedRef.current && lastKeyRef.current !== resetKey;
    if (tabChanged) {
      lastKeyRef.current = resetKey;
      ctxRef.current.close();
      onMountRef.current(ctxRef.current);
    } else if (!initializedRef.current || type === undefined) {
      initializedRef.current = true;
      lastKeyRef.current = resetKey;
      onMountRef.current(ctxRef.current);
    }
    // ctx/onMount are accessed via refs on purpose (see doc comment); the
    // effect must fire only on active-action or active-tab changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, resetKey]);

  return <>{children}</>;
};

/**
 * Mounts a fresh, panel-local `ModalContextProvider` so inline-rendered
 * `*ModalContent` components read this isolated state and never touch the
 * globally-mounted modals in `_app`. Nearest-provider wins, so the same
 * `useModalContext()` hook resolves to this scoped instance inside `children`.
 */
export const ScopedTxContext = ({
  children,
  onMount,
  resetKey,
}: {
  children: ReactNode;
  onMount: (ctx: ModalContextType<ModalArgsType>) => void;
  resetKey?: string;
}) => (
  <ModalContextProvider>
    <ScopedTxInit onMount={onMount} resetKey={resetKey}>
      {children}
    </ScopedTxInit>
  </ModalContextProvider>
);
