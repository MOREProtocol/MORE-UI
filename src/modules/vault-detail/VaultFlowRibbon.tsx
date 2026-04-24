import { Box, Typography, useTheme } from '@mui/material';
import {
  useVaultDistribution,
  useVaultPortfolioMultiChain,
  useVaultTopology,
} from '@oydual31/more-vaults-sdk/react';
import React, { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useVault } from 'src/hooks/vault/useVault';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { useAccount } from 'wagmi';

interface ChainNode {
  chainId: number;
  name: string;
  isHub: boolean;
  logoPath: string;
  isOverflow?: boolean;
  overflowCount?: number;
  y: number;
}

interface AllocNode {
  label: string;
  chainId: number;
  logoPath: string;
  ratio: string;
  isOverflow?: boolean;
  overflowCount?: number;
  y: number;
}

const SVG_W = 1160;
const X_WALLET = 68;
const X_CHAIN = 318;
const X_VAULT = 622;
const X_ALLOC = 930;
const NODE_H = 60;
const TOP_PAD = 68; // increased so column headers at y=22 are not hidden by first nodes
const BOT_PAD = 28;
const MAX_VISIBLE = 4;

function getY(idx: number, count: number, totalH: number): number {
  const usable = totalH - TOP_PAD - BOT_PAD;
  return count === 1 ? TOP_PAD + usable / 2 : TOP_PAD + (idx / (count - 1)) * usable;
}

export const VaultFlowRibbon: React.FC<{
  vaultName?: string;
  vaultAssetSymbol?: string;
  vaultAssetDecimals?: number;
}> = ({ vaultName, vaultAssetSymbol, vaultAssetDecimals = 6 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { selectedVaultId, accountAddress, chainId: vaultChainId, isOmniHub } = useVault();
  const { address } = useAccount();

  const { topology } = useVaultTopology(selectedVaultId as `0x${string}` | undefined);
  const isOmni = isOmniHub || topology?.role === 'hub' || topology?.role === 'spoke';
  const hubChainId = topology?.hubChainId ?? vaultChainId;

  const { distribution } = useVaultDistribution(
    isOmni ? (selectedVaultId as `0x${string}`) : undefined
  );
  const { data: portfolio } = useVaultPortfolioMultiChain(
    isOmni ? (selectedVaultId as `0x${string}`) : undefined,
    hubChainId
  );

  const { chainNodes, allocNodes, svgH } = useMemo((): {
    chainNodes: ChainNode[];
    allocNodes: AllocNode[];
    svgH: number;
  } => {
    if (!topology) return { chainNodes: [], allocNodes: [], svgH: 320 };

    const spokeChainIds = topology.spokeChainIds || [];
    const allChainIds = [hubChainId, ...spokeChainIds];

    // Chain nodes (left column) — cap at MAX_VISIBLE + optional overflow node
    const allChains: Omit<ChainNode, 'y'>[] = allChainIds.map((cId) => ({
      chainId: cId,
      name: networkConfigs[cId]?.name || `Chain ${cId}`,
      isHub: cId === hubChainId,
      logoPath: networkConfigs[cId]?.networkLogoPath || '',
    }));
    const visibleChains: Omit<ChainNode, 'y'>[] = allChains.slice(0, MAX_VISIBLE);
    const hiddenChainCount = Math.max(0, allChains.length - MAX_VISIBLE);
    if (hiddenChainCount > 0) {
      visibleChains.push({
        chainId: -1,
        name: `+${hiddenChainCount} more`,
        isHub: false,
        logoPath: '',
        isOverflow: true,
        overflowCount: hiddenChainCount,
      });
    }

    // Allocation nodes — combine spoke liquid balances + sub-vault positions (same as VaultAllocations)
    const rawAllocs: { label: string; chainId: number; value: number }[] = [];

    if (distribution) {
      // Spoke chain liquid balances
      for (const spoke of distribution.spokeBalances) {
        if (!spoke.isReachable || spoke.totalAssets <= BigInt(0)) continue;
        const cfg = networkConfigs[spoke.chainId];
        const bal = parseFloat(formatUnits(spoke.totalAssets, vaultAssetDecimals));
        rawAllocs.push({
          label: `${vaultAssetSymbol || 'Asset'} on ${cfg?.name || `Chain ${spoke.chainId}`}`,
          chainId: spoke.chainId,
          value: bal,
        });
      }
    }

    if (portfolio?.allSubVaultPositions) {
      for (const pos of portfolio.allSubVaultPositions) {
        if (pos.underlyingValue <= BigInt(0)) continue;
        const cfg = networkConfigs[pos.chainId];
        const bal = parseFloat(formatUnits(pos.underlyingValue, pos.underlyingDecimals));
        rawAllocs.push({
          label: `${pos.name || pos.symbol} on ${cfg?.name || `Chain ${pos.chainId}`}`,
          chainId: pos.chainId,
          value: bal,
        });
      }
    }

    // Sort descending by value, compute % from combined total
    rawAllocs.sort((a, b) => b.value - a.value);
    const combinedTotal = rawAllocs.reduce((sum, a) => sum + a.value, 0);

    // Cap at MAX_VISIBLE + optional overflow node
    const visibleRaw = rawAllocs.slice(0, MAX_VISIBLE);
    const hiddenAllocCount = Math.max(0, rawAllocs.length - MAX_VISIBLE);

    const visibleAllocs: Omit<AllocNode, 'y'>[] = visibleRaw.map((a) => ({
      label: a.label,
      chainId: a.chainId,
      logoPath: networkConfigs[a.chainId]?.networkLogoPath || '',
      ratio: combinedTotal > 0 ? `${Math.round((a.value / combinedTotal) * 100)}%` : '—',
    }));

    if (hiddenAllocCount > 0) {
      visibleAllocs.push({
        label: `+${hiddenAllocCount} more`,
        chainId: -1,
        logoPath: '',
        ratio: '',
        isOverflow: true,
        overflowCount: hiddenAllocCount,
      });
    }

    // Dynamic height to fit all nodes
    const maxCount = Math.max(visibleChains.length, visibleAllocs.length, 1);
    const height = Math.max(230, maxCount * NODE_H + TOP_PAD + BOT_PAD - 30);

    // Assign Y positions
    const finalChains: ChainNode[] = visibleChains.map((c, i) => ({
      ...c,
      y: getY(i, visibleChains.length, height),
    }));
    const finalAllocs: AllocNode[] = visibleAllocs.map((a, i) => ({
      ...a,
      y: getY(i, visibleAllocs.length, height),
    }));

    return { chainNodes: finalChains, allocNodes: finalAllocs, svgH: height };
  }, [topology, distribution, portfolio, hubChainId, vaultAssetSymbol, vaultAssetDecimals]);

  if (!isOmni || chainNodes.length === 0) return null;

  const walletAddr = accountAddress || address;
  const shortAddr = walletAddr ? `${walletAddr.slice(0, 4)}…${walletAddr.slice(-4)}` : '0x…';
  const VAULT_CY = svgH / 2;

  const textPrimary = isDark ? '#F5EFE9' : '#1A120C';
  const textMuted = isDark ? '#897E73' : '#8B7867';
  const plateBg = isDark ? '#1C1714' : '#FFFCF6';
  const plate2Bg = isDark ? '#251E1A' : '#FFF6E8';
  const borderStrong = isDark ? 'rgba(255,255,255,.12)' : 'rgba(40,25,15,.16)';
  const overflowBorder = isDark ? 'rgba(255,255,255,.08)' : 'rgba(40,25,15,.10)';
  const font = theme.typography.fontFamily ?? 'sans-serif';
  const fontDisplay = (theme.typography.h1 as { fontFamily?: string })?.fontFamily ?? font;

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'block' },
        background: isDark
          ? 'linear-gradient(180deg, rgba(242,106,21,.05), rgba(242,106,21,.01))'
          : 'linear-gradient(180deg, rgba(242,106,21,.06), transparent)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '14px',
        p: { md: 3 },
        overflow: 'hidden',
      }}
    >
      {/* SVG flow diagram */}
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${svgH}`}
          style={{ width: '100%', height: svgH, display: 'block', minWidth: 580 }}
        >
          <defs>
            <linearGradient id="vfr-flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFB547" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#F26A15" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F26A15" stopOpacity="0.85" />
            </linearGradient>
            {/* Per-chain clip paths */}
            {chainNodes.map((c, i) => (
              <clipPath key={`clip-c-${i}`} id={`vfr-clip-c-${i}`}>
                <circle cx={X_CHAIN - 76} cy={c.y} r="10" />
              </clipPath>
            ))}
            {allocNodes.map((a, i) => (
              <clipPath key={`clip-a-${i}`} id={`vfr-clip-a-${i}`}>
                <circle cx={X_ALLOC + 17} cy={a.y} r="10" />
              </clipPath>
            ))}
          </defs>

          {/* Column headers — y=22 is well above first node top (TOP_PAD - 24 = 44) */}
          {[
            { x: X_WALLET, label: 'DEPOSIT' },
            { x: X_CHAIN, label: 'SOURCE CHAINS' },
            { x: X_VAULT, label: 'VAULT' },
            { x: X_ALLOC + 102, label: 'ALLOCATIONS' },
          ].map((col) => (
            <text
              key={col.label}
              x={col.x}
              y="22"
              fontFamily={font}
              fontSize="9.5"
              fill={textMuted}
              textAnchor="middle"
              letterSpacing="1.5"
            >
              {col.label}
            </text>
          ))}

          {/* WALLET node */}
          <g>
            <rect x={X_WALLET - 40} y={VAULT_CY - 34} width="80" height="68" rx="10" fill={plateBg} stroke={borderStrong} />
            <rect x={X_WALLET - 40} y={VAULT_CY - 34} width="80" height="24" rx="10" fill={plate2Bg} />
            <text x={X_WALLET} y={VAULT_CY - 18} fontFamily={font} fontSize="9.5" fill={textMuted} textAnchor="middle" letterSpacing="1">WALLET</text>
            <g transform={`translate(${X_WALLET - 9} ${VAULT_CY - 6})`}>
              <rect x="0" y="4" width="18" height="14" rx="2.5" fill="none" stroke={textPrimary} strokeWidth="1.4" />
              <path d="M0 8 L 14 8 L 14 4 L 3 4 Z" fill={textPrimary} />
              <circle cx="15" cy="12" r="1.5" fill="#FF8A2A" />
            </g>
            <text x={X_WALLET} y={VAULT_CY + 46} fontFamily={font} fontSize="10.5" fill={textMuted} textAnchor="middle">{shortAddr}</text>
          </g>

          {/* Wallet → Chains */}
          {chainNodes.map((c, i) => {
            if (c.isOverflow) return null;
            const id = `vfr-w2c-${i}`;
            const x1 = X_WALLET + 40, y1 = VAULT_CY;
            const x2 = X_CHAIN - 93, y2 = c.y;
            const d = `M ${x1} ${y1} C ${x1 + 70} ${y1}, ${x2 - 70} ${y2}, ${x2} ${y2}`;
            return (
              <g key={id}>
                <path id={id} d={d} fill="none" stroke="url(#vfr-flow)" strokeWidth="1.3" strokeDasharray="2 5" opacity="0.9" />
                {[0, 1].map((k) => (
                  <circle key={k} r="2.5" fill="#FFB547">
                    <animateMotion dur={`${3.4 + i * 0.25}s`} repeatCount="indefinite" begin={`${k * 1.7 + i * 0.3}s`}>
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* Chain nodes */}
          {chainNodes.map((c, i) => (
            <g key={c.isOverflow ? `chain-overflow` : c.chainId}>
              <rect
                x={X_CHAIN - 93}
                y={c.y - 24}
                width="186"
                height="48"
                rx="10"
                fill={c.isOverflow ? 'none' : c.isHub ? plate2Bg : plateBg}
                stroke={c.isOverflow ? overflowBorder : c.isHub ? 'rgba(242,106,21,.55)' : borderStrong}
                strokeWidth={c.isHub ? '1.5' : '1'}
                strokeDasharray={c.isOverflow ? '4 3' : undefined}
              />
              {c.isOverflow ? (
                <text x={X_CHAIN} y={c.y + 5} fontFamily={font} fontSize="13" fontWeight="600" fill={textMuted} textAnchor="middle">
                  {c.name}
                </text>
              ) : (
                <>
                  <circle cx={X_CHAIN - 76} cy={c.y} r="11" fill={plateBg} stroke={c.isHub ? 'rgba(242,106,21,.4)' : borderStrong} strokeWidth="1.5" />
                  {c.logoPath && (
                    <image
                      href={c.logoPath}
                      x={X_CHAIN - 86}
                      y={c.y - 10}
                      width="20"
                      height="20"
                      clipPath={`url(#vfr-clip-c-${i})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  )}
                  <text x={X_CHAIN - 58} y={c.y - 5} fontFamily={font} fontSize="12" fontWeight="600" fill={textPrimary}>{c.name}</text>
                  <text
                    x={X_CHAIN - 58}
                    y={c.y + 10}
                    fontFamily={font}
                    fontSize="10"
                    fill={c.isHub ? '#FF8A2A' : textMuted}
                    fontWeight={c.isHub ? '600' : '400'}
                    letterSpacing={c.isHub ? '0.8' : '0'}
                  >
                    {c.isHub ? 'HUB' : 'Spoke'}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Chains → Vault */}
          {chainNodes.map((c, i) => {
            if (c.isOverflow) return null;
            const id = `vfr-c2v-${i}`;
            const x1 = X_CHAIN + 93, y1 = c.y;
            const x2 = X_VAULT - 42, y2 = VAULT_CY;
            const d = `M ${x1} ${y1} C ${x1 + 76} ${y1}, ${x2 - 76} ${y2}, ${x2} ${y2}`;
            return (
              <g key={id}>
                <path id={id} d={d} fill="none" stroke="url(#vfr-flow)" strokeWidth={c.isHub ? 2 : 1.2} opacity="0.85" />
                {[0, 1, 2].map((k) => (
                  <circle key={k} r={c.isHub ? 3.5 : 2.5} fill={c.isHub ? '#F26A15' : '#FFB547'}>
                    <animateMotion dur={`${2.8 + i * 0.3}s`} repeatCount="indefinite" begin={`${k * 0.9 + i * 0.4}s`}>
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* Vault node — MORE icon + vault name */}
          <g>
            <image
              href="/icons/curators/more.svg"
              x={X_VAULT - 30}
              y={VAULT_CY - 30}
              width="60"
              height="60"
              preserveAspectRatio="xMidYMid meet"
            />
            {vaultName && (
              <foreignObject x={X_VAULT - 80} y={VAULT_CY + 36} width="160" height="72">
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: textPrimary,
                    fontFamily: fontDisplay,
                    lineHeight: '1.35',
                    wordBreak: 'break-word',
                    padding: '0 4px',
                  }}
                >
                  {vaultName}
                </div>
              </foreignObject>
            )}
          </g>

          {/* Vault → Allocs */}
          {allocNodes.map((a, i) => {
            if (a.isOverflow) return null;
            const id = `vfr-v2a-${i}`;
            const x1 = X_VAULT + 42, y1 = VAULT_CY;
            const x2 = X_ALLOC, y2 = a.y;
            const d = `M ${x1} ${y1} C ${x1 + 76} ${y1}, ${x2 - 76} ${y2}, ${x2} ${y2}`;
            return (
              <g key={id}>
                <path id={id} d={d} fill="none" stroke="url(#vfr-flow)" strokeWidth="1.3" opacity="0.85" />
                {[0, 1, 2].map((k) => (
                  <circle key={k} r="2.5" fill="#FFB547">
                    <animateMotion dur={`${3 + i * 0.25}s`} repeatCount="indefinite" begin={`${k + i * 0.35}s`}>
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* Alloc nodes */}
          {allocNodes.map((a, i) => (
            <g key={a.isOverflow ? `alloc-overflow` : i}>
              <rect
                x={X_ALLOC}
                y={a.y - 26}
                width="212"
                height="52"
                rx="10"
                fill={a.isOverflow ? 'none' : plate2Bg}
                stroke={a.isOverflow ? overflowBorder : borderStrong}
                strokeDasharray={a.isOverflow ? '4 3' : undefined}
              />
              {a.isOverflow ? (
                <text x={X_ALLOC + 106} y={a.y + 5} fontFamily={font} fontSize="13" fontWeight="600" fill={textMuted} textAnchor="middle">
                  {a.label}
                </text>
              ) : (
                <>
                  <circle cx={X_ALLOC + 17} cy={a.y} r="11" fill={plateBg} stroke={borderStrong} strokeWidth="1.5" />
                  {a.logoPath && (
                    <image
                      href={a.logoPath}
                      x={X_ALLOC + 7}
                      y={a.y - 10}
                      width="20"
                      height="20"
                      clipPath={`url(#vfr-clip-a-${i})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  )}
                  <text x={X_ALLOC + 33} y={a.y - 5} fontFamily={font} fontSize="11.5" fontWeight="600" fill={textPrimary}>
                    {a.label.length > 20 ? `${a.label.slice(0, 18)}…` : a.label}
                  </text>
                  <text x={X_ALLOC + 33} y={a.y + 10} fontFamily={font} fontSize="10" fill={textMuted}>
                    {networkConfigs[a.chainId]?.name || `Chain ${a.chainId}`}
                  </text>
                  <text
                    x={X_ALLOC + 200}
                    y={a.y + 5}
                    fontFamily={font}
                    fontSize="13"
                    fontWeight="600"
                    fill={a.ratio === '—' ? textMuted : '#FF8A2A'}
                    textAnchor="end"
                  >
                    {a.ratio}
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>
      </Box>

      {/* Eyebrow — bottom center */}
      <Typography
        sx={{
          fontSize: '10.5px',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'text.muted',
          fontWeight: 500,
          textAlign: 'center',
          mt: 1,
        }}
      >
        Liquidity Flow
      </Typography>
    </Box>
  );
};
