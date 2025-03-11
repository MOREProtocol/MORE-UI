import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Box, Paper, styled, Typography } from '@mui/material';

import { LineChart } from './LineChart';
import { VaultAssetData } from './mockData';

interface VaultAssetsListItemProps {
  data: VaultAssetData;
  onClick?: () => void;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  cursor: 'pointer',
  borderRadius: theme.spacing(2),
  border: `0.5px solid ${theme.palette.divider}`,
  overflow: 'hidden',
}));

const Header = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginBottom: 16,
  padding: '16px 16px 0 16px',
});

const Logo = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(1.5),
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  paddingLeft: theme.spacing(5),
  paddingRight: theme.spacing(5),
  gap: theme.spacing(5),
  flexGrow: 1,
}));

const InfoSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  flexBasis: '50%',
});

const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(0.8),
}));

const InfoLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));

const InfoValue = styled(Typography)({
  fontWeight: 500,
  textAlign: 'right',
});

const ChartContainer = styled(Box)({
  flexBasis: '50%',
  minHeight: 100,
});

const PriceRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#000',
  color: 'white',
  padding: '6px 20px',
});

const SharePrice = styled(Typography)({
  fontWeight: 600,
  fontSize: '1.25rem',
  color: 'white',
});

const PriceLabel = styled(Typography)({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.7)',
});

const TimeLabel = styled(Typography)({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.7)',
});

const PositiveChange = styled(Typography)({
  fontWeight: 500,
  color: '#4CAF50',
});

const ArrowIcon = styled(ArrowForwardIosIcon)({
  fontSize: 16,
  color: 'white',
});

export const VaultAssetsListItem = ({ data, onClick }: VaultAssetsListItemProps) => {
  return (
    <StyledPaper onClick={onClick}>
      <Header>
        <Logo>
          <img src={'/icons/tokens/flow.svg'} alt="Flow Logo" style={{ width: 35, height: 35 }} />
        </Logo>
        <Typography fontWeight={700}>{data.name}</Typography>
      </Header>
      <ContentContainer>
        <InfoSection>
          <Box>
            <InfoRow>
              <InfoLabel>AUM</InfoLabel>
              <InfoValue>
                {data.aum} FLOW (${data.flowValue})
              </InfoValue>
            </InfoRow>

            <InfoRow>
              <InfoLabel>Curator</InfoLabel>
              <InfoValue>{data.curator}</InfoValue>
            </InfoRow>

            <InfoRow>
              <InfoLabel>Net APY</InfoLabel>
              <InfoValue>{data.netApy}%</InfoValue>
            </InfoRow>

            <InfoRow>
              <InfoLabel>Deposit denomination</InfoLabel>
              <InfoValue>{data.depositDenomination}</InfoValue>
            </InfoRow>
          </Box>
        </InfoSection>

        <ChartContainer>
          <LineChart data={data.priceHistory} height={100} />
        </ChartContainer>
      </ContentContainer>

      <PriceRow>
        <Box>
          <PriceLabel>Share price</PriceLabel>
          <SharePrice>${data.sharePrice}</SharePrice>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'end', flexDirection: 'column' }}>
            <PositiveChange>+{data.priceChange}%</PositiveChange>
            <TimeLabel sx={{ mx: 1 }}>24h</TimeLabel>
          </Box>
          <ArrowIcon />
        </Box>
      </PriceRow>
    </StyledPaper>
  );
};
