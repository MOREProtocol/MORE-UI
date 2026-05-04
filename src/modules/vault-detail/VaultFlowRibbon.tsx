import { Box, Typography, useTheme } from '@mui/material';
import {
  useVaultPortfolioMultiChain,
  useVaultTopology,
} from '@oydual31/more-vaults-sdk/react';
import React, { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useVault } from 'src/hooks/vault/useVault';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';

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

// Layout is symmetric around X_VAULT, which is set to the horizontal center of the viewBox
// so the MORE logo lines up with the centered "Liquidity Flow" title underneath.
const SVG_W = 1260;
const CHAIN_BOX_W = 380;
const CHAIN_BOX_HALF = CHAIN_BOX_W / 2;
const ALLOC_BOX_W = 380;
const X_CHAIN = 270;       // center of chain box → chain box spans [80, 460]
const X_VAULT = 660;       // center of viewBox (= (VIEW_X_MIN + SVG_W) / 2)
const X_ALLOC = 860;       // left edge of alloc box → alloc box spans [860, 1240]
const VIEW_X_MIN = X_CHAIN - CHAIN_BOX_HALF - 20;  // = 60, leaves 20px margin left of chain box
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
}> = ({ vaultName, vaultAssetSymbol }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { selectedVaultId, chainId: vaultChainId, isOmniHub } = useVault();

  const { topology } = useVaultTopology(selectedVaultId as `0x${string}` | undefined);
  const isOmni = isOmniHub || topology?.role === 'hub' || topology?.role === 'spoke';
  const hubChainId = topology?.hubChainId ?? vaultChainId;

  // Single source of truth for omni allocations (matches VaultAllocations).
  // Per-chain breakdown of liquid + sub-vault positions — avoids the double-counting
  // we used to get from `distribution.spokeBalances` + `portfolio.allSubVaultPositions`.
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
    // If only one would be hidden, show it directly (no "+1 more" overflow box).
    // Show the dashed overflow box only when hidden count > 1.
    const chainOverflowThreshold =
      allChains.length > MAX_VISIBLE + 1 ? MAX_VISIBLE : allChains.length;
    const visibleChains: Omit<ChainNode, 'y'>[] = allChains.slice(0, chainOverflowThreshold);
    const hiddenChainCount = Math.max(0, allChains.length - chainOverflowThreshold);
    if (hiddenChainCount > 1) {
      visibleChains.push({
        chainId: -1,
        name: `+${hiddenChainCount} more`,
        isHub: false,
        logoPath: '',
        isOverflow: true,
        overflowCount: hiddenChainCount,
      });
    }

    // Allocation nodes — per-chain liquid balances + sub-vault positions.
    // Mirrors VaultAllocations: liquid and sub-vault rows are emitted separately,
    // and a chain's `totalAssets` is never added (it's an aggregate of those rows).
    const rawAllocs: { label: string; chainId: number; value: number }[] = [];

    if (portfolio) {
      for (const chain of portfolio.chains) {
        const cfg = networkConfigs[chain.chainId];
        const chainName = cfg?.name || `Chain ${chain.chainId}`;

        // Liquid asset rows (idle balances)
        for (const a of chain.portfolio.liquidAssets) {
          if (a.balance <= BigInt(0)) continue;
          const bal = parseFloat(formatUnits(a.balance, a.decimals));
          rawAllocs.push({
            label: `${a.symbol || vaultAssetSymbol || 'Asset'} on ${chainName}`,
            chainId: chain.chainId,
            value: bal,
          });
        }

        // Sub-vault position rows (deployed via ERC4626/7540 strategies)
        for (const pos of chain.portfolio.subVaultPositions) {
          if (pos.underlyingValue <= BigInt(0)) continue;
          const bal = parseFloat(formatUnits(pos.underlyingValue, pos.underlyingDecimals));
          rawAllocs.push({
            label: `${pos.name || pos.symbol} on ${chainName}`,
            chainId: chain.chainId,
            value: bal,
          });
        }
      }
    }

    // Sort descending by value, compute % from combined total
    rawAllocs.sort((a, b) => b.value - a.value);
    const combinedTotal = rawAllocs.reduce((sum, a) => sum + a.value, 0);

    // If only one would be hidden, show it directly (no "+1 more" overflow box).
    // Show the dashed overflow box only when hidden count > 1.
    const allocOverflowThreshold =
      rawAllocs.length > MAX_VISIBLE + 1 ? MAX_VISIBLE : rawAllocs.length;
    const visibleRaw = rawAllocs.slice(0, allocOverflowThreshold);
    const hiddenAllocCount = Math.max(0, rawAllocs.length - allocOverflowThreshold);

    const visibleAllocs: Omit<AllocNode, 'y'>[] = visibleRaw.map((a) => ({
      label: a.label,
      chainId: a.chainId,
      logoPath: networkConfigs[a.chainId]?.networkLogoPath || '',
      ratio: combinedTotal > 0 ? `${Math.round((a.value / combinedTotal) * 100)}%` : '—',
    }));

    if (hiddenAllocCount > 1) {
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
  }, [topology, portfolio, hubChainId, vaultAssetSymbol]);

  // Stable random offsets in ±0.3s — adds ~20% timing variation per dot without
  // reshuffling on every render (which would restart the animations).
  const dotJitter = React.useMemo(
    () => Array.from({ length: 64 }, () => (Math.random() - 0.5) * 0.6),
    []
  );
  const jitter = (idx: number) => dotJitter[Math.abs(idx) % dotJitter.length];

  if (!isOmni || chainNodes.length === 0) return null;

  const VAULT_CY = svgH / 2;

  const textPrimary = isDark ? '#F5EFE9' : '#1A120C';
  const textMuted = isDark ? '#897E73' : '#8B7867';
  const plateBg = isDark ? '#1C1714' : '#FFFCF6';
  const plate2Bg = isDark ? '#251E1A' : '#FFF6E8';
  const borderStrong = isDark ? 'rgba(255,255,255,.12)' : 'rgba(40,25,15,.16)';
  const overflowBorder = isDark ? 'rgba(255,255,255,.08)' : 'rgba(40,25,15,.10)';
  const fwdDotFill = isDark ? '#FFFFFF' : '#3E342B';
  const font = theme.typography.fontFamily ?? 'sans-serif';
  const fontDisplay = (theme.typography.h1 as { fontFamily?: string })?.fontFamily ?? font;

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'block' },
        background: isDark
          ? 'linear-gradient(180deg, rgba(245,132,32,.05), rgba(245,132,32,.01))'
          : 'linear-gradient(180deg, rgba(245,132,32,.06), transparent)',
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
          viewBox={`${VIEW_X_MIN} 0 ${SVG_W - VIEW_X_MIN} ${svgH}`}
          style={{ width: '100%', height: svgH, display: 'block', minWidth: 480 }}
        >
          <defs>
            <linearGradient id="vfr-flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FCB319" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#F58420" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F58420" stopOpacity="0.85" />
            </linearGradient>
            {/* Per-chain clip paths */}
            {chainNodes.map((c, i) => (
              <clipPath key={`clip-c-${i}`} id={`vfr-clip-c-${i}`}>
                <circle cx={X_CHAIN - CHAIN_BOX_HALF + 17} cy={c.y} r="10" />
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
            { x: X_CHAIN, label: 'DEPOSIT & WITHDRAWAL CHAINS' },
            { x: X_VAULT, label: 'VAULT' },
            { x: X_ALLOC + ALLOC_BOX_W / 2, label: 'ALLOCATIONS' },
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

          {/* Chain nodes */}
          {chainNodes.map((c, i) => (
            <g key={c.isOverflow ? `chain-overflow` : c.chainId}>
              <rect
                x={X_CHAIN - CHAIN_BOX_HALF}
                y={c.y - 24}
                width={CHAIN_BOX_W}
                height="48"
                rx="10"
                fill={c.isOverflow ? 'none' : c.isHub ? plate2Bg : plateBg}
                stroke={c.isOverflow ? overflowBorder : c.isHub ? 'rgba(245,132,32,.55)' : borderStrong}
                strokeWidth={c.isHub ? '1.5' : '1'}
                strokeDasharray={c.isOverflow ? '4 3' : undefined}
              />
              {c.isOverflow ? (
                <>
                  {/* Ribbon banner */}
                  <rect
                    x={X_CHAIN - 32}
                    y={c.y - 24 - 9}
                    width="64"
                    height="16"
                    rx="3"
                    fill="#F58420"
                  />
                  <text
                    x={X_CHAIN}
                    y={c.y - 24 - 9 + 11}
                    fontFamily={font}
                    fontSize="9"
                    fontWeight="700"
                    fill="#FFFFFF"
                    textAnchor="middle"
                    letterSpacing="0.8"
                  >
                    MORE
                  </text>
                  <text x={X_CHAIN} y={c.y + 5} fontFamily={font} fontSize="13" fontWeight="600" fill={textMuted} textAnchor="middle">
                    {c.name}
                  </text>
                </>
              ) : (
                <>
                  <circle cx={X_CHAIN - CHAIN_BOX_HALF + 17} cy={c.y} r="11" fill={plateBg} stroke={c.isHub ? 'rgba(245,132,32,.4)' : borderStrong} strokeWidth="1.5" />
                  {c.logoPath && (
                    <image
                      href={c.logoPath}
                      x={X_CHAIN - CHAIN_BOX_HALF + 7}
                      y={c.y - 10}
                      width="20"
                      height="20"
                      clipPath={`url(#vfr-clip-c-${i})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  )}
                  <text x={X_CHAIN - CHAIN_BOX_HALF + 35} y={c.y - 5} fontFamily={font} fontSize="12" fontWeight="600" fill={textPrimary}>{c.name}</text>
                  <text
                    x={X_CHAIN - CHAIN_BOX_HALF + 35}
                    y={c.y + 10}
                    fontFamily={font}
                    fontSize="10"
                    fill={c.isHub ? '#FFA94A' : textMuted}
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
            const x1 = X_CHAIN + CHAIN_BOX_HALF, y1 = c.y;
            const x2 = X_VAULT - 42, y2 = VAULT_CY;
            const d = `M ${x1} ${y1} C ${x1 + 76} ${y1}, ${x2 - 76} ${y2}, ${x2} ${y2}`;
            const dur = 2.8 + i * 0.3;
            return (
              <g key={id}>
                <path id={id} d={d} fill="none" stroke="url(#vfr-flow)" strokeWidth={c.isHub ? 2 : 1.2} opacity="0.85" />
                {/* Forward (left → right): white */}
                {[0, 1].map((k) => (
                  <circle key={`fwd-${k}`} r={c.isHub ? 3.5 : 2.5} fill={fwdDotFill}>
                    <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${Math.max(0, k * 1.4 + i * 0.4 + jitter(i * 4 + k))}s`}>
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                ))}
                {/* Reverse (right → left): orange */}
                {[0, 1].map((k) => (
                  <circle key={`rev-${k}`} r={c.isHub ? 3.5 : 2.5} fill="#F58420">
                    <animateMotion
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                      begin={`${Math.max(0, k * 1.4 + i * 0.4 + 0.7 + jitter(i * 4 + k + 2))}s`}
                      keyPoints="1;0"
                      keyTimes="0;1"
                      calcMode="linear"
                    >
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
            const dur = 3 + i * 0.25;
            return (
              <g key={id}>
                <path id={id} d={d} fill="none" stroke="url(#vfr-flow)" strokeWidth="1.3" opacity="0.85" />
                {/* Forward (left → right): white */}
                {[0, 1].map((k) => (
                  <circle key={`fwd-${k}`} r="2.5" fill={fwdDotFill}>
                    <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${Math.max(0, k * 1.5 + i * 0.35 + jitter(32 + i * 4 + k))}s`}>
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                ))}
                {/* Reverse (right → left): orange */}
                {[0, 1].map((k) => (
                  <circle key={`rev-${k}`} r="2.5" fill="#F58420">
                    <animateMotion
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                      begin={`${Math.max(0, k * 1.5 + i * 0.35 + 0.75 + jitter(32 + i * 4 + k + 2))}s`}
                      keyPoints="1;0"
                      keyTimes="0;1"
                      calcMode="linear"
                    >
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
                width={ALLOC_BOX_W}
                height="52"
                rx="10"
                fill={a.isOverflow ? 'none' : plate2Bg}
                stroke={a.isOverflow ? overflowBorder : borderStrong}
                strokeDasharray={a.isOverflow ? '4 3' : undefined}
              />
              {a.isOverflow ? (
                <>
                  {/* Ribbon banner */}
                  <rect
                    x={X_ALLOC + ALLOC_BOX_W / 2 - 32}
                    y={a.y - 26 - 9}
                    width="64"
                    height="16"
                    rx="3"
                    fill="#F58420"
                  />
                  <text
                    x={X_ALLOC + ALLOC_BOX_W / 2}
                    y={a.y - 26 - 9 + 11}
                    fontFamily={font}
                    fontSize="9"
                    fontWeight="700"
                    fill="#FFFFFF"
                    textAnchor="middle"
                    letterSpacing="0.8"
                  >
                    MORE
                  </text>
                  <text x={X_ALLOC + ALLOC_BOX_W / 2} y={a.y + 5} fontFamily={font} fontSize="13" fontWeight="600" fill={textMuted} textAnchor="middle">
                    {a.label}
                  </text>
                </>
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
                    {a.label.length > 38 ? `${a.label.slice(0, 36)}…` : a.label}
                  </text>
                  <text x={X_ALLOC + 33} y={a.y + 10} fontFamily={font} fontSize="10" fill={textMuted}>
                    {networkConfigs[a.chainId]?.name || `Chain ${a.chainId}`}
                  </text>
                  <text
                    x={X_ALLOC + ALLOC_BOX_W - 12}
                    y={a.y + 5}
                    fontFamily={font}
                    fontSize="13"
                    fontWeight="600"
                    fill={a.ratio === '—' ? textMuted : '#FFA94A'}
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
