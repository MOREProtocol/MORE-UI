import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Flow types that need multi-step persistence */
export type OmniFlowType = 'stargate-compose' | 'spoke-redeem';

export type StargateComposeStep =
  | 'idle'
  | 'waiting-compose'
  | 'ready-to-execute'
  | 'executing'
  | 'done';

export type SpokeRedeemStep =
  | 'loading'
  | 'ready'
  | 'bridging_shares'
  | 'waiting_shares'
  | 'switch_to_hub'
  | 'redeeming'
  | 'waiting_redeem'
  | 'bridging_assets'
  | 'waiting_assets'
  | 'done';

export interface StargateComposeFlow {
  type: 'stargate-compose';
  step: StargateComposeStep;
  vaultId: string;
  hubChainId: number;
  spokeChainId: number;
  spokeTxHash: string | null;
  /** Serialised ComposeData fields for recovery */
  composeEndpoint: string | null;
  composeFrom: string | null;
  composeTo: string | null;
  composeGuid: string | null;
  composeIndex: number | null;
  composeMessage: string | null;
  composeTxHash: string | null;
  omniGuid: string | null;
}

export interface SpokeRedeemFlow {
  type: 'spoke-redeem';
  step: SpokeRedeemStep;
  vaultId: string;
  hubChainId: number;
  spokeChainId: number;
  shareBridgeTxHash: string | null;
  redeemTxHash: string | null;
  redeemGuid: string | null;
  assetBridgeTxHash: string | null;
  assetsReceived: string; // bigint as string for serialisation
}

export type OmniFlow = StargateComposeFlow | SpokeRedeemFlow;

interface OmniFlowStore {
  /** At most one active flow at a time per vault */
  flows: Record<string, OmniFlow>; // keyed by vaultId
  setFlow: (vaultId: string, flow: OmniFlow) => void;
  updateFlow: (vaultId: string, patch: Partial<OmniFlow>) => void;
  removeFlow: (vaultId: string) => void;
  getFlow: (vaultId: string) => OmniFlow | undefined;
}

export const useOmniFlowStore = create<OmniFlowStore>()(
  persist(
    (set, get) => ({
      flows: {},

      setFlow: (vaultId, flow) =>
        set((state) => ({
          flows: { ...state.flows, [vaultId]: flow },
        })),

      updateFlow: (vaultId, patch) =>
        set((state) => {
          const existing = state.flows[vaultId];
          if (!existing) return state;
          return {
            flows: {
              ...state.flows,
              [vaultId]: { ...existing, ...patch } as OmniFlow,
            },
          };
        }),

      removeFlow: (vaultId) =>
        set((state) => {
          const next = { ...state.flows };
          delete next[vaultId];
          return { flows: next };
        }),

      getFlow: (vaultId) => get().flows[vaultId],
    }),
    {
      name: 'omni-flows',
      // Clean up stale flows on rehydrate
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const fresh: Record<string, OmniFlow> = {};
        for (const [vaultId, flow] of Object.entries(state.flows)) {
          // Keep flows that are not in terminal state
          const isTerminal =
            (flow.type === 'stargate-compose' && flow.step === 'done') ||
            (flow.type === 'spoke-redeem' && flow.step === 'done');
          if (!isTerminal) {
            fresh[vaultId] = flow;
          }
        }
        state.flows = fresh;
      },
    }
  )
);
