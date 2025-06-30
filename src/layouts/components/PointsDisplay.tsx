import { Box, Button, SvgIcon, Typography, useMediaQuery, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ContentWithTooltip } from 'src/components/ContentWithTooltip';
import { Link } from 'src/components/primitives/Link';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';

interface PointsDisplayProps { }

export const PointsDisplay: React.FC<PointsDisplayProps> = () => {
  const { currentAccount } = useWeb3Context();
  const { breakpoints } = useTheme();
  const sm = useMediaQuery(breakpoints.down('sm'));
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch points when wallet is connected
  useEffect(() => {
    if (currentAccount) {
      fetchPoints(currentAccount);
    } else {
      setPoints(null);
    }
  }, [currentAccount]);

  const fetchPoints = async (address: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_REWARD_URL}/api/points/user?userAddress=${address}`);
      const data = await response.json();
      setPoints(data.accumulated_points || 0);
    } catch (error) {
      console.error('Failed to fetch points:', error);
      setPoints(0);
    } finally {
      setLoading(false);
    }
  };

  if (!currentAccount) {
    return null;
  }

  const pointsTooltip = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1, maxWidth: 280 }}>
      <Typography variant="subheader1">MORE Points</Typography>
      <Typography variant="description">
        Earn points by lending, borrowing, and depositing in portfolios. Discover how the rewards program works and how to make the most of it.
      </Typography>
      <Link
        href="https://docs.more.markets" // TODO: Replace with actual documentation URL
        style={{ fontSize: '14px', fontWeight: 400, textDecoration: 'underline' }}
      >
        More info here
      </Link>
    </Box>
  );

  const displayPoints = loading ? '...' : (points?.toLocaleString() || '0');

  return (
    <ContentWithTooltip tooltipContent={pointsTooltip} offset={[0, -4]} withoutHover>
      <Box
        sx={{
          mr: { xs: 1, sm: 2 },
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
        }}
        aria-label="Your MORE points"
      >
        <Box
          component="img"
          src="/MORE_coin.svg"
          alt="MORE Coin"
          sx={{
            width: 22,
            height: 22,
          }}
        />
        {!sm && (
          <Typography component="span" variant="main14" sx={{ color: '#ffffff', fontWeight: 500 }}>
            {displayPoints} MORE Points
          </Typography>
        )}
      </Box>
    </ContentWithTooltip>
  );
}; 