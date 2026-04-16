import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OmniRequestStatus = 'pending' | 'ready-to-execute' | 'completed' | 'refunded';

export interface OmniRequest {
  guid: string;
  vaultId: string;
  chainId: number;
  type: 'deposit' | 'redeem';
  status: OmniRequestStatus;
  txHash: string;
  vaultName?: string;
  timestamp: number;
}

interface OmniRequestStore {
  omniRequests: Record<string, OmniRequest>;
  addOmniRequest: (req: Omit<OmniRequest, 'timestamp'>) => void;
  updateOmniRequestStatus: (guid: string, status: OmniRequestStatus) => void;
  removeOmniRequest: (guid: string) => void;
}

export const useOmniRequestStore = create<OmniRequestStore>()(
  persist(
    (set) => ({
      omniRequests: {},

      addOmniRequest: (req) =>
        set((state) => ({
          omniRequests: {
            ...state.omniRequests,
            [req.guid]: { ...req, timestamp: Date.now() },
          },
        })),

      updateOmniRequestStatus: (guid, status) =>
        set((state) => {
          const existing = state.omniRequests[guid];
          if (!existing) return state;
          return {
            omniRequests: {
              ...state.omniRequests,
              [guid]: { ...existing, status },
            },
          };
        }),

      removeOmniRequest: (guid) =>
        set((state) => {
          const next = { ...state.omniRequests };
          delete next[guid];
          return { omniRequests: next };
        }),
    }),
    { name: 'omni-requests' }
  )
);
