import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, SvgIcon } from '@mui/material';
import { CheckIcon } from '@heroicons/react/outline';
import { LiquidationPenaltyTooltip } from 'src/components/infoTooltips/LiquidationPenaltyTooltip';
import { LiquidationThresholdTooltip } from 'src/components/infoTooltips/LiquidationThresholdTooltip';
import { MaxLTVTooltip } from 'src/components/infoTooltips/MaxLTVTooltip';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useAppDataContext, ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useAssetCaps } from 'src/hooks/useAssetCaps';
import { DebtCeilingStatus } from 'src/components/caps/DebtCeilingStatus';
import { GENERAL } from 'src/utils/mixPanelEvents';

interface CollateralUsageProps {
  reserve: ComputedReserveData;
}

export const CollateralUsage = ({ reserve }: CollateralUsageProps) => {
  const hasEmode = Number(reserve.eModeCategoryId || 0) !== 0;
  const { debtCeiling } = useAssetCaps();
  const { user } = useAppDataContext();
  const userEmode = Number(user?.userEmodeCategoryId || 0);
  const reserveEmode = Number(reserve.eModeCategoryId || 0);
  const isNoEmodeSelected = userEmode === 0;
  const isEmodeSelectedForReserve = userEmode !== 0 && userEmode === reserveEmode;

  return (
    <Box>

      {reserve.reserveLiquidationThreshold !== '0' && (
        <Box sx={{ mt: 5, mb: 3, px: 4 }}>
          <TableContainer sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
            <Table
              size="small"
              aria-label="Collateral usage KPIs"
              sx={{
                tableLayout: 'fixed',
                '& .MuiTableCell-root': {
                  borderBottom: 'none',
                  px: 2,
                  py: 1.5,
                },
                '& thead .MuiTableCell-root:not(:last-child), & tbody .MuiTableCell-root:not(:last-child)': {
                  borderRight: '1px solid',
                  borderColor: 'rgba(235, 235, 239, 0.7)',
                },
                '& thead .MuiTableRow-root': {
                  borderBottom: '1px solid',
                  borderColor: 'rgba(235, 235, 239, 0.7)',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  {hasEmode && (
                    <TableCell sx={{ width: { xs: '30%', md: '30%' } }}>
                      <Typography variant="description" color="text.secondary">
                        Mode
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell sx={{ width: hasEmode ? { xs: '23.33%', md: '23.33%' } : { xs: '33.33%', md: '33.33%' } }}>
                    <MaxLTVTooltip
                      event={{
                        eventName: GENERAL.TOOL_TIP,
                        eventParams: {
                          tooltip: 'MAX LTV',
                          asset: reserve.underlyingAsset,
                          assetName: reserve.name,
                        },
                      }}
                      variant="description"
                      text={'Max LTV'}
                    />
                  </TableCell>
                  <TableCell sx={{ width: hasEmode ? { xs: '23.33%', md: '23.33%' } : { xs: '33.33%', md: '33.33%' } }}>
                    <LiquidationThresholdTooltip
                      event={{
                        eventName: GENERAL.TOOL_TIP,
                        eventParams: {
                          tooltip: 'Liquidation threshold',
                          asset: reserve.underlyingAsset,
                          assetName: reserve.name,
                        },
                      }}
                      variant="description"
                      text={'Liquidation threshold'}
                    />
                  </TableCell>
                  <TableCell sx={{ width: hasEmode ? { xs: '23.33%', md: '23.33%' } : { xs: '33.33%', md: '33.33%' } }}>
                    <LiquidationPenaltyTooltip
                      event={{
                        eventName: GENERAL.TOOL_TIP,
                        eventParams: {
                          tooltip: 'Liquidation penalty',
                          asset: reserve.underlyingAsset,
                          assetName: reserve.name,
                        },
                      }}
                      variant="description"
                      text={'Liquidation penalty'}
                    />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  {hasEmode && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isNoEmodeSelected ? (
                          <SvgIcon sx={{ color: 'success.main', fontSize: { xs: '20px', xsm: '24px' } }}>
                            <CheckIcon />
                          </SvgIcon>
                        ) : (
                          <Box sx={{ width: { xs: 20, xsm: 24 }, height: { xs: 20, xsm: 24 }, flexShrink: 0 }} />
                        )}
                        <Typography variant="secondary14" color="text.secondary">
                          No MOST Mode
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <FormattedNumber
                      value={reserve.formattedBaseLTVasCollateral}
                      percent
                      variant="secondary14"
                      visibleDecimals={2}
                    />
                  </TableCell>
                  <TableCell>
                    <FormattedNumber
                      value={reserve.formattedReserveLiquidationThreshold}
                      percent
                      variant="secondary14"
                      visibleDecimals={2}
                    />
                  </TableCell>
                  <TableCell>
                    <FormattedNumber
                      value={reserve.formattedReserveLiquidationBonus}
                      percent
                      variant="secondary14"
                      visibleDecimals={2}
                    />
                  </TableCell>
                </TableRow>
                {hasEmode && (
                  <TableRow>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isEmodeSelectedForReserve ? (
                          <SvgIcon sx={{ color: 'success.main', fontSize: { xs: '20px', xsm: '24px' } }}>
                            <CheckIcon />
                          </SvgIcon>
                        ) : (
                          <Box sx={{ width: { xs: 20, xsm: 24 }, height: { xs: 20, xsm: 24 }, flexShrink: 0 }} />
                        )}
                        <Typography variant="secondary14" color="text.secondary">
                          MOST Mode
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <FormattedNumber
                        value={reserve.formattedEModeLtv}
                        percent
                        variant="secondary14"
                        visibleDecimals={2}
                      />
                    </TableCell>
                    <TableCell>
                      <FormattedNumber
                        value={reserve.formattedEModeLiquidationThreshold}
                        percent
                        variant="secondary14"
                        visibleDecimals={2}
                      />
                    </TableCell>
                    <TableCell>
                      <FormattedNumber
                        value={reserve.formattedEModeLiquidationBonus}
                        percent
                        variant="secondary14"
                        visibleDecimals={2}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {reserve.isIsolated && (
            <Box sx={{ mt: 3 }}>
              <DebtCeilingStatus
                debt={reserve.isolationModeTotalDebtUSD}
                ceiling={reserve.debtCeilingUSD}
                usageData={debtCeiling}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};


