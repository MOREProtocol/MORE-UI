import { valueToBigNumber } from '@aave/math-utils';
import { ExclamationIcon } from '@heroicons/react/solid';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { Row } from 'src/components/primitives/Row';
import { Warning } from 'src/components/primitives/Warning';
import { IsolationModeWarning } from 'src/components/transactions/Warnings/IsolationModeWarning';
import { UserSummaryAfterMigration } from 'src/hooks/migration/useUserSummaryAfterMigration';
import { UserSummaryAndIncentives } from 'src/hooks/pool/useUserSummaryAndIncentives';
import { useModalContext } from 'src/hooks/useModal';
import { MarketDataType } from 'src/ui-config/marketsConfig';

import { MigrationMarketCard, SelectableMarkets } from './MigrationMarketCard';

export interface UserSummaryBeforeMigration {
  fromUserSummaryBeforeMigration: UserSummaryAndIncentives;
  toUserSummaryBeforeMigration: UserSummaryAndIncentives;
}

interface MigrationBottomPanelProps {
  disableButton?: boolean;
  loading?: boolean;
  enteringIsolationMode: boolean;
  fromMarketData: MarketDataType;
  toMarketData: MarketDataType;
  userSummaryAfterMigration?: UserSummaryAfterMigration;
  userSummaryBeforeMigration?: UserSummaryBeforeMigration;
  setFromMarketData: (marketData: MarketDataType) => void;
  selectableMarkets: SelectableMarkets;
}

enum ErrorType {
  NO_SELECTION,
  V2_HF_TOO_LOW,
  V3_HF_TOO_LOW,
  INSUFFICIENT_LTV,
}

interface BlockErrorTextProps {
  blockingError?: ErrorType | null;
}

const getBlockingError = (
  userSummaryAfterMigration: UserSummaryAfterMigration,
  disableButton: boolean,
  isChecked: boolean
) => {
  const {
    totalCollateralMarketReferenceCurrency,
    totalBorrowsMarketReferenceCurrency,
    currentLoanToValue,
  } = userSummaryAfterMigration.toUserSummaryAfterMigration;

  const maxBorrowAmount = valueToBigNumber(totalCollateralMarketReferenceCurrency).multipliedBy(
    currentLoanToValue
  );

  const insufficientLtv = valueToBigNumber(totalBorrowsMarketReferenceCurrency).isGreaterThan(
    maxBorrowAmount
  );
  if (disableButton && isChecked) {
    return ErrorType.NO_SELECTION;
  } else if (
    Number(userSummaryAfterMigration.fromUserSummaryAfterMigration.healthFactor) < 1.005 &&
    userSummaryAfterMigration.fromUserSummaryAfterMigration.healthFactor !== '-1'
  ) {
    return ErrorType.V2_HF_TOO_LOW;
  } else if (
    Number(userSummaryAfterMigration.toUserSummaryAfterMigration.healthFactor) < 1.005 &&
    userSummaryAfterMigration.toUserSummaryAfterMigration.healthFactor !== '-1'
  ) {
    return ErrorType.V3_HF_TOO_LOW;
  } else if (insufficientLtv) {
    return ErrorType.INSUFFICIENT_LTV;
  }
  return null;
};

const BlockErrorText = ({ blockingError }: BlockErrorTextProps) => {
  switch (blockingError) {
    case ErrorType.NO_SELECTION:
      return 'No assets selected to migrate.';
    case ErrorType.V2_HF_TOO_LOW:
      return (
        <>
          This action will reduce V2 health factor below liquidation threshold. retain collateral or
          migrate borrow position to continue.
        </>
      );
    case ErrorType.V3_HF_TOO_LOW:
      return (
        <>
          This action will reduce health factor of V3 below liquidation threshold. Increase migrated
          collateral or reduce migrated borrow to continue.
        </>
      );
    case ErrorType.INSUFFICIENT_LTV:
      return (
        <>
          The loan to value of the migrated positions would cause liquidation. Increase migrated
          collateral or reduce migrated borrow to continue.
        </>
      );
    default:
      return <></>;
  }
};

export const MigrationBottomPanel = ({
  disableButton,
  enteringIsolationMode,
  fromMarketData,
  toMarketData,
  userSummaryAfterMigration,
  userSummaryBeforeMigration,
  setFromMarketData,
  selectableMarkets,
  loading,
}: MigrationBottomPanelProps) => {
  const { openV3Migration } = useModalContext();
  const [isChecked, setIsChecked] = useState(false);

  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

  const blockingError = userSummaryAfterMigration
    ? getBlockingError(userSummaryAfterMigration, !!disableButton, isChecked)
    : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: { xs: '100%', lg: '40%' },
      }}
    >
      <Paper
        sx={{
          p: {
            xs: '16px 24px 24px 24px',
          },
          mb: { xs: 6, md: 0 },
        }}
      >
        <Row caption={'Migrate your assets'} captionVariant="h3" sx={{ mb: 6 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 2,
            mb: 12,
            position: 'relative',
            alignItems: 'center',
          }}
        >
          <MigrationMarketCard
            marketData={fromMarketData}
            userSummaryBeforeMigration={userSummaryBeforeMigration?.fromUserSummaryBeforeMigration}
            userSummaryAfterMigration={userSummaryAfterMigration?.fromUserSummaryAfterMigration}
            selectableMarkets={selectableMarkets}
            setFromMarketData={setFromMarketData}
            loading={loading}
          />
          <Box
            border={1}
            borderColor="divider"
            bgcolor="background.paper"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              borderRadius: '12px',
              width: 36,
              height: 36,
            }}
          >
            <ArrowDownward />
          </Box>
          <MigrationMarketCard
            marketData={toMarketData}
            userSummaryBeforeMigration={userSummaryBeforeMigration?.toUserSummaryBeforeMigration}
            userSummaryAfterMigration={userSummaryAfterMigration?.toUserSummaryAfterMigration}
            loading={loading}
          />
        </Box>

        {blockingError !== null && (
          <Warning severity="warning">
            <BlockErrorText blockingError={blockingError} />
          </Warning>
        )}

        {enteringIsolationMode && <IsolationModeWarning severity="warning" />}

        {blockingError === null && (
          <Box
            sx={{
              height: '44px',
              backgroundColor: 'background.surface',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'center',
              mb: 4,
            }}
            data-cy={`migration-risk-checkbox`}
          >
            <FormControlLabel
              sx={{ margin: 0 }}
              control={
                <Checkbox
                  checked={isChecked}
                  onChange={() => setIsChecked(!isChecked)}
                  size="small"
                />
              }
              label={
                <Typography variant="description" sx={{ position: 'relative', top: 1 }}>
                  I fully understand the risks of migrating.
                </Typography>
              }
            />
          </Box>
        )}

        <Box>
          <Button
            onClick={openV3Migration}
            disabled={loading || !isChecked || blockingError !== null}
            sx={{ width: '100%', height: '44px' }}
            variant={!isChecked || blockingError !== null ? 'contained' : 'gradient'}
            size="medium"
            data-cy={`migration-button`}
          >
            Preview tx and migrate
          </Button>
        </Box>
        <Box
          sx={{
            p: downToSM ? '20px 16px' : '20px 30px',
            mt: downToSM ? 4 : 0,
          }}
        >
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, mb: { xs: 4, lg: 6 }, display: 'flex', alignItems: 'center' }}
          >
            <SvgIcon sx={{ fontSize: '24px', color: 'warning.main', mr: 2 }}>
              <ExclamationIcon />
            </SvgIcon>
            Migration risks
          </Typography>
          <Typography sx={{ mb: { xs: 3, lg: 4 } }}>
            Please always be aware of your <b>Health Factor (HF)</b> when partially migrating a
            position and that your rates will be updated to V3 rates.
          </Typography>
          <Typography sx={{ mb: { xs: 3, lg: 4 } }}>
            Migrating multiple collaterals and borrowed assets at the same time can be an expensive
            operation and might fail in certain situations.
            <b>
              Therefore it’s not recommended to migrate positions with more than 5 assets (deposited
              + borrowed) at the same time.
            </b>
          </Typography>
          <Typography sx={{ mb: { xs: 4, lg: 6 } }}>
            Be mindful of the network congestion and gas prices.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
